import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { loadDraft } from '@/lib/editor-actions';
import Editor from '@/components/Editor';

// /build/[id] — the editor for one draft.
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/build/${id}`);

  const draft = await loadDraft(id);
  if (!draft) notFound();

  return <Editor initial={draft} />;
}
