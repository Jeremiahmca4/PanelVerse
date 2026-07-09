// ============================================================
// Page layout system — ported verbatim from the prototype
// (Panelverse.dc.html: customLayout() + pageLayouts()).
// Each layout maps a panel slot to a CSS grid-area string on a 6-column grid.
// ============================================================

export type LayoutId = 'auto' | 'mixA' | 'grid6' | 'mixB';

export interface Layout {
  rows: string;
  areas: string[];
}

// "auto" layouts, keyed by panel count (1–12). Copied exactly.
const AUTO: Record<number, Layout> = {
  1: { rows: '540px', areas: ['1 / 1 / 2 / 7'] },
  2: { rows: '265px 265px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 7'] },
  3: { rows: '255px 255px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7'] },
  4: { rows: '170px 190px 170px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 7'] },
  5: { rows: '165px 180px 180px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 4', '3 / 4 / 4 / 7'] },
  6: { rows: '165px 180px 180px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7'] },
  7: { rows: '130px 155px 150px 135px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 7'] },
  8: { rows: '128px 200px 152px 190px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 4', '4 / 4 / 5 / 7'] },
  9: { rows: '110px 145px 135px 145px 110px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 4', '4 / 4 / 5 / 7', '5 / 1 / 6 / 7'] },
  10: { rows: '110px 140px 130px 130px 120px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 3', '4 / 3 / 5 / 5', '4 / 5 / 5 / 7', '5 / 1 / 6 / 7'] },
  11: { rows: '110px 140px 130px 130px 120px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 3', '4 / 3 / 5 / 5', '4 / 5 / 5 / 7', '5 / 1 / 6 / 4', '5 / 4 / 6 / 7'] },
  12: { rows: '105px 130px 130px 130px 115px', areas: ['1 / 1 / 2 / 7', '2 / 1 / 3 / 3', '2 / 3 / 3 / 5', '2 / 5 / 3 / 7', '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7', '4 / 1 / 5 / 3', '4 / 3 / 5 / 5', '4 / 5 / 5 / 7', '5 / 1 / 6 / 4', '5 / 4 / 6 / 7'] },
};

// Named page layouts (fixed panel counts). Copied exactly.
export const NAMED_LAYOUTS: Record<Exclude<LayoutId, 'auto'>, { name: string } & Layout> = {
  mixA: { name: 'FEATURE', rows: '175px 175px 160px', areas: ['1 / 1 / 2 / 5', '1 / 5 / 2 / 7', '2 / 1 / 3 / 3', '2 / 3 / 3 / 7', '3 / 1 / 4 / 7'] },
  grid6: { name: 'GRID', rows: '170px 170px 170px', areas: ['1 / 1 / 2 / 4', '1 / 4 / 2 / 7', '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '3 / 1 / 4 / 4', '3 / 4 / 4 / 7'] },
  mixB: { name: 'SPREAD', rows: '160px 175px 175px', areas: ['1 / 1 / 2 / 5', '1 / 5 / 2 / 7', '2 / 1 / 3 / 7', '3 / 1 / 4 / 4', '3 / 4 / 4 / 7'] },
};

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  auto: 'AUTO',
  mixA: 'FEATURE',
  grid6: 'GRID',
  mixB: 'SPREAD',
};

export function customLayout(n: number): Layout {
  return AUTO[Math.max(1, Math.min(12, n || 8))];
}

export interface PageDef {
  layout: LayoutId;
  count: number;
}

export function layoutFor(pg: PageDef): Layout {
  if (!pg || !pg.layout || pg.layout === 'auto') return customLayout(pg ? pg.count : 8);
  const l = NAMED_LAYOUTS[pg.layout];
  return l ? { rows: l.rows, areas: l.areas } : customLayout(pg.count || 8);
}

// How many slots a page has under its current layout.
export function slotCount(pg: PageDef): number {
  return layoutFor(pg).areas.length;
}

export const MOODS = ['day', 'dusk', 'night'] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_COLORS: Record<Mood, string> = {
  day: '#8fd3ff',
  dusk: '#ff5f6d',
  night: '#1d2a6b',
};

// Story-beat prompt captions for "guided" custom pages (from customPrompts()).
export const CUSTOM_PROMPTS = [
  'YOUR OPENING SHOT. SET THE SCENE.',
  'INTRODUCE YOUR HERO.',
  'SOMETHING IS WRONG.',
  'RAISE THE STAKES.',
  'THE TURN.',
  'NO WAY BACK.',
  'THE CONFRONTATION.',
  'THE CLIFFHANGER.',
  'THE AFTERMATH.',
  'A NEW THREAT.',
  'THE PROMISE.',
  'TO BE CONTINUED…',
];
