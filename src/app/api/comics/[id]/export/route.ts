import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile, lazyResetIfNeeded, gateExport, incrementUsage } from '@/lib/usage';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const admin = createAdminClient();
  let profile = await getProfile(admin, user.id);
  profile = await lazyResetIfNeeded(admin, profile);

  const { data: comic } = await admin
    .from('comics')
    .select('id, owner_id, title')
    .eq('id', id)
    .single();
  if (!comic || comic.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ---- THE GATE ----
  const gate = gateExport(profile);
  if (!gate.ok) {
    return NextResponse.json({ error: 'gated', reason: gate.reason }, { status: 402 });
  }

  // TODO (Phase 6): build the export artifact — a self-contained HTML file
  // with the read-only 3D reader + this comic's panels baked in
  // ("Readable in any browser · 3D panel dive included").
  // The gate + counter are live now so the paywall behavior is real.
  await incrementUsage(admin, profile, 'exports_used');

  return NextResponse.json({
    ok: true,
    exportsUsed: profile.exports_used + 1,
    note: 'Export artifact generation lands in Phase 6; the gate is enforced.',
  });
}
