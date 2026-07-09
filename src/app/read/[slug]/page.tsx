import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// Reader (/read/[slug]) — Phase 3 ports the WebGL 360 dive + page/fly/book/
// cover modes from the prototype. This stub resolves the comic, proves the
// public-read RLS path, and bumps the reads counter.
export default async function ReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Built-in demo issue — becomes seed data in Phase 5.
  if (slug === 'the-penalty') {
    return (
      <main
        style={{
          minHeight: 'calc(100vh - 63px)',
          background: 'var(--ink)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          className="bangers halftone"
          style={{ color: 'var(--yellow)', fontSize: 36, letterSpacing: 2, textAlign: 'center', padding: 40 }}
        >
          THE PENALTY — 3D READER LANDS IN PHASE 3
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: comic } = await supabase
    .from('comics')
    .select('id, title, pages, reads')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  if (!comic) notFound();

  // Count the read (security-definer RPC; works for anonymous readers too)
  await supabase.rpc('bump_reads', { comic_slug: slug });

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 63px)',
        background: 'var(--ink)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div className="bangers" style={{ color: '#fff', fontSize: 36, letterSpacing: 2, textAlign: 'center', padding: 24 }}>
        {comic.title.toUpperCase()} — READER COMING IN PHASE 3
      </div>
    </main>
  );
}
