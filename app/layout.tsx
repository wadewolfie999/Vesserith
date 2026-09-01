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
const socialImagePath = publicationPath('/og.png');

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'Vesserith — One namespace, independent systems',
    template: '%s · Vesserith',
  },
  description:
    'The public evidence map and navigation layer for Vesserith, Mynyra, Nyvora, and Hova.',
  openGraph: {
    title: 'Vesserith — One namespace, independent systems',
    description:
      'A public map of what is implemented, what is documented, and what remains a hypothesis.',
    type: 'website',
    images: [
      {
        url: socialImagePath,
        width: 1200,
        height: 630,
        alt: 'Vesserith — One namespace. Independent systems.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vesserith — One namespace, independent systems',
    description:
      'A public map of what is implemented, what is documented, and what remains a hypothesis.',
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
