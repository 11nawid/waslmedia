'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language-store';
import { LocationProvider } from '@/hooks/use-location-store';
import { AuthProvider } from '@/hooks/use-auth';
import { SidebarProvider } from '@/hooks/use-sidebar';
import { UploadDialogProvider } from '@/hooks/use-upload-dialog';
import { ShortsUploadDialogProvider } from '@/hooks/use-shorts-upload-dialog';
import { SaveToPlaylistDialogProvider } from '@/hooks/use-save-to-playlist-dialog';
import { CreateAdDialogProvider } from '@/hooks/use-create-ad-dialog';
import { UploadDialog } from '@/components/upload-dialog';
import { ShortsUploadDialog } from '@/components/shorts-upload-dialog';
import { SaveToPlaylistDialog } from '@/components/save-to-playlist-dialog';
import { CreateAdDialog } from '@/components/create-ad-dialog';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Toaster } from '@/components/ui/toaster';
import { ChunkErrorRecovery } from '@/components/chunk-error-recovery';
import { MediaGuard } from '@/components/media-guard';
import { FloatingVideoPlayerProvider } from '@/components/floating-video-player';
import { BrowserConsoleWarning } from '@/components/browser-console-warning';
import { WalletWindow } from '@/components/wallet-window';
import { GlobalLoadProgress } from '@/components/global-load-progress';
import type { AuthUser } from '@/lib/auth/types';

export function AppProviders({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const pathname = usePathname() || '';
  const isStudioPage = pathname.startsWith('/studio');

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <LocationProvider>
          <AuthProvider initialUser={initialUser}>
            <SidebarProvider>
              <UploadDialogProvider>
                <ShortsUploadDialogProvider>
                  <SaveToPlaylistDialogProvider>
                    <CreateAdDialogProvider>
                      <FloatingVideoPlayerProvider>
                        <div
                          className={cn(
                            'font-sans antialiased',
                            isStudioPage && 'studio-scroll-lock'
                          )}
                        >
                          <GlobalLoadProgress />
                          <ChunkErrorRecovery />
                          <BrowserConsoleWarning />
                          <MediaGuard />
                          <UploadDialog />
                          <ShortsUploadDialog />
                          <SaveToPlaylistDialog />
                          <CreateAdDialog />
                          <WalletWindow />
                          {children}
                          <BottomNavBar />
                          <Toaster />
                        </div>
                      </FloatingVideoPlayerProvider>
                    </CreateAdDialogProvider>
                  </SaveToPlaylistDialogProvider>
                </ShortsUploadDialogProvider>
              </UploadDialogProvider>
            </SidebarProvider>
          </AuthProvider>
        </LocationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
