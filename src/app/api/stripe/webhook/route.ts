import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { tierFromPriceId } from '@/lib/tiers';

export const runtime = 'nodejs';

// THE single source of truth for `profiles.tier`. Nothing else writes it.
// Dev: stripe listen --forward-to localhost:3000/api/stripe/webhook
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  async function syncFromSubscription(sub: Stripe.Subscription) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const priceId = sub.items.data[0]?.price?.id ?? '';
    const tier = tierFromPriceId(priceId);
    const status = sub.status; // active | past_due | canceled | unpaid | trialing | ...
    const item = sub.items.data[0];
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;

    const active = status === 'active' || status === 'trialing' || status === 'past_due';
    const update = {
      stripe_subscription_id: sub.id,
      tier: active && tier ? tier : 'free',
      subscription_status: status,
      current_period_end: periodEnd,
    };

    const { error } = await admin
      .from('profiles')
      .update(update)
      .eq('stripe_customer_id', customerId);
    if (error) console.error('Profile sync failed:', error);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncFromSubscription(sub);
      }
      break;
    }
    case 'customer.subscription.updated': {
      await syncFromSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const { error } = await admin
        .from('profiles')
        .update({
          tier: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId);
      if (error) console.error('Profile downgrade failed:', error);
      break;
    }
    default:
      break; // ignore everything else
  }

  return NextResponse.json({ received: true });
}
