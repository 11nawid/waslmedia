'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, CircleHelp, LogOut, Megaphone, Menu, MessageSquareWarning, Monitor, Moon, PlusSquare, Search, Sun, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { useStrictAdsDesktopAccess } from '@/hooks/use-strict-ads-desktop-access';
import { useStrictDesktopAccess } from '@/hooks/use-strict-desktop-access';
import { useStudioStore } from '@/hooks/use-studio-store';
import { useStudioChromeStore } from '@/hooks/use-studio-chrome-store';
import { logoutUser } from '@/lib/auth/client';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { useCreateAdDialog } from '@/hooks/use-create-ad-dialog';
import {
  getStudioAdsOverviewClient,
  getStudioNotificationDetailClient,
  getStudioNotificationsClient,
  markStudioNotificationReadClient,
} from '@/lib/ads/client';
import { ADS_SYNC_EVENT } from '@/lib/ads/feed';
import type { UserNotification } from '@/lib/ads/types';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config/app';
import { StudioAiAssistantTrigger } from '@/components/studio-ai-assistant';
import { StudioSidebarContent } from '@/components/studio-sidebar';
import { WalletTriggerButton } from '@/components/wallet-trigger-button';
import { UserNotificationsMenu } from '@/components/user-notifications-menu';
import { useProgressRouter } from '@/hooks/use-progress-router';

function StudioLogo({ className }: { className?: string }) {
  return (
    <Image
      src={appConfig.studioLogoUrl}
      alt="Studio logo"
      width={32}
      height={32}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

function StudioAccountMenu() {
  const router = useProgressRouter();
  const { user, userChannelLink } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-offset-background transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] rounded-[28px] border-border/70 bg-popover/95 p-2 shadow-2xl">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.handle}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href={userChannelLink}>Your channel</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="rounded-2xl px-3 py-3">
            <LogOut className="mr-3 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="items-center rounded-2xl px-3 py-3">
              <Moon className="mr-3 h-4 w-4" />
              <span>Appearance: {theme === 'system' ? 'Device theme' : theme}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-2xl border-border/70 bg-popover/95">
              <DropdownMenuItem onClick={() => setTheme('light')} className="items-center rounded-xl px-3 py-2">
                <Sun className="mr-3 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="items-center rounded-xl px-3 py-2">
                <Moon className="mr-3 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="items-center rounded-xl px-3 py-2">
                <Monitor className="mr-3 h-4 w-4" />
                <span>Device theme</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href="/studio/feedback">
              <MessageSquareWarning className="mr-3 h-4 w-4" />
              <span>Send feedback</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StudioNotificationsMenu({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<UserNotification | null>(null);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const load = async () => {
      try {
        const payload = await getStudioNotificationsClient();
        if (!active) {
          return;
        }
        setItems(payload.items);
        setUnreadCount(payload.unreadCount);
      } catch {
        if (active) {
          setItems([]);
          setUnreadCount(0);
        }
      }
    };

    void load();
    window.addEventListener(ADS_SYNC_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(ADS_SYNC_EVENT, load);
    };
  }, [enabled]);

  const openNotification = async (notification: UserNotification) => {
    try {
      const payload = await getStudioNotificationDetailClient(notification.id);
      const readPayload = notification.readAt ? null : await markStudioNotificationReadClient(notification.id).catch(() => null);
      const next = readPayload?.notification || payload.notification;
      setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
      if (!notification.readAt) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      setSelected(next);
    } catch {
      setSelected(notification);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {Math.min(unreadCount, 99)}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[380px] rounded-[24px] border-border/70 bg-popover/95 p-2">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">Ad review, payment, and delivery updates.</p>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="items-start rounded-2xl px-3 py-3"
                  onSelect={(event) => {
                    event.preventDefault();
                    void openNotification(item);
                  }}
                >
                  <div className="flex w-full items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full',
                        item.severity === 'success' && 'bg-emerald-500',
                        item.severity === 'warning' && 'bg-amber-500',
                        item.severity === 'error' && 'bg-rose-500',
                        item.severity === 'info' && 'bg-sky-500'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        {!item.readAt ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">New</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-border/70 bg-secondary/15 p-4">
                <p className="text-sm leading-7 text-foreground">{selected.body}</p>
              </div>
              {selected.metadata ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(selected.metadata).map(([key, value]) => (
                    <div key={key} className="rounded-[20px] border border-border/70 bg-secondary/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="mt-2 break-words text-sm font-medium">{String(value || '—')}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {selected.ctaTarget ? (
                <div className="flex justify-end">
                  <Button asChild className="rounded-full">
                    <Link href={selected.ctaTarget}>{selected.ctaLabel || 'Open'}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StudioHeader({ canManageAds = true }: { canManageAds?: boolean }) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const strictDesktopAdsAccess = useStrictAdsDesktopAccess(canManageAds);
  const strictDesktopWalletAccess = useStrictDesktopAccess(true);
  const { searchQuery, setSearchQuery } = useStudioStore();
  const toggleSidebarCollapsed = useStudioChromeStore((state) => state.toggleSidebarCollapsed);
  const { onOpen: onUploadOpen } = useUploadDialog();
  const { onOpen: onCreateAdOpen } = useCreateAdDialog();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [canCreateAd, setCanCreateAd] = useState(false);

  const showDrawerMenu = Boolean(isMobile || isTablet);

  useEffect(() => {
    let active = true;

    if (!strictDesktopAdsAccess) {
      setCanCreateAd(false);
      return;
    }

    const syncCreateState = async () => {
      try {
        const overview = await getStudioAdsOverviewClient({ progressMode: 'silent' });
        if (active) {
          setCanCreateAd(overview.canCreateAd);
        }
      } catch {
        if (active) {
          setCanCreateAd(false);
        }
      }
    };

    syncCreateState();
    window.addEventListener(ADS_SYNC_EVENT, syncCreateState);
    return () => {
      active = false;
      window.removeEventListener(ADS_SYNC_EVENT, syncCreateState);
    };
  }, [strictDesktopAdsAccess]);

  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 bg-background/95 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="h-[100dvh] max-h-[100dvh] w-[88vw] max-w-[320px] p-0" hideCloseButton>
              <SheetHeader className="border-b border-border/70 px-4 py-4">
                <SheetTitle className="flex items-center gap-2">
                  <StudioLogo className="h-7 w-7" />
                  <span className="text-xl font-bold tracking-tight">Studio</span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100dvh-73px)]">
                <StudioSidebarContent onNavigate={() => setIsNavOpen(false)} forceExpanded />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 items-center gap-2">
            <StudioLogo className="h-6 w-6 shrink-0" />
            <span className="truncate text-[1.05rem] font-bold tracking-tight">Studio</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="[&>button]:h-9 [&>button]:min-w-0 [&>button]:gap-0 [&>button]:rounded-full [&>button]:px-2.5 [&>button>span]:hidden">
            <StudioAiAssistantTrigger />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full">
                <PlusSquare className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/70 bg-popover/95">
                <DropdownMenuItem onClick={() => onUploadOpen()} className="rounded-xl px-3 py-2">
                  <Upload className="mr-3 h-4 w-4" />
                  <span>Upload video or Short</span>
                </DropdownMenuItem>
                {strictDesktopAdsAccess && canCreateAd ? (
                  <DropdownMenuItem onClick={() => onCreateAdOpen()} className="rounded-xl px-3 py-2">
                    <Megaphone className="mr-3 h-4 w-4" />
                    <span>Create ad</span>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
          </DropdownMenu>
          <StudioAccountMenu />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-background/95 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        {showDrawerMenu ? (
          <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="h-[100dvh] max-h-[100dvh] w-[88vw] max-w-[320px] p-0" hideCloseButton>
              <SheetHeader className="border-b border-border/70 px-4 py-4">
                <SheetTitle className="flex items-center gap-2">
                  <StudioLogo className="h-8 w-8" />
                  <span className="text-2xl font-black tracking-tight">Studio</span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100dvh-73px)]">
                <StudioSidebarContent onNavigate={() => setIsNavOpen(false)} forceExpanded />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleSidebarCollapsed}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link href="/studio/dashboard" className="flex items-center gap-2">
          <StudioLogo className="h-8 w-8" />
          <span className="text-[1.75rem] font-black tracking-tight">Studio</span>
        </Link>
      </div>

      <div className="flex flex-1 justify-center px-3">
        <div className="relative w-full max-w-[680px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search across your channel"
            className="h-11 rounded-full border-border/70 bg-secondary/40 pl-12 pr-4"
          />
        </div>
      </div>

        <div className="flex items-center gap-1">
          <StudioAiAssistantTrigger />
          <UserNotificationsMenu enabled={strictDesktopWalletAccess && !isMobile} />
          <WalletTriggerButton enabled={strictDesktopWalletAccess && !isMobile} className="h-10 px-3" />
          <Button variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:text-foreground">
            <Link href="/studio/help">
              <CircleHelp className="h-5 w-5" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2 rounded-full border-border/70 bg-transparent px-4">
              <PlusSquare className="mr-2 h-4 w-4" />
              Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-border/70 bg-popover/95">
            <DropdownMenuItem onClick={() => onUploadOpen()} className="rounded-xl px-3 py-2">
              <Upload className="mr-3 h-4 w-4" />
              <span>Upload video or Short</span>
            </DropdownMenuItem>
            {strictDesktopAdsAccess && canCreateAd ? (
              <DropdownMenuItem onClick={() => onCreateAdOpen()} className="rounded-xl px-3 py-2">
                <Megaphone className="mr-3 h-4 w-4" />
                <span>Create ad</span>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-2">
          <StudioAccountMenu />
        </div>
      </div>
    </header>
  );
}
