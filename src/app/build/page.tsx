import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { listDrafts } from '@/lib/editor-actions';
import NewComicButtons from '@/components/NewComicButtons';
import Link from 'next/link';

// /build — drafts landing. Lists the user's comics and starts new ones.
export default async function BuildLanding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/build');

  const drafts = await listDrafts();

  return (
    <main style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <h1 className="bangers" style={{ fontSize: 46, letterSpacing: 2, margin: '0 0 6px' }}>YOUR STUDIO</h1>
      <p style={{ color: 'var(--muted-2)', marginBottom: 24 }}>Start a new issue or keep building an existing one.</p>

      <NewComicButtons />

      <h2 className="bangers" style={{ fontSize: 28, letterSpacing: 1.5, margin: '34px 0 14px' }}>YOUR ISSUES</h2>
      {!drafts.length ? (
        <p style={{ color: 'var(--muted-3)' }}>No issues yet — start one above.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
          {drafts.map((d) => (
            <Link key={d.id} href={`/build/${d.id}`} className="hard-card" style={{ background: '#fff', padding: 16, textDecoration: 'none', color: 'var(--ink)' }}>
              <div className="bangers" style={{ fontSize: 24, letterSpacing: 1 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-3)', marginTop: 6, fontWeight: 700, letterSpacing: 1 }}>
                {d.is_published ? 'PUBLISHED' : 'DRAFT'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
