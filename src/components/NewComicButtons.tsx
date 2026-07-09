'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDraft } from '@/lib/editor-actions';
import type { LayoutId } from '@/lib/layouts';

// "Start new issue" buttons — mirror the prototype's two entry modes.
export default function NewComicButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start(mode: 'prompts' | 'blank') {
    setBusy(true);
    try {
      // Guided ("prompts") begins on an auto 8-panel page; blank on a clean grid.
      const pages: { layout: LayoutId; count: number }[] =
        mode === 'prompts' ? [{ layout: 'auto', count: 8 }] : [{ layout: 'grid6', count: 6 }];
      const id = await createDraft('Your Issue', pages);
      router.push(`/build/${id}`);
    } catch {
      alert('Could not start a new issue. Are you signed in?');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button className="btn btn-accent" disabled={busy} onClick={() => start('prompts')}>
        + STORY PROMPTS
      </button>
      <button className="btn" disabled={busy} onClick={() => start('blank')}>
        + BLANK PANELS
      </button>
    </div>
  );
}
