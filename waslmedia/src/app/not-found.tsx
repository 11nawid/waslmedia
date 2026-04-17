import { Clapperboard } from 'lucide-react';
import { AppErrorState } from '@/components/app-error-state';
import { PublicAppShell } from '@/components/public-app-shell';

export default function NotFound() {
  return (
    <PublicAppShell>
      <AppErrorState
        badge="404 Error"
        icon={<Clapperboard className="h-10 w-10" />}
        title="This page slipped off the timeline"
        description="The link may be old, the page may have moved, or the content may no longer be available. You can jump back home or head to search and keep exploring."
        primaryLabel="Go Home"
        primaryHref="/"
        secondaryLabel="Search"
        secondaryHref="/search"
      />
    </PublicAppShell>
  );
}
