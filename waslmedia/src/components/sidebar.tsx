

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Clapperboard, Clock, Compass, History, Home, LayoutGrid, ListVideo, PlaySquare, ThumbsUp, UserRound, UserSquare, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from './ui/separator';
import { useSidebar } from '@/hooks/use-sidebar';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { useLanguageStore } from '@/hooks/use-language-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

function NavSection({ title, children, isCollapsed, titleLink }: { title?: string; children: React.ReactNode, isCollapsed: boolean; titleLink?: string }) {
    if (isCollapsed) {
        return <div className="space-y-1 px-2 py-1.5 first:pt-0">{children}</div>
    }
    
    return (
        <div className="py-2">
            {title && (
                titleLink ? (
                    <Link href={titleLink} className="px-4 text-lg font-semibold tracking-tight mb-2 flex items-center gap-2 hover:text-foreground/80">
                        {title} <ChevronRight className="w-5 h-5" />
                    </Link>
                ) : (
                    <div className="px-4 text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
                        {title}
                    </div>
                )
            )}
            <div className="space-y-1">
                {children}
            </div>
        </div>
    )
}

function NavLink({ href, label, icon: Icon, isCollapsed, onNavigate }: { href: string; label: string; icon: React.ElementType, isCollapsed: boolean; onNavigate?: () => void }) {
    const pathname = usePathname() || '';
    const isActive = pathname === href;

    const content = (
      <Button
        variant="ghost"
        className={cn(
          "group w-full justify-start text-foreground hover:text-foreground",
          isCollapsed
            ? "mx-auto h-12 w-12 justify-center rounded-2xl px-0"
            : "h-12 rounded-2xl px-4",
          isCollapsed
            ? isActive
              ? "bg-transparent text-foreground"
              : "bg-transparent text-muted-foreground hover:bg-transparent"
            : isActive
              ? "bg-secondary text-foreground shadow-sm"
              : "bg-transparent text-muted-foreground hover:bg-secondary/75"
        )}
        asChild
      >
        <Link href={href} title={isCollapsed ? label : undefined} onClick={onNavigate}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl transition-colors",
              isCollapsed
                ? isActive
                  ? "h-11 w-11 bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
                  : "h-11 w-11 text-muted-foreground group-hover:bg-secondary/75 group-hover:text-foreground"
                : isActive
                  ? "h-9 w-9 bg-transparent text-foreground"
                  : "h-9 w-9 text-muted-foreground group-hover:bg-secondary/75 group-hover:text-foreground"
            )}
          >
            <Icon className={cn("shrink-0", isCollapsed ? "h-[1.625rem] w-[1.625rem]" : "h-5 w-5")} />
          </span>
          {!isCollapsed && (
            <span
              className={cn(
                "ml-4 text-base transition-colors",
                isActive ? "font-semibold text-foreground" : "text-inherit"
              )}
            >
              {label}
            </span>
          )}
        </Link>
      </Button>
    );

    if (!isCollapsed) {
      return content;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
}


export function SidebarContent({ onNavigate, forceExpanded = false }: { onNavigate?: () => void; forceExpanded?: boolean } = {}) {
  const { user, userChannelLink } = useAuth();
  const { isCollapsed } = useSidebar();
  const isTablet = useIsTablet();
  const effectiveCollapsed = forceExpanded ? false : isCollapsed || Boolean(isTablet);
  const { t } = useLanguageStore();

  const mainNav = [
    { href: '/', label: t('sidebar.home'), icon: Home },
    { href: '/shorts', label: t('sidebar.shorts'), icon: Clapperboard },
    { href: '/subscriptions', label: t('sidebar.subscriptions'), icon: LayoutGrid },
  ];
  
  const youNav = [
      { href: '/history', label: t('sidebar.history'), icon: History },
      { href: '/playlists', label: t('sidebar.playlists'), icon: ListVideo },
      { href: '/your-videos', label: t('sidebar.yourVideos'), icon: Video },
      { href: '/watch-later', label: t('sidebar.watchLater'), icon: Clock },
      { href: '/liked', label: t('sidebar.likedVideos'), icon: ThumbsUp },
  ];
  
  const exploreNav = [
      { href: '/trending', label: t('sidebar.trending'), icon: Compass },
      { href: '/help-center/company/about', label: t('sidebar.aboutWaslmedia'), icon: PlaySquare },
  ]
  

  return (
    <ScrollArea className="h-full">
        <div
          className={cn(
            "py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]",
            effectiveCollapsed && "py-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
          )}
        >
        <nav className="grid items-start">
             <TooltipProvider delayDuration={120}>
             <NavSection isCollapsed={effectiveCollapsed}>
                {mainNav.map((item) => (
                    <NavLink key={item.href} {...item} isCollapsed={effectiveCollapsed} onNavigate={onNavigate} />
                ))}
            </NavSection>

            <Separator />
            
            <NavSection title={t('sidebar.you')} isCollapsed={effectiveCollapsed} titleLink={'/your-data'}>
                 {user ? (
                    <>
                        <NavLink href={userChannelLink} label={t('sidebar.yourChannel')} icon={UserSquare} isCollapsed={effectiveCollapsed} onNavigate={onNavigate} />
                        {youNav.map((item) => (
                            <NavLink key={item.href} {...item} isCollapsed={effectiveCollapsed} onNavigate={onNavigate} />
                        ))}
                    </>
                 ) : (
                    <div className={cn("p-4 space-y-2", effectiveCollapsed && "p-2 text-center")}>
                        {!effectiveCollapsed && <p className="text-sm">{t('sidebar.signInPrompt')}</p>}
                        <Button variant="outline" className="rounded-full" asChild>
                            <Link href="/login" onClick={onNavigate}>
                                <UserRound className={cn("w-5 h-5", !effectiveCollapsed && "mr-2")} />
                                {!effectiveCollapsed && t('sidebar.signIn')}
                            </Link>
                        </Button>
                    </div>
                )}
            </NavSection>
            
            <Separator />
            
            <NavSection title={t('sidebar.explore')} isCollapsed={effectiveCollapsed}>
                {exploreNav.map((item) => (
                    <NavLink key={item.href} {...item} isCollapsed={effectiveCollapsed} onNavigate={onNavigate} />
                ))}
            </NavSection>
            </TooltipProvider>
        </nav>
      </div>
    </ScrollArea>
  );
}

export function Sidebar({ className }: { className?: string } = {}) {
    const { isCollapsed } = useSidebar();
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    
    if (isMobile) {
        return null;
    }

    const effectiveCollapsed = isCollapsed || Boolean(isTablet);

  return (
    <aside className={cn("hidden md:block bg-background transition-all duration-300", effectiveCollapsed ? "w-[72px]" : "w-72", className)}>
      <SidebarContent />
    </aside>
  );
}
