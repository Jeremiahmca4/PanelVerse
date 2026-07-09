'use client';

import { useState } from 'react';
import { TIERS, PAYWALL_COPY, type PaywallReason, type Tier } from '@/lib/tiers';

// The paywall modal. Headline/sub come from the exact reason the server
// returned (402). Plan cards trigger real Stripe Checkout.
export default function PaywallModal({
  reason,
  onClose,
}: {
  reason: PaywallReason;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState<Tier | null>(null);
  const copy = PAYWALL_COPY[reason];

  async function upgrade(tier: Tier) {
    setLoading(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        alert(error ?? 'Could not start checkout. Is Stripe configured?');
        setLoading(null);
      }
    } catch {
      alert('Could not start checkout.');
      setLoading(null);
    }
  }

  const paidTiers: Tier[] = ['basic', 'creator', 'pro'];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="halftone"
        style={{
          background: 'var(--ink)',
          border: '4px solid var(--acc)',
          maxWidth: 860,
          width: '100%',
          padding: '30px 28px',
        }}
      >
        <div className="bangers" style={{ color: 'var(--yellow)', fontSize: 36, letterSpacing: 1.5, lineHeight: 1.05 }}>
          {copy.headline}
        </div>
        <p style={{ color: 'var(--muted-4)', fontSize: 14, margin: '8px 0 22px', maxWidth: 620 }}>{copy.sub}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
          {paidTiers.map((t) => {
            const def = TIERS[t];
            return (
              <div key={t} style={{ background: 'var(--paper)', border: '3px solid var(--ink)', padding: 18 }}>
                <div className="bangers" style={{ fontSize: 26, letterSpacing: 1 }}>{def.name}</div>
                <div style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 12px' }}>
                  {def.price}
                  <span style={{ fontSize: 12, color: 'var(--muted-2)' }}> /mo</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {def.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--muted-1)', lineHeight: 1.4 }}>
                      + {b}
                    </li>
                  ))}
                </ul>
                <button
                  className={t === 'creator' ? 'btn btn-accent' : 'btn btn-ink'}
                  style={{ width: '100%' }}
                  disabled={loading !== null}
                  onClick={() => upgrade(t)}
                >
                  {loading === t ? 'STARTING…' : `CHOOSE ${def.name.toUpperCase()}`}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 18, background: 'none', border: 'none', color: 'var(--muted-4)', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}
        >
          MAYBE LATER
        </button>
      </div>
    </div>
  );
}
