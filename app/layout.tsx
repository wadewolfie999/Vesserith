import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { publicationPath } from '@/lib/publication-path';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const runtimeEnvironment = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;
const metadataBase = new URL(
  runtimeEnvironment?.VESSERITH_PUBLIC_ORIGIN ?? 'http://localhost:3000',
);
const socialImagePath = publicationPath('/og-evidence.png');

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'Vesserith — Three projects, one evidence view',
    template: '%s · Vesserith',
  },
  description:
    'The public GitHub Pages evidence dashboard for Vesserith, Mynyra, and Hova.',
  openGraph: {
    title: 'Vesserith — Three projects, one evidence view',
    description:
      'A commit-bound view of reviewed source, observed operation, and unresolved evidence.',
    type: 'website',
    images: [
      {
        url: socialImagePath,
        width: 1200,
        height: 630,
        alt: 'Vesserith — Three projects. One evidence view.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vesserith — Three projects, one evidence view',
    description:
      'A commit-bound view of reviewed source, observed operation, and unresolved evidence.',
    images: [socialImagePath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-cyan-950 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
