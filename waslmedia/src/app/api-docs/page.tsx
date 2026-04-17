import type { Metadata } from 'next';
import { AdminClient } from './admin-client';
import { isApiDocsEnabled, readApiDocsSessionFromCookieStore } from '@/server/utils/api-docs-auth';
import { buildNoIndexMetadata } from '@/lib/seo';
import { resolveAdminViewer } from '@/server/services/admin';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = buildNoIndexMetadata({
  title: 'API Docs | Waslmedia',
  description: 'Internal API documentation for Waslmedia.',
});

export default async function ApiDocsPage() {
  if (!isApiDocsEnabled()) {
    notFound();
  }

  const initialViewer = await resolveAdminViewer(await readApiDocsSessionFromCookieStore());
  return <AdminClient initialViewer={initialViewer} />;
}
