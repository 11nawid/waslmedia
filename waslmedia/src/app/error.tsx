'use client';

import { AlertOctagon } from 'lucide-react';
import { AppErrorState } from '@/components/app-error-state';
import { PublicAppShell } from '@/components/public-app-shell';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicAppShell>
      <AppErrorState
        badge="App Error"
        icon={<AlertOctagon className="h-10 w-10" />}
        title="Something interrupted this page"
        description={
          error?.message
            ? `The app hit a problem while loading this screen: ${error.message}`
            : 'The app hit a problem while loading this screen. You can retry this page or head back to the homepage.'
        }
        primaryLabel="Try Again"
        onPrimaryAction={reset}
        secondaryLabel="Go Home"
        secondaryHref="/"
      />
    </PublicAppShell>
  );
}
