'use client';

import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { StudioHeader } from '@/components/studio-header';
import { StudioSidebar } from '@/components/studio-sidebar';
import { StudioBottomNav } from '@/components/studio-bottom-nav';
import { StudioAiAssistantWindow } from '@/components/studio-ai-assistant';
import type { AuthUser } from '@/lib/auth/types';
import { StudioSessionProvider } from '@/components/studio/studio-session-provider';

export function StudioShell({
  children,
  viewer,
  studioToken,
  canManageAds = false,
}: {
  children: React.ReactNode;
  viewer: AuthUser | null;
  studioToken: string | null;
  canManageAds?: boolean;
}) {
  const isMobile = useIsMobile();
  const pathname = usePathname() || '';
  const isVideoWorkbench = pathname.startsWith('/studio/video/');
  const isAdvancedAnalytics =
    pathname === '/studio/analytics/advanced' || pathname.endsWith('/analytics/advanced');

  return (
    <StudioSessionProvider viewer={viewer} studioToken={studioToken}>
      {isAdvancedAnalytics ? (
        <div className="h-screen w-full overflow-hidden bg-background text-foreground">
          {children}
          <StudioAiAssistantWindow />
        </div>
      ) : isVideoWorkbench ? (
        <div className="flex h-screen w-full flex-col bg-background text-foreground">
          <StudioHeader canManageAds={canManageAds} />
          <div className="flex-1 overflow-hidden bg-background pb-20 lg:pb-0">{children}</div>
          {isMobile ? <StudioBottomNav /> : null}
          <StudioAiAssistantWindow />
        </div>
      ) : (
        <div className="flex h-screen w-full flex-col bg-background text-foreground">
          <StudioHeader canManageAds={canManageAds} />
          <div className="flex flex-1 overflow-hidden">
            {!isMobile ? <StudioSidebar /> : null}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-background">
                <main className="min-h-full px-4 py-5 pb-20 lg:px-7 lg:py-7 lg:pb-8">{children}</main>
              </div>
            </div>
          </div>
          {isMobile ? <StudioBottomNav /> : null}
          <StudioAiAssistantWindow />
        </div>
      )}
    </StudioSessionProvider>
  );
}
