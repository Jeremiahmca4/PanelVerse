'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  layoutFor,
  slotCount,
  LAYOUT_LABELS,
  MOODS,
  MOOD_COLORS,
  CUSTOM_PROMPTS,
  type LayoutId,
  type Mood,
} from '@/lib/layouts';
import { DEMO_PANOS, type ComicDraft, type PanelData } from '@/lib/editor-types';
import { saveDraft } from '@/lib/editor-actions';
import PaywallModal from '@/components/PaywallModal';
import type { PaywallReason } from '@/lib/tiers';

const PAGE_W = 680;

// Ensure every slot on every page has a PanelData row (fills gaps as layouts grow).
function normalizePanels(
  pages: { layout: LayoutId; count: number }[],
  existing: PanelData[],
): PanelData[] {
  const byKey = new Map(existing.map((p) => [`${p.page_index}:${p.slot_index}`, p]));
  const out: PanelData[] = [];
  pages.forEach((pg, pageIndex) => {
    const n = slotCount(pg);
    for (let slot = 0; slot < n; slot++) {
      const key = `${pageIndex}:${slot}`;
      out.push(
        byKey.get(key) ?? {
          page_index: pageIndex,
          slot_index: slot,
          panorama_id: null,
          signedUrl: null,
          caption: '',
          dialogue: '',
          sfx: '',
          mood: 'day',
          pos: 'center 45%',
        },
      );
    }
  });
  return out;
}

export default function Editor({ initial }: { initial: ComicDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [accent, setAccent] = useState(initial.accent);
  const [pages, setPages] = useState(initial.pages);
  const [panels, setPanels] = useState<PanelData[]>(() => normalizePanels(initial.pages, initial.panels));
  const [curPage, setCurPage] = useState(0);
  const [curSlot, setCurSlot] = useState(0);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep panels in sync when pages/layout change
  useEffect(() => {
    setPanels((prev) => normalizePanels(pages, prev));
  }, [pages]);

  const pageDef = pages[curPage] ?? pages[0];
  const layout = layoutFor(pageDef);
  const pagePanels = useMemo(
    () => panels.filter((p) => p.page_index === curPage).sort((a, b) => a.slot_index - b.slot_index),
    [panels, curPage],
  );
  const current =
    pagePanels.find((p) => p.slot_index === curSlot) ?? pagePanels[0] ?? null;

  // ---- debounced autosave ----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = useCallback(() => {
    setSaving('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveDraft({
          id: initial.id,
          title,
          accent,
          pages,
          panels: panels.map(({ signedUrl: _omit, ...rest }) => rest),
        });
        setSaving('saved');
        setTimeout(() => setSaving('idle'), 1200);
      } catch {
        setSaving('idle');
      }
    }, 700);
  }, [initial.id, title, accent, pages, panels]);

  useEffect(() => {
    queueSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, accent, pages, panels]);

  function updateCurrent(patch: Partial<PanelData>) {
    if (!current) return;
    setPanels((prev) =>
      prev.map((p) =>
        p.page_index === current.page_index && p.slot_index === current.slot_index
          ? { ...p, ...patch }
          : p,
      ),
    );
  }

  function setLayout(id: LayoutId) {
    setPages((prev) => {
      const next = prev.slice();
      next[curPage] = { ...next[curPage], layout: id };
      return next;
    });
    setCurSlot(0);
  }

  function addPage() {
    setPages((prev) => [...prev, { layout: 'grid6', count: 6 }]);
    setCurPage(pages.length);
    setCurSlot(0);
  }

  function attachDemo(url: string) {
    // Demo panos are public files → no upload gate, no counter. Store as a
    // pseudo panorama_id sentinel the reader/exporter understands ("demo:url").
    updateCurrent({ panorama_id: `demo:${url}`, signedUrl: url });
  }

  async function onUpload(file: File) {
    if (!current) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Only send panelId for replacement accounting once panels have real
      // DB ids; in this draft model we gate on the raw upload cap instead.
      const res = await fetch('/api/panoramas', { method: 'POST', body: fd });
      if (res.status === 402) {
        const { reason } = await res.json();
        setPaywall((reason as PaywallReason) ?? 'uploads');
        return;
      }
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Upload failed' }));
        alert(error);
        return;
      }
      const { panorama, signedUrl } = await res.json();
      updateCurrent({ panorama_id: panorama.id, signedUrl });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onPublish() {
    setBusy(true);
    try {
      // Save first so the published version is current
      await saveDraft({
        id: initial.id,
        title,
        accent,
        pages,
        panels: panels.map(({ signedUrl: _o, ...rest }) => rest),
      });
      const res = await fetch(`/api/comics/${initial.id}/publish`, { method: 'POST' });
      if (res.status === 402) {
        const { reason } = await res.json();
        setPaywall((reason as PaywallReason) ?? 'publish-locked');
        return;
      }
      if (!res.ok) {
        alert('Publish failed');
        return;
      }
      const { url } = await res.json();
      router.push(url.replace(/^https?:\/\/[^/]+/, '')); // go to /read/[slug]
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    setBusy(true);
    try {
      const res = await fetch(`/api/comics/${initial.id}/export`, { method: 'POST' });
      if (res.status === 402) {
        const { reason } = await res.json();
        setPaywall((reason as PaywallReason) ?? 'export-locked');
        return;
      }
      if (res.ok) alert('Export queued — artifact download lands in a later phase.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 320px', minHeight: 'calc(100vh - 63px)' }}>
      {/* ============ LEFT: panel rail ============ */}
      <aside style={{ background: 'var(--ink)', padding: '14px 10px', overflowY: 'auto' }}>
        <div style={{ color: 'var(--muted-4)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
          PAGE {curPage + 1} / {pages.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pagePanels.map((p, i) => {
            const on = p.slot_index === curSlot;
            return (
              <button
                key={p.slot_index}
                onClick={() => setCurSlot(p.slot_index)}
                style={{
                  position: 'relative',
                  width: 118,
                  height: 148,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  padding: 0,
                  border: `3px solid ${on ? 'var(--yellow)' : 'rgba(255,255,255,.25)'}`,
                  boxShadow: on ? '0 0 0 2px var(--yellow)' : 'none',
                  background: p.signedUrl ? '#000' : '#fff',
                }}
                title={`Panel ${i + 1}`}
              >
                {p.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.signedUrl}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'repeating-linear-gradient(45deg, rgba(16,16,24,.06) 0 14px, transparent 14px 28px)',
                    }}
                  />
                )}
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'var(--ink)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                  }}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={addPage}
          className="btn"
          style={{ marginTop: 14, width: 118, background: 'var(--yellow)' }}
        >
          + PAGE
        </button>
      </aside>

      {/* ============ CENTER: live page canvas ============ */}
      <main style={{ background: 'var(--paper-alt)', overflow: 'auto', padding: '28px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bangers"
            style={{
              fontSize: 34,
              letterSpacing: 1.5,
              border: 'none',
              background: 'transparent',
              width: PAGE_W,
              marginBottom: 12,
              padding: 0,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: PAGE_W,
              background: 'var(--paper)',
              padding: 14,
              border: '4px solid var(--ink)',
              boxShadow: '12px 12px 0 rgba(16,16,24,.85)',
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gridTemplateRows: layout.rows,
              gap: 10,
            }}
          >
            {pagePanels.map((p, i) => {
              const on = p.slot_index === curSlot;
              const area = layout.areas[p.slot_index];
              return (
                <div
                  key={p.slot_index}
                  onClick={() => setCurSlot(p.slot_index)}
                  style={{
                    position: 'relative',
                    gridArea: area,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '3px solid var(--ink)',
                    background: '#fff',
                    boxShadow: on ? '0 0 0 4px var(--yellow)' : 'none',
                    zIndex: on ? 4 : 1,
                  }}
                >
                  {p.signedUrl ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url("${p.signedUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: p.pos,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'repeating-linear-gradient(45deg, rgba(16,16,24,.06) 0 14px, transparent 14px 28px)',
                      }}
                    />
                  )}
                  {p.caption?.trim() && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        maxWidth: '75%',
                        background: 'var(--yellow)',
                        border: '2px solid var(--ink)',
                        padding: '4px 9px',
                        fontWeight: 700,
                        fontSize: 10.5,
                        lineHeight: 1.3,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        color: 'var(--ink)',
                        boxShadow: '2px 2px 0 rgba(16,16,24,.7)',
                      }}
                    >
                      {p.caption}
                    </div>
                  )}
                  {p.sfx?.trim() && (
                    <div
                      className="bangers"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 10,
                        fontSize: 26,
                        color: accent,
                        WebkitTextStroke: '1.5px var(--ink)',
                        transform: 'rotate(-6deg)',
                      }}
                    >
                      {p.sfx}
                    </div>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      background: 'rgba(16,16,24,.75)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ============ RIGHT: build controls ============ */}
      <aside style={{ background: '#fff', borderLeft: '3px solid var(--ink)', padding: 18, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="bangers" style={{ fontSize: 22, letterSpacing: 1 }}>BUILD</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: saving === 'saved' ? '#1f8a5b' : 'var(--muted-3)' }}>
            {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>

        {/* Layout picker */}
        <Section label="PAGE LAYOUT">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {(['auto', 'mixA', 'grid6', 'mixB'] as LayoutId[]).map((id) => {
              const on = (pageDef.layout || 'auto') === id;
              return (
                <button
                  key={id}
                  onClick={() => setLayout(id)}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid var(--ink)',
                    background: on ? 'var(--ink)' : '#fff',
                    color: on ? '#fff' : 'var(--ink)',
                    boxShadow: on ? '0 0 0 3px var(--yellow)' : 'none',
                    padding: '6px 2px',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {LAYOUT_LABELS[id]}
                </button>
              );
            })}
          </div>
        </Section>

        {current ? (
          <>
            {/* Panorama source: upload OR demo */}
            <Section label={`PANEL ${(current.slot_index ?? 0) + 1} · SCENE`}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
              <button
                className="btn btn-ink"
                style={{ width: '100%', marginBottom: 8 }}
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? 'WORKING…' : '↑ UPLOAD 360° IMAGE'}
              </button>
              <div style={{ fontSize: 10, color: 'var(--muted-3)', marginBottom: 6, letterSpacing: 0.5 }}>
                OR PICK A SCENE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, maxHeight: 200, overflowY: 'auto', paddingRight: 2 }}>
                {DEMO_PANOS.map((d) => {
                  const on = current.panorama_id === `demo:${d.url}`;
                  return (
                    <button
                      key={d.key}
                      onClick={() => attachDemo(d.url)}
                      title={d.label}
                      style={{
                        height: 46,
                        cursor: 'pointer',
                        border: `2px solid ${on ? 'var(--acc)' : 'var(--ink)'}`,
                        boxShadow: on ? '0 0 0 2px var(--yellow)' : 'none',
                        backgroundImage: `url("${d.url}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    />
                  );
                })}
              </div>
            </Section>

            {/* Caption / dialogue / sfx */}
            <Section label="CAPTION">
              <textarea
                value={current.caption}
                onChange={(e) => updateCurrent({ caption: e.target.value })}
                placeholder={CUSTOM_PROMPTS[Math.min(curSlot, CUSTOM_PROMPTS.length - 1)]}
                rows={2}
                style={taStyle}
              />
            </Section>
            <Section label="DIALOGUE">
              <textarea
                value={current.dialogue}
                onChange={(e) => updateCurrent({ dialogue: e.target.value })}
                placeholder='CHARACTER: "Line…"'
                rows={2}
                style={taStyle}
              />
            </Section>
            <Section label="SFX">
              <input
                type="text"
                value={current.sfx}
                onChange={(e) => updateCurrent({ sfx: e.target.value })}
                placeholder="KRAKOOM!"
                style={{ width: '100%' }}
              />
            </Section>

            {/* Mood */}
            <Section label="MOOD">
              <div style={{ display: 'flex', gap: 10 }}>
                {MOODS.map((m: Mood) => {
                  const on = current.mood === m;
                  return (
                    <button
                      key={m}
                      onClick={() => updateCurrent({ mood: m })}
                      title={m.toUpperCase()}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: MOOD_COLORS[m],
                        border: `3px solid ${on ? 'var(--ink)' : '#d8d4c8'}`,
                        boxShadow: on ? '0 0 0 3px var(--yellow)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </Section>
          </>
        ) : null}

        {/* Publish / export */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-accent" style={{ width: '100%' }} disabled={busy} onClick={onPublish}>
            PUBLISH ISSUE
          </button>
          <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={onExport}>
            EXPORT
          </button>
        </div>
      </aside>

      {paywall && <PaywallModal reason={paywall} onClose={() => setPaywall(null)} />}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--muted-2)', marginBottom: 7 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const taStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-grotesk), sans-serif',
  border: '2px solid var(--ink)',
  background: 'var(--paper)',
  padding: '8px 10px',
  fontSize: 13,
  resize: 'vertical',
};
