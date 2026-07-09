'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/build';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function sendLink() {
    if (!email) return;
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <div className="hard-card" style={{ background: '#fff', padding: 32, width: 'min(420px, 92vw)' }}>
      <h1 className="bangers" style={{ fontSize: 40, letterSpacing: 2, margin: '0 0 6px' }}>SIGN IN</h1>
      <p style={{ color: 'var(--muted-2)', fontSize: 13, margin: '0 0 18px' }}>
        We&apos;ll email you a magic link — no password.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendLink()}
        />
        <button className="btn btn-accent" onClick={sendLink} disabled={status === 'sending'}>
          {status === 'sending' ? 'SENDING…' : 'EMAIL ME A LINK →'}
        </button>
        {status === 'sent' && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f8a5b' }}>
            Link sent — check your inbox.
          </div>
        )}
        {status === 'error' && (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)' }}>
            Something went wrong — try again.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 63px)',
        background: 'var(--paper-alt)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
