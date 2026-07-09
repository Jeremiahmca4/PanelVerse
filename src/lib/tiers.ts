// Single source of truth for tiers, limits, and paywall copy.
// Server gates import from here; the client uses it for UX-only checks + plan cards.

export type Tier = 'free' | 'basic' | 'creator' | 'pro';

export interface TierDef {
  name: string;
  price: string;            // display only — real price lives in Stripe
  maxUploads: number;       // lifetime distinct uploads; Infinity = unlimited
  maxExports: number;       // per calendar month; 0 = locked; Infinity = unlimited
  maxPublishes: number;     // per calendar month; 0 = locked
  frontPage: boolean;       // eligible for library front-page feature
  bullets: string[];        // plan-card copy (verbatim from spec)
}

export const TIERS: Record<Tier, TierDef> = {
  free: {
    name: 'Free',
    price: '$0',
    maxUploads: 4,
    maxExports: 0,
    maxPublishes: 0,
    frontPage: false,
    bullets: [],
  },
  basic: {
    name: 'Basic',
    price: '$2.99',
    maxUploads: Infinity,
    maxExports: 1,
    maxPublishes: 0,
    frontPage: false,
    bullets: [
      'Unlimited photo uploads',
      '1 comic export per month',
      'Not eligible for public library publishing',
    ],
  },
  creator: {
    name: 'Creator',
    price: '$5.00',
    maxUploads: Infinity,
    maxExports: Infinity,
    maxPublishes: 5,
    frontPage: false,
    bullets: [
      'Unlimited photo uploads',
      'Unlimited exports',
      'Publish up to 5 comics / month',
    ],
  },
  pro: {
    name: 'Professional',
    price: '$10.00',
    maxUploads: Infinity,
    maxExports: Infinity,
    maxPublishes: 7,
    frontPage: true,
    bullets: [
      'Unlimited uploads & exports',
      'Publish up to 7 comics / month',
      'Eligible for front-page features',
    ],
  },
};

export type PaywallReason =
  | 'uploads'
  | 'publish-locked'
  | 'publish-limit'
  | 'export-locked'
  | 'export-limit'
  | 'general';

export const PAYWALL_COPY: Record<PaywallReason, { headline: string; sub: string }> = {
  'uploads': {
    headline: "YOU'VE HIT YOUR FREE UPLOAD LIMIT",
    sub: 'Free accounts get 4 uploaded 360° scenes. Upgrade to Basic for unlimited photo uploads.',
  },
  'publish-locked': {
    headline: 'PUBLISHING IS A PAID FEATURE',
    sub: 'Free accounts can build and preview comics, but not publish them for others to read. Upgrade to publish.',
  },
  'publish-limit': {
    headline: "YOU'VE USED THIS MONTH'S PUBLISHES",
    sub: "You're out of publishes for this month. Upgrade for more monthly publishes.",
  },
  'export-locked': {
    headline: 'EXPORTING IS A PAID FEATURE',
    sub: "Free accounts can't export finished comics. Upgrade to export yours.",
  },
  'export-limit': {
    headline: "YOU'VE HIT THIS MONTH'S EXPORT LIMIT",
    sub: "You're out of exports for this month. Upgrade for more.",
  },
  'general': {
    headline: 'UPGRADE YOUR PLAN',
    sub: 'Pick the plan that fits how much you create.',
  },
};

// price_id → tier mapping for the Stripe webhook
export function tierFromPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_BASIC) return 'basic';
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return 'creator';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return null;
}

export function priceIdForTier(tier: Tier): string | null {
  switch (tier) {
    case 'basic': return process.env.STRIPE_PRICE_BASIC ?? null;
    case 'creator': return process.env.STRIPE_PRICE_CREATOR ?? null;
    case 'pro': return process.env.STRIPE_PRICE_PRO ?? null;
    default: return null;
  }
}
