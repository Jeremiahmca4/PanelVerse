import type { Metadata } from 'next';
import { Bangers, Space_Grotesk } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { TIERS, type Tier } from '@/lib/tiers';
import TopBar from '@/components/TopBar';
import './globals.css';

const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' });
const grotesk = Space_Grotesk({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-grotesk' });

export const metadata: Metadata = {
  title: 'Panelverse — Build it. Read it. Dive inside it.',
  description: 'Make comics whose panels are 360° panoramas — and step inside every panel in 3D.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tier: Tier = 'free';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();
    if (profile?.tier) tier = profile.tier as Tier;
  }

  return (
    <html lang="en" className={`${bangers.variable} ${grotesk.variable}`}>
      <body>
        <TopBar tierName={TIERS[tier].name} isFree={tier === 'free'} signedIn={!!user} />
        {children}
      </body>
    </html>
  );
}
