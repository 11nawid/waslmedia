'use client';

import { AlertTriangle } from 'lucide-react';
import { AppErrorState } from '@/components/app-error-state';

export default function StudioNotFound() {
  return (
    <AppErrorState
      badge="Studio 404"
      icon={<AlertTriangle className="h-10 w-10" />}
      title="This Studio page is missing"
      description="That Studio route is not available right now. Head back to the dashboard or reload if you were expecting something to be here."
      primaryLabel="Go To Dashboard"
      primaryHref="/studio/dashboard"
      secondaryLabel="Reload"
      onSecondaryAction={() => window.location.reload()}
      className="min-h-[calc(100vh-8rem)]"
    />
  );
}
