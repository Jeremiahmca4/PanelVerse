'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ComicDraft, PanelData } from '@/lib/editor-types';
import type { LayoutId } from '@/lib/layouts';

// All actions here are owner-scoped: they run under the signed-in user via RLS,
// except signed-URL minting which needs the admin client (private bucket).

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return { supabase, user };
}

// Create a fresh draft and return its id.
export async function createDraft(
  title: string,
  pages: { layout: LayoutId; count: number }[],
): Promise<string> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('comics')
    .insert({ owner_id: user.id, title: title || 'Your Issue', pages })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create draft');
  return data.id as string;
}

// Load a draft the user owns, resolving signed URLs for any attached panoramas.
export async function loadDraft(comicId: string): Promise<ComicDraft | null> {
  const { supabase, user } = await requireUser();

  const { data: comic } = await supabase
    .from('comics')
    .select('id, title, accent, pages, is_published, slug, owner_id')
    .eq('id', comicId)
    .single();
  if (!comic || comic.owner_id !== user.id) return null;

  const { data: panelRows } = await supabase
    .from('panels')
    .select('page_index, slot_index, panorama_id, caption, dialogue, sfx, mood, pos')
    .eq('comic_id', comicId)
    .order('page_index')
    .order('slot_index');

  // Resolve signed URLs for attached panoramas (private bucket → admin client)
  const panels: PanelData[] = [];
  const admin = createAdminClient();
  for (const p of panelRows ?? []) {
    let signedUrl: string | null = null;
    if (p.panorama_id) {
      const { data: pano } = await admin
        .from('panoramas')
        .select('storage_path')
        .eq('id', p.panorama_id)
        .single();
      if (pano?.storage_path) {
        const { data: s } = await admin.storage
          .from('panoramas')
          .createSignedUrl(pano.storage_path, 60 * 60);
        signedUrl = s?.signedUrl ?? null;
      }
    }
    panels.push({
      page_index: p.page_index,
      slot_index: p.slot_index,
      panorama_id: p.panorama_id,
      signedUrl,
      caption: p.caption ?? '',
      dialogue: p.dialogue ?? '',
      sfx: p.sfx ?? '',
      mood: (p.mood as PanelData['mood']) ?? 'day',
      pos: p.pos ?? 'center',
    });
  }

  return {
    id: comic.id,
    title: comic.title,
    accent: comic.accent ?? '#ff2e4d',
    pages: (comic.pages as ComicDraft['pages']) ?? [{ layout: 'auto', count: 8 }],
    panels,
    is_published: comic.is_published,
    slug: comic.slug,
  };
}

// Save the whole draft: comic meta + pages jsonb, and replace panel rows.
// Panel text/layout is owner-writable via RLS; panorama attachment happens
// through the gated /api/panoramas route (uploads) or attachDemoPano (demos).
export async function saveDraft(draft: {
  id: string;
  title: string;
  accent: string;
  pages: { layout: LayoutId; count: number }[];
  panels: Omit<PanelData, 'signedUrl'>[];
}): Promise<{ ok: true }> {
  const { supabase, user } = await requireUser();

  // Ownership check
  const { data: comic } = await supabase
    .from('comics')
    .select('id, owner_id')
    .eq('id', draft.id)
    .single();
  if (!comic || comic.owner_id !== user.id) throw new Error('Not found');

  await supabase
    .from('comics')
    .update({
      title: draft.title,
      accent: draft.accent,
      pages: draft.pages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draft.id);

  // Replace-all panel rows (simplest correct sync for a small panel set)
  await supabase.from('panels').delete().eq('comic_id', draft.id);
  if (draft.panels.length) {
    const rows = draft.panels.map((p) => ({
      comic_id: draft.id,
      page_index: p.page_index,
      slot_index: p.slot_index,
      panorama_id: p.panorama_id,
      caption: p.caption || null,
      dialogue: p.dialogue || null,
      sfx: p.sfx || null,
      mood: p.mood,
      pos: p.pos,
    }));
    const { error } = await supabase.from('panels').insert(rows);
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}

// List the user's drafts for the /build landing.
export async function listDrafts() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('comics')
    .select('id, title, is_published, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  return data ?? [];
}
