import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SignupPageClient from './signup-page-client';
import { buildNoIndexMetadata } from '@/lib/seo';
import { getCurrentAuthUser } from '@/server/services/auth';

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Sign Up | Waslmedia',
  description: 'Create a Waslmedia account.',
});

export default async function SignupPage() {
  const user = await getCurrentAuthUser();

  if (user) {
    redirect('/');
  }

  return <SignupPageClient />;
}
