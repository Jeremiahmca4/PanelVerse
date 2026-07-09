import Link from 'next/link';

// Gallery (/) — landing + template picker. Hero copy and structure per spec;
// visual polish continues alongside the Phase 2 editor port.
export default function GalleryPage() {
  return (
    <main>
      <section
        className="halftone"
        style={{
          background: 'var(--ink)',
          padding: '96px 24px',
          textAlign: 'center',
        }}
      >
        <h1
          className="bangers"
          style={{
            color: '#fff',
            fontSize: 'clamp(48px, 8vw, 96px)',
            letterSpacing: 3,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          BUILD IT. READ IT.
          <br />
          <span style={{ color: 'var(--yellow)' }}>DIVE INSIDE IT.</span>
        </h1>
        <p style={{ color: 'var(--muted-4)', fontSize: 16, maxWidth: 560, margin: '18px auto 28px' }}>
          Make comics whose panels are 360° panoramas — then step inside every panel and look
          around the scene in 3D.
        </p>
        <Link href="/read/the-penalty" className="btn btn-accent" style={{ fontSize: 14, padding: '13px 26px', textDecoration: 'none' }}>
          TRY THE 3D READER →
        </Link>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 26,
          padding: '48px 24px',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <div className="hard-card" style={{ background: '#fff', padding: 26 }}>
          <h2 className="bangers" style={{ fontSize: 34, letterSpacing: 1.5, margin: '0 0 8px' }}>
            THE PENALTY
          </h2>
          <p style={{ color: 'var(--muted-2)', fontSize: 14, margin: '0 0 18px' }}>
            The built-in demo issue — dive into every panel.
          </p>
          <Link href="/read/the-penalty" className="btn btn-ink" style={{ textDecoration: 'none' }}>
            READ ISSUE #1 IN 3D
          </Link>
        </div>

        <div className="hard-card" style={{ background: '#fff', padding: 26 }}>
          <h2 className="bangers" style={{ fontSize: 34, letterSpacing: 1.5, margin: '0 0 8px' }}>
            YOUR ISSUE
          </h2>
          <p style={{ color: 'var(--muted-2)', fontSize: 14, margin: '0 0 18px' }}>
            Start building your own 360° comic.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/build?start=prompts" className="btn btn-accent" style={{ textDecoration: 'none' }}>
              + STORY PROMPTS
            </Link>
            <Link href="/build?start=blank" className="btn" style={{ textDecoration: 'none' }}>
              + BLANK PANELS
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
