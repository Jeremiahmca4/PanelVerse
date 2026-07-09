'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Persistent top bar (all screens) — sticky ink background, 4px accent bottom
// border. Wordmark: "PANEL" white + "VERSE" accent. Right: tier badge,
// UPGRADE (free tier only), divider, nav.
export default function TopBar({
  tierName,
  isFree,
  signedIn,
}: {
  tierName: string;
  isFree: boolean;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--ink)',
        borderBottom: '4px solid var(--acc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 22px',
        gap: 16,
      }}
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span
          className="bangers"
          style={{ fontSize: 30, letterSpacing: 2, color: '#fff', whiteSpace: 'nowrap' }}
        >
          PANEL<span style={{ color: 'var(--acc)' }}>VERSE</span>
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: 'var(--muted-4)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {tierName} PLAN
        </span>

        {isFree && (
          <Link href="/build?paywall=general" className="btn btn-yellow" style={{ textDecoration: 'none' }}>
            UPGRADE
          </Link>
        )}

        <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,.25)' }} />

        <nav style={{ display: 'flex', gap: 8 }}>
          <Link href="/" className={`nav-btn ${active('/') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            Templates
          </Link>
          <Link href="/build" className={`nav-btn ${active('/build') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            Build
          </Link>
          <Link href="/read/the-penalty" className={`nav-btn ${active('/read') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            Read in 3D
          </Link>
          <Link href="/library" className={`nav-btn ${active('/library') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            Library
          </Link>
          {!signedIn && (
            <Link href="/login" className="nav-btn" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
