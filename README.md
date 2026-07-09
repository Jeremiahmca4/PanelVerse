# Panelverse — Next.js + Supabase + Stripe

Comics whose panels are 360° panoramas; readers step inside every panel in 3D.
This repo is the Phase 1 scaffold: routes, design tokens, auth, the full DB
schema/RLS, and **fully implemented server-side gating + Stripe checkout/webhook**.

## Setup

1. **Install:** `npm install`
2. **Supabase:** create a project → run `supabase/migrations/0001_init.sql` in the
   SQL Editor (tables, RLS, billing-column protection, auth trigger, private
   `panoramas` storage bucket + policies, `bump_reads` RPC). In Authentication →
   URL Configuration set Site URL to `http://localhost:3000`.
3. **Env:** copy `.env.example` → `.env.local` and fill in the Supabase URL,
   anon key, and service-role key.
4. **Stripe (test mode):** create 3 products with monthly prices — Basic $2.99,
   Creator $5.00, Professional $10.00 — and put the `price_...` IDs in env.
   During dev run:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   and copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
5. **Demo assets:** copy the handoff bundle's `assets/` into `public/demo/`.
6. `npm run dev`

## Security model (non-negotiable)

- `profiles.tier` is written **only** by the Stripe webhook (service role).
  Column-level grants prevent clients from updating anything but `display_name`.
- Every gated action (`/api/panoramas`, `/api/comics/[id]/export`,
  `/api/comics/[id]/publish`) re-checks the limit **server-side**, reading tier
  + usage from the DB via the service role. Client checks are UX only.
- Monthly counters lazy-reset on a calendar-month boundary inside each gated
  route (`lib/usage.ts`), no cron needed.
- Storage bucket is private; images are served via signed URLs.

## Phase roadmap

1. ✅ Scaffold + schema + gates + Stripe plumbing (this)
2. Editor port (three-column builder, `pageLayouts()` copied exactly, drafts → Supabase)
3. 3D Reader port (WebGL dive @ FOV 480, page/fly/book/cover modes)
4. Paywall modal → live Checkout → webhook tier flip; Customer Portal
5. Library + public reader + reads counter + "The Penalty" seed + Pro front-page
6. Polish: export artifact (self-contained HTML reader), states, mobile
