'use client';

import { AlertTriangle } from 'lucide-react';
import { AppErrorState } from '@/components/app-error-state';

export default function StudioErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorState
      badge="Studio Error"
      icon={<AlertTriangle className="h-10 w-10" />}
      title="Studio ran into a problem"
      description={
        error?.message
          ? `This Studio screen could not finish loading: ${error.message}`
          : 'This Studio screen could not finish loading. Try again or head back to the dashboard.'
      }
      primaryLabel="Try Again"
      onPrimaryAction={reset}
      secondaryLabel="Go To Dashboard"
      secondaryHref="/studio/dashboard"
      className="min-h-[calc(100vh-8rem)]"
    />
  );
}
