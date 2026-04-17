"use client";

import { AppProviders } from '@/components/app-providers';
import { getProductionConsoleGuardScript } from '@/components/browser-console-warning';
import type { AuthUser } from "@/lib/auth/types";
import { getReloadBootstrapScript } from '@/hooks/use-global-load-progress';

export function Body({ children, initialUser }: { children: React.ReactNode; initialUser: AuthUser | null }) {
  return (
    <body suppressHydrationWarning>
      {process.env.NODE_ENV === 'production' ? (
        <script dangerouslySetInnerHTML={{ __html: getProductionConsoleGuardScript() }} />
      ) : null}
      <script dangerouslySetInnerHTML={{ __html: getReloadBootstrapScript() }} />
      <div id="global-load-progress-preload" aria-hidden="true" />
      <AppProviders initialUser={initialUser}>{children}</AppProviders>
    </body>
  );
}
