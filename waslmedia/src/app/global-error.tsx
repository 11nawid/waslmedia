'use client';

import { AlertOctagon } from 'lucide-react';
import { AppProviders } from '@/components/app-providers';
import { AppErrorState } from '@/components/app-error-state';
import { PublicAppShell } from '@/components/public-app-shell';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProviders initialUser={null}>
          <PublicAppShell>
            <AppErrorState
              badge="Critical Error"
              icon={<AlertOctagon className="h-10 w-10" />}
              title="The app needs another try"
              description={
                error?.message
                  ? `A critical problem stopped the app from rendering correctly: ${error.message}`
                  : 'A critical problem stopped the app from rendering correctly. Try again or head back to the homepage.'
              }
              primaryLabel="Try Again"
              onPrimaryAction={reset}
              secondaryLabel="Go Home"
              secondaryHref="/"
            />
          </PublicAppShell>
        </AppProviders>
      </body>
    </html>
  );
}
