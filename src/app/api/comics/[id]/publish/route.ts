import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile, lazyResetIfNeeded, gatePublish, incrementUsage } from '@/lib/usage';
import { makeSlug } from '@/lib/stripe';

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

  // Ownership check
  const { data: comic } = await admin
    .from('comics')
    .select('id, owner_id, title, slug, is_published')
    .eq('id', id)
    .single();
  if (!comic || comic.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Re-publishing an already-published comic (content update) is free;
  // a NEW publish consumes a monthly slot.
  if (!comic.is_published) {
    // ---- THE GATE ----
    const gate = gatePublish(profile);
    if (!gate.ok) {
      return NextResponse.json({ error: 'gated', reason: gate.reason }, { status: 402 });
    }
  }

  const slug = comic.slug ?? makeSlug(comic.title);
  const { error } = await admin
    .from('comics')
    .update({
      is_published: true,
      slug,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!comic.is_published) await incrementUsage(admin, profile, 'publishes_used');

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/read/${slug}`;
  return NextResponse.json({ slug, url });
}
