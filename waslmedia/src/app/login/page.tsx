import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginPageClient from './login-page-client';
import { buildNoIndexMetadata } from '@/lib/seo';
import { getCurrentAuthUser } from '@/server/services/auth';

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Login | Waslmedia',
  description: 'Sign in to Waslmedia.',
});

export default async function LoginPage() {
  const user = await getCurrentAuthUser();

  if (user) {
    redirect('/');
  }

  return <LoginPageClient />;
}
