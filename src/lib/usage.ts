import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TIERS, type Tier, type PaywallReason } from './tiers';

// ============================================================
// Server-side gating. Every gated API route calls these with the
// ADMIN client, reading tier straight from the DB (set only by the
// Stripe webhook). Client-side checks are UX sugar only.
// ============================================================

export interface Profile {
  id: string;
  tier: Tier;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  uploads_used: number;
  exports_used: number;
  publishes_used: number;
  usage_period_start: string; // date
}

export async function getProfile(admin: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, tier, subscription_status, stripe_customer_id, uploads_used, exports_used, publishes_used, usage_period_start')
    .eq('id', userId)
    .single();
  if (error || !data) throw new Error('Profile not found');
  return data as Profile;
}

// Effective tier: a subscription that is canceled/unpaid falls back to free.
// ('past_due' keeps access until Stripe resolves or cancels — adjust if you
// want to be stricter.)
export function effectiveTier(p: Profile): Tier {
  if (p.tier !== 'free' && p.subscription_status === 'canceled') return 'free';
  return p.tier;
}

// Lazy monthly reset (calendar month). If usage_period_start is from a past
// month, zero the monthly counters before evaluating any gate.
export async function lazyResetIfNeeded(admin: SupabaseClient, p: Profile): Promise<Profile> {
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = new Date(p.usage_period_start + 'T00:00:00Z');
  if (periodStart < currentMonthStart) {
    const iso = currentMonthStart.toISOString().slice(0, 10);
    const { error } = await admin
      .from('profiles')
      .update({ exports_used: 0, publishes_used: 0, usage_period_start: iso })
      .eq('id', p.id);
    if (error) throw error;
    return { ...p, exports_used: 0, publishes_used: 0, usage_period_start: iso };
  }
  return p;
}

export type GateResult = { ok: true } | { ok: false; reason: PaywallReason };

// Upload gate. `isReplacement` = the target panel already has a panorama
// (replacing never counts against the cap).
export function gateUpload(p: Profile, isReplacement: boolean): GateResult {
  if (isReplacement) return { ok: true };
  const t = TIERS[effectiveTier(p)];
  if (p.uploads_used >= t.maxUploads) return { ok: false, reason: 'uploads' };
  return { ok: true };
}

export function gateExport(p: Profile): GateResult {
  const t = TIERS[effectiveTier(p)];
  if (t.maxExports <= 0) return { ok: false, reason: 'export-locked' };
  if (p.exports_used >= t.maxExports) return { ok: false, reason: 'export-limit' };
  return { ok: true };
}

export function gatePublish(p: Profile): GateResult {
  const t = TIERS[effectiveTier(p)];
  if (t.maxPublishes <= 0) return { ok: false, reason: 'publish-locked' };
  if (p.publishes_used >= t.maxPublishes) return { ok: false, reason: 'publish-limit' };
  return { ok: true };
}

export async function incrementUsage(
  admin: SupabaseClient,
  p: Profile,
  field: 'uploads_used' | 'exports_used' | 'publishes_used',
) {
  const { error } = await admin
    .from('profiles')
    .update({ [field]: p[field] + 1 })
    .eq('id', p.id);
  if (error) throw error;
}
