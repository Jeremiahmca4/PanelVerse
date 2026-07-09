import 'server-only';
import Stripe from 'stripe';

// Lazy-initialized so `next build` doesn't need STRIPE_SECRET_KEY at
// page-data-collection time; constructed on first use at request time.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _stripe;
}

// URL-safe slug: "The Penalty" -> "the-penalty-x7k2p9"
export function makeSlug(title: string): string {
  const base = (title || 'untitled')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'untitled';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
