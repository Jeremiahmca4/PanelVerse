import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { priceIdForTier, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

// POST { tier: 'basic' | 'creator' | 'pro' } -> { url }
// Note: the client only *asks* for a tier here. The tier is never trusted from
// the client for gating — it becomes real only when the webhook confirms payment.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { tier } = (await req.json().catch(() => ({}))) as { tier?: Tier };
  const priceId = tier ? priceIdForTier(tier) : null;
  if (!priceId) return NextResponse.json({ error: 'Unknown tier' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, display_name')
    .eq('id', user.id)
    .single();

  // Create the Stripe customer on first purchase
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/build?checkout=success`,
    cancel_url: `${appUrl}/build?checkout=cancel`,
    metadata: { supabase_user_id: user.id },
    subscription_data: { metadata: { supabase_user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
