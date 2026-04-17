'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioLines, BarChart3, Brush, LayoutDashboard, Megaphone, MessageCircle, MessageSquareWarning, PlaySquare, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useStudioChromeStore } from '@/hooks/use-studio-chrome-store';
import { useIsTablet } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const navItems = [
  { href: '/studio/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio/upload', label: 'Content', icon: PlaySquare },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/studio/community', label: 'Community', icon: MessageCircle },
  { href: '/studio/ads', label: 'Ads', icon: Megaphone },
  { href: '/studio/customisation', label: 'Customization', icon: Brush },
  { href: '/studio/library', label: 'Audio library', icon: AudioLines },
];

const bottomNavItems = [
  { href: '/studio/settings', label: 'Settings', icon: Settings },
  { href: '/studio/feedback', label: 'Send feedback', icon: MessageSquareWarning },
];

export function StudioSidebarContent({ onNavigate, forceExpanded = false }: { onNavigate?: () => void; forceExpanded?: boolean } = {}) {
  const pathname = usePathname() || '';
  const { user, userChannelLink } = useAuth();
  const sidebarCollapsed = useStudioChromeStore((state) => state.sidebarCollapsed);
  const isTablet = useIsTablet();
  const effectiveCollapsed = forceExpanded ? false : sidebarCollapsed || Boolean(isTablet);
  const channelTitle = user?.displayName || 'Your channel';
  const channelSubtitle = user?.handle || user?.email || '';

  return (
      <ScrollArea className="h-full bg-background text-foreground">
        <div className="flex min-h-full flex-col justify-between pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
          <TooltipProvider delayDuration={120}>
          <div className={cn(effectiveCollapsed ? 'pt-2 pb-4' : 'py-5', effectiveCollapsed ? 'px-2' : 'px-2.5')}>
            <Link
              href={userChannelLink}
              onClick={onNavigate}
              className={cn(
                'group flex transition-colors',
                effectiveCollapsed
                  ? 'mx-auto h-12 w-12 items-center justify-center rounded-full hover:bg-secondary/70'
                  : 'flex-col items-center rounded-[28px] px-4 pb-5 pt-2 text-center hover:bg-secondary/35'
              )}
            >
              <Avatar className={cn('shrink-0', effectiveCollapsed ? 'h-10 w-10' : 'h-28 w-28 shadow-sm')}>
                <AvatarImage src={user?.photoURL || undefined} alt={channelTitle} />
                <AvatarFallback>{channelTitle.charAt(0)}</AvatarFallback>
              </Avatar>
              {!effectiveCollapsed ? (
                <div className="mt-4 min-w-0">
                  <p className="text-[1.05rem] font-bold leading-none">Your channel</p>
                  <p className="mt-2 truncate text-sm font-medium text-muted-foreground">{channelSubtitle}</p>
                </div>
              ) : null}
            </Link>

            <nav className={cn(effectiveCollapsed ? 'mt-2 space-y-1.5 px-0' : 'mt-4 space-y-1.5 px-0.5')}>
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const content = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center text-sm font-semibold transition-colors',
                      effectiveCollapsed
                        ? 'mx-auto h-11 w-11 justify-center rounded-2xl'
                        : 'gap-3 rounded-xl px-4 py-3',
                      active
                        ? 'bg-secondary text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary/55 hover:text-foreground'
                    )}
                    title={effectiveCollapsed ? item.label : undefined}
                  >
                    <item.icon className={cn('shrink-0', effectiveCollapsed ? 'h-[1.35rem] w-[1.35rem]' : 'h-5 w-5')} />
                    {!effectiveCollapsed ? <span>{item.label}</span> : null}
                  </Link>
                );

                if (!effectiveCollapsed) {
                  return content;
                }

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          <div className={cn('space-y-1.5 border-t border-border/70 pb-5', effectiveCollapsed ? 'px-2 pt-3' : 'px-3 pt-4')}>
            {bottomNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const content = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center text-sm font-semibold transition-colors',
                    effectiveCollapsed
                      ? 'mx-auto h-11 w-11 justify-center rounded-2xl'
                      : 'gap-3 rounded-xl px-3 py-3',
                    active
                      ? 'bg-secondary text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/55 hover:text-foreground'
                  )}
                  title={effectiveCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn('shrink-0', effectiveCollapsed ? 'h-[1.35rem] w-[1.35rem]' : 'h-5 w-5')} />
                  {!effectiveCollapsed ? <span>{item.label}</span> : null}
                </Link>
              );

              if (!effectiveCollapsed) {
                return content;
              }

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          </TooltipProvider>
        </div>
      </ScrollArea>
  );
}

export function StudioSidebar() {
  const sidebarCollapsed = useStudioChromeStore((state) => state.sidebarCollapsed);
  const isTablet = useIsTablet();
  const effectiveCollapsed = sidebarCollapsed || Boolean(isTablet);

  return (
    <aside
      className={cn(
        'hidden bg-background text-foreground transition-[width] duration-200 lg:flex lg:flex-col',
        effectiveCollapsed ? 'w-[84px]' : 'w-[264px]'
      )}
    >
      <StudioSidebarContent />
    </aside>
  );
}
