import type { LayoutId, Mood } from './layouts';

// The shape of a comic draft as the editor holds it in React state and as it
// round-trips to Supabase (comics.pages jsonb + panels rows).

export interface PanelData {
  page_index: number;
  slot_index: number;
  panorama_id: string | null;
  signedUrl?: string | null; // resolved at load for private-bucket display
  caption: string;
  dialogue: string;
  sfx: string;
  mood: Mood;
  pos: string; // background-position, e.g. 'center 45%'
}

export interface ComicDraft {
  id: string;
  title: string;
  accent: string;
  pages: { layout: LayoutId; count: number }[];
  panels: PanelData[];
  is_published: boolean;
  slug: string | null;
}

export interface DemoPano {
  key: string;
  label: string;
  url: string; // public path — served from /public/assets
}

// Built-in scene library — the user's own panorama set. Files live in
// public/assets/ so Next.js serves them at /assets/<file>. Filenames match
// the repo exactly.
export const DEMO_PANOS: DemoPano[] = [
  { key: 'arena', label: 'Arena', url: '/assets/pano-arena.png' },
  { key: 'boston', label: 'Boston', url: '/assets/pano-boston.png' },
  { key: 'chair', label: 'Chair', url: '/assets/pano-chair.png' },
  { key: 'chase', label: 'Chase', url: '/assets/pano-chase.png' },
  { key: 'chicago', label: 'Chicago', url: '/assets/pano-chicago.png' },
  { key: 'dynamo', label: 'Dynamo', url: '/assets/pano-dynamo.png' },
  { key: 'emergence', label: 'Emergence', url: '/assets/pano-emergence.png' },
  { key: 'finale', label: 'Finale', url: '/assets/pano-finale.png' },
  { key: 'lab-arena', label: 'Lab Arena', url: '/assets/pano-lab-arena.png' },
  { key: 'lab', label: 'Lab', url: '/assets/pano-lab.png' },
  { key: 'locker', label: 'Locker', url: '/assets/pano-locker.png' },
  { key: 'massacre', label: 'Massacre', url: '/assets/pano-massacre.png' },
  { key: 'miami', label: 'Miami', url: '/assets/pano-miami.png' },
  { key: 'moscow', label: 'Moscow', url: '/assets/pano-moscow.png' },
  { key: 'penaltybox', label: 'Penalty Box', url: '/assets/pano-penaltybox.png' },
  { key: 'rampage', label: 'Rampage', url: '/assets/pano-rampage.png' },
  { key: 'vegas', label: 'Vegas', url: '/assets/pano-vegas.png' },
  { key: 'warehouse', label: 'Warehouse', url: '/assets/pano-warehouse.png' },
];
