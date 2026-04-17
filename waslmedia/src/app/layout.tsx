

import type { Metadata } from 'next';
import { appConfig } from '@/config/app';
import { getCurrentAuthUser } from '@/server/services/auth';
import './globals.css';
import { Body } from './body-component';

function resolveMetadataBase() {
  const value = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:9002';

  try {
    return new URL(value);
  } catch {
    return new URL('http://localhost:9002');
  }
}

export const metadata: Metadata = {
  title: appConfig.appName,
  description: appConfig.appDescription,
  metadataBase: resolveMetadataBase(),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getCurrentAuthUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <Body initialUser={initialUser}>{children}</Body>
    </html>
  );
}
