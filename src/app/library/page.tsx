import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Public Library (/library) — published comics only, readable with the anon
// key thanks to RLS. Phase 5 adds the featured front-page hero (Pro perk)
// and panorama thumbnails.
export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: comics } = await supabase
    .from('comics')
    .select('id, title, slug, reads, published_at, is_featured')
    .eq('is_published', true)
    .order('reads', { ascending: false })
    .limit(30);

  return (
    <main style={{ padding: '40px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="bangers" style={{ fontSize: 44, letterSpacing: 2, margin: '0 0 22px' }}>
        TRENDING NOW
      </h1>
      {!comics?.length ? (
        <p style={{ color: 'var(--muted-2)' }}>
          Nothing published yet — be the first. (Publishing unlocks on the Creator plan.)
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 16,
          }}
        >
          {comics.map((c) => (
            <Link
              key={c.id}
              href={`/read/${c.slug}`}
              className="hard-card"
              style={{ background: '#fff', padding: 16, textDecoration: 'none', color: 'var(--ink)' }}
            >
              <div className="bangers" style={{ fontSize: 24, letterSpacing: 1 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted-3)', marginTop: 6 }}>
                {c.reads} reads{c.is_featured ? ' · ★ FRONT PAGE' : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
