import type { Metadata } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const sourceSerif = Source_Serif_4({ variable: '--font-source-serif', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Sellervate QA', template: '%s · Sellervate QA' },
  description: 'Review support replies after they went out.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}>
      <body className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
