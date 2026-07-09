import { NextRequest, NextResponse } from 'next/server';
import { imageSize } from 'image-size';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile, lazyResetIfNeeded, gateUpload, incrementUsage } from '@/lib/usage';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25MB per panorama
const RATIO_TOLERANCE = 0.12;       // accept ~2:1 (1.88–2.12)

// POST multipart/form-data: { file: File, panelId?: uuid }
// Gate: Free cap of 4 lifetime uploads. Replacing a panel's existing image
// does NOT count against the cap and does not increment the counter.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const admin = createAdminClient();
  let profile = await getProfile(admin, user.id);
  profile = await lazyResetIfNeeded(admin, profile);

  const form = await req.formData();
  const file = form.get('file');
  const panelId = form.get('panelId');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 });
  }

  // Replacement? Only if the panel belongs to this user AND already has art.
  let isReplacement = false;
  if (typeof panelId === 'string' && panelId) {
    const { data: panel } = await admin
      .from('panels')
      .select('id, panorama_id, comics!inner(owner_id)')
      .eq('id', panelId)
      .single();
    const ownerId = (panel as { comics?: { owner_id?: string } } | null)?.comics?.owner_id;
    if (panel && ownerId === user.id && panel.panorama_id) isReplacement = true;
  }

  // ---- THE GATE (server-side, tier from DB) ----
  const gate = gateUpload(profile, isReplacement);
  if (!gate.ok) {
    return NextResponse.json({ error: 'gated', reason: gate.reason }, { status: 402 });
  }

  // Validate: real image, roughly 2:1 equirectangular
  const buf = Buffer.from(await file.arrayBuffer());
  let dims: { width?: number; height?: number; type?: string };
  try {
    dims = imageSize(buf);
  } catch {
    return NextResponse.json({ error: 'Not a valid image' }, { status: 400 });
  }
  if (!dims.width || !dims.height) {
    return NextResponse.json({ error: 'Could not read image dimensions' }, { status: 400 });
  }
  const ratio = dims.width / dims.height;
  if (Math.abs(ratio - 2) > RATIO_TOLERANCE * 2) {
    return NextResponse.json(
      { error: `Panoramas must be equirectangular (2:1). Yours is ${ratio.toFixed(2)}:1.` },
      { status: 400 },
    );
  }

  // Store at {userId}/{uuid}.{ext} in the private 'panoramas' bucket
  const ext = (dims.type === 'jpg' ? 'jpg' : dims.type) || 'png';
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from('panoramas')
    .upload(path, buf, { contentType: file.type || `image/${ext}` });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: row, error: insErr } = await admin
    .from('panoramas')
    .insert({ owner_id: user.id, storage_path: path, width: dims.width, height: dims.height })
    .select('id, storage_path, width, height')
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Attach to the panel if one was specified (replacement or first art)
  if (typeof panelId === 'string' && panelId) {
    await admin.from('panels').update({ panorama_id: row.id }).eq('id', panelId);
  }

  if (!isReplacement) await incrementUsage(admin, profile, 'uploads_used');

  // Signed URL so the editor can show it immediately (private bucket)
  const { data: signed } = await admin.storage.from('panoramas').createSignedUrl(path, 60 * 60);

  return NextResponse.json({
    panorama: row,
    signedUrl: signed?.signedUrl ?? null,
    uploadsUsed: profile.uploads_used + (isReplacement ? 0 : 1),
  });
}
