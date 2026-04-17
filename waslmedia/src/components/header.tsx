

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, usePathname } from 'next/navigation';
import { Search, Bell, Video, Columns2, LogOut, UserRound, Shield, DollarSign, Settings, HelpCircle, MessageSquareWarning, Upload, Radio, Users, Moon, Globe, Check, Sun, Monitor, ChevronRight, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { WaslmediaLogo } from './waslmedia-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { getSearchResults } from '@/lib/data';
import type { Video as VideoType, Channel } from '@/lib/types';
import { debounce } from 'lodash';
import { useTheme } from "next-themes";
import { useLocationStore } from '@/hooks/use-location-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguageStore } from '@/hooks/use-language-store';
import { logoutUser } from '@/lib/auth/client';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import { buildChannelHref } from '@/lib/channel-links';
import { buildVideoHref } from '@/lib/video-links';
import { useSidebar } from '@/hooks/use-sidebar';
import { useStrictDesktopAccess } from '@/hooks/use-strict-desktop-access';
import { WalletTriggerButton } from '@/components/wallet-trigger-button';
import { UserNotificationsMenu } from '@/components/user-notifications-menu';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { appConfig } from '@/config/app';
import { LocationSheet } from '@/components/settings-sheets';

const quickLocationOptions = ['Worldwide', 'Afghanistan', 'Palestine', 'India', 'United Kingdom', 'Canada'];
const SEARCH_HISTORY_STORAGE_KEY = 'waslmedia.searchHistory';
const MAX_SEARCH_HISTORY_ITEMS = 6;

function loadStoredSearchHistory(key: string) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function getScopedSearchHistoryKey(userId?: string | null) {
  return `${SEARCH_HISTORY_STORAGE_KEY}:${userId || 'guest'}`;
}

function LiveSearchResults({ query, onResultClick }: { query: string, onResultClick: () => void }) {
    const [results, setResults] = useState<(VideoType|Channel)[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            const searchResults = await getSearchResults(query);
            setResults(searchResults.results.slice(0, 5)); // Limit to 5 results
            setLoading(false);
        };
        fetchResults();
    }, [query]);

    if (loading) {
        return <div className="p-4">Searching...</div>
    }

    if (results.length === 0 && query.length > 1) {
        return <div className="p-4">No results found.</div>
    }

    const isVideo = (result: VideoType | Channel): result is VideoType => {
        return 'duration' in result;
    }

    return (
        <div className="py-2">
            {results.map(item => {
                const href = isVideo(item) ? buildVideoHref(item, { sourceContext: 'search' }) : buildChannelHref(item.handle || item.id);
                const title = isVideo(item) ? item.title : item.name;
                return (
                    <Link key={item.id} href={href} onClick={onResultClick} className="flex items-center gap-3 px-4 py-2 hover:bg-secondary">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{title}</span>
                    </Link>
                )
            })}
        </div>
    );
}

function SearchDropdownPanel({
  query,
  recentSearches,
  onResultClick,
  onSearchHistorySelect,
  onClearHistory,
}: {
  query: string;
  recentSearches: string[];
  onResultClick: () => void;
  onSearchHistorySelect: (value: string) => void;
  onClearHistory: () => void;
}) {
  if (query.trim().length >= 2) {
    return <LiveSearchResults query={query} onResultClick={onResultClick} />;
  }

  if (recentSearches.length === 0) {
    return (
      <div className="px-4 py-5">
        <p className="text-sm font-medium text-foreground">No recent searches yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Search for videos, channels, or topics and they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent searches</p>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onClearHistory}>
          Clear
        </Button>
      </div>
      {recentSearches.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSearchHistorySelect(item)}
          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{item}</span>
        </button>
      ))}
    </div>
  );
}


export function Header({
  className,
  hideSearch = false,
  hideDesktopMenuButton = false,
  desktopCenterSlot,
}: {
  className?: string;
  hideSearch?: boolean;
  hideDesktopMenuButton?: boolean;
  desktopCenterSlot?: ReactNode;
} = {}) {
  const router = useProgressRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const { userProfile: user, userChannelLink } = useAuth();
  const { onOpen: onUploadOpen } = useUploadDialog();
  const { theme, setTheme } = useTheme();
  const { location, setLocation } = useLocationStore();
  const { language, setLanguage, t } = useLanguageStore();
  const isMobile = useIsMobile();
  const { toggle } = useSidebar();
  const strictDesktopWalletAccess = useStrictDesktopAccess(Boolean(user));
  

  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchHistoryStorageKey = getScopedSearchHistoryKey(user?.id);
  
  const debouncedSearch = useCallback(debounce(setDebouncedQuery, 300), []);

  const storeSearchHistoryEntry = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setRecentSearches((current) =>
      [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_SEARCH_HISTORY_ITEMS)
    );
  }, []);

  useEffect(() => {
      debouncedSearch(searchQuery);
      return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    setRecentSearches(loadStoredSearchHistory(searchHistoryStorageKey));
  }, [searchHistoryStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(searchHistoryStorageKey, JSON.stringify(recentSearches));
  }, [recentSearches, searchHistoryStorageKey]);


  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery) {
      storeSearchHistoryEntry(normalizedQuery);
      router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
      setIsSearchFocused(false);
    }
  };

  const handleSearchHistorySelect = (value: string) => {
    setSearchQuery(value);
    setDebouncedQuery(value);
    storeSearchHistoryEntry(value);
    router.push(`/search?q=${encodeURIComponent(value)}`);
    setIsSearchFocused(false);
  };

  const handleClearSearchHistory = () => {
    setRecentSearches([]);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };
  
  const handleSendFeedback = () => {
    router.push('/feedback');
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setIsSearchFocused(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      const currentQuery = searchParams?.get('q');
      if (pathname === '/search' && currentQuery) {
          setSearchQuery(currentQuery || '');
      }
  }, [pathname, searchParams]);
  
  const isWatchPage = pathname.startsWith('/watch/');
  if (isMobile && isWatchPage) {
      return null;
  }

  return (
    <header className={cn(
        "flex items-center justify-between w-full h-16 px-4 shrink-0 bg-background md:px-6",
        className
    )}>
      <TooltipProvider>
        <LocationSheet isOpen={isLocationSheetOpen} onOpenChange={setIsLocationSheetOpen} />
        <div className="flex items-center gap-2">
            <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden">
                    <Columns2 className="w-6 h-6" />
                    <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="h-[100dvh] max-h-[100dvh] w-[88vw] max-w-[320px] p-0" hideCloseButton>
                <SheetHeader className="border-b border-border/70 px-4 py-4">
                  <SheetTitle className="flex items-center gap-2">
                    <WaslmediaLogo className="w-8 h-8 text-primary" />
                    <span className="text-xl font-extrabold tracking-tighter">Waslmedia</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100dvh-73px)]">
                  <SidebarContent onNavigate={() => setIsNavOpen(false)} forceExpanded />
                </div>
              </SheetContent>
            </Sheet>
            {!hideDesktopMenuButton ? (
              <Button variant="ghost" size="icon" className="hidden lg:flex rounded-full" onClick={toggle}>
                  <Columns2 className="w-6 h-6" />
                  <span className="sr-only">Toggle Sidebar</span>
              </Button>
            ) : null}
            <Link href="/" className="flex items-center gap-2">
            <WaslmediaLogo className="w-8 h-8 text-primary" />
            <span className="text-xl font-extrabold tracking-tighter">Waslmedia</span>
            </Link>
        </div>

        {desktopCenterSlot ? (
          <div className="hidden flex-1 justify-center px-4 md:flex">
            {desktopCenterSlot}
          </div>
        ) : (
          <>
            {/* Desktop Search */}
            <div
              className={cn(
                "hidden md:flex flex-1 justify-center px-4",
                hideSearch && "md:hidden"
              )}
              ref={searchContainerRef}
            >
                <div className="w-full max-w-xl relative">
                    <form
                      onSubmit={handleSearchSubmit}
                      onClick={() => setIsSearchFocused(true)}
                      className="flex w-full items-center overflow-hidden rounded-full border border-border/70 bg-secondary/35 shadow-sm transition-colors focus-within:border-primary/50 focus-within:bg-background"
                    >
                        <Input
                            type="search"
                            name="search"
                            placeholder={t('header.search')}
                            className="h-11 w-full border-0 bg-transparent pl-5 pr-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="h-11 rounded-none border-l border-border/60 px-5 hover:bg-secondary/70"
                        >
                            <Search className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </form>
                    {isSearchFocused && (
                        <div className="absolute top-full mt-2 w-full left-0 bg-background border rounded-lg shadow-lg z-[60]">
                            <SearchDropdownPanel
                              query={debouncedQuery}
                              recentSearches={recentSearches}
                              onResultClick={() => setIsSearchFocused(false)}
                              onSearchHistorySelect={handleSearchHistorySelect}
                              onClearHistory={handleClearSearchHistory}
                            />
                        </div>
                    )}
                </div>
            </div>
          </>
        )}


        <div className="flex items-center gap-2">
            {user ? (
            <>
                <div className="hidden md:flex items-center gap-2">
                    <UserNotificationsMenu enabled={strictDesktopWalletAccess} />
                    <WalletTriggerButton enabled={strictDesktopWalletAccess} className="h-10" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                               <Video className="w-6 h-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onUploadOpen()}>
                                <Upload className="mr-2 h-4 w-4" />
                                <span>Upload video or Short</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                 <div className="flex items-center gap-1 md:hidden">
                    <Link href="/search">
                        <Button variant="ghost" size="icon" className="rounded-full"><Search/></Button>
                    </Link>
                </div>

                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:inline-flex relative w-8 h-8 rounded-full">
                        <Avatar>
                                <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || "User"} data-ai-hint="user avatar" />
                            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px] rounded-[28px] border-border/70 bg-popover/95 p-2 shadow-2xl">
                    <div className="flex items-start gap-4 px-3 py-3">
                        <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || "User"} data-ai-hint="user avatar" />
                            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate text-lg font-semibold">{user.displayName}</div>
                            {user?.handle && <div className="truncate text-sm text-muted-foreground font-normal">{user.handle}</div>}
                            <Link href={userChannelLink} className="mt-1 block text-sm text-accent">{t('header.viewChannel')}</Link>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={handleLogout} className="rounded-2xl px-3 py-3">
                            <LogOut />
                            <span>{t('header.signOut')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
                           <Link href="/studio/dashboard">
                                <Image src={appConfig.studioLogoUrl} alt="Studio logo" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />
                                <span className="ml-2">Waslmedia Studio</span>
                           </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
                           <Link href="/your-data">
                                <Shield />
                                <span>{t('header.yourData')}</span>
                           </Link>
                        </DropdownMenuItem>
                         <DropdownMenuSub>
                           <DropdownMenuSubTrigger className="items-center rounded-2xl px-3 py-3">
                             <Moon />
                             <span>{t('header.appearance')}: {t(`themes.${theme}`)}</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuPortal>
                             <DropdownMenuSubContent className="rounded-2xl border-border/70 bg-popover/95">
                                <DropdownMenuItem onClick={() => setTheme("light")} className="items-center rounded-xl px-3 py-2">
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>{t('themes.light')}</span>
                                    {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("dark")} className="items-center rounded-xl px-3 py-2">
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>{t('themes.dark')}</span>
                                    {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("system")} className="items-center rounded-xl px-3 py-2">
                                    <Monitor className="mr-2 h-4 w-4" />
                                    <span>{t('themes.system')}</span>
                                     {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                             </DropdownMenuSubContent>
                           </DropdownMenuPortal>
                        </DropdownMenuSub>
                         <DropdownMenuSub>
                           <DropdownMenuSubTrigger className="rounded-2xl px-3 py-3">
                            <Globe />
                            <span>{t('header.language')}: {language === 'en' ? 'English' : 'Español'}</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuPortal>
                             <DropdownMenuSubContent className="rounded-2xl border-border/70 bg-popover/95">
                                <DropdownMenuItem onClick={() => setLanguage("en")} className="rounded-xl px-3 py-2">
                                    English
                                    {language === 'en' && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => setLanguage("es")} className="rounded-xl px-3 py-2">
                                    Español
                                    {language === 'es' && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                             </DropdownMenuSubContent>
                           </DropdownMenuPortal>
                        </DropdownMenuSub>
                         <DropdownMenuSub>
                           <DropdownMenuSubTrigger className="rounded-2xl px-3 py-3">
                            <Globe />
                            <span>{t('header.location')}: {location}</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuPortal>
                             <DropdownMenuSubContent className="rounded-2xl border-border/70 bg-popover/95">
                                {quickLocationOptions.map(loc => (
                                    <DropdownMenuItem key={loc} onClick={() => setLocation(loc)} className="rounded-xl px-3 py-2">
                                        {loc}
                                        {location === loc && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setIsLocationSheetOpen(true)}
                                  className="rounded-xl px-3 py-2"
                                >
                                  <Globe className="mr-2 h-4 w-4" />
                                  <span>Choose another country</span>
                                  <ChevronRight className="ml-auto h-4 w-4" />
                                </DropdownMenuItem>
                             </DropdownMenuSubContent>
                           </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuGroup>
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
                           <Link href="/help-center">
                                <HelpCircle />
                                <span>{t('header.help')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSendFeedback} className="rounded-2xl px-3 py-3">
                            <MessageSquareWarning />
                            <span>{t('header.sendFeedback')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
                </DropdownMenu>
            </>
            ) : (
            <>
                 <div className="flex md:hidden items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/search')}><Search/></Button>
                </div>
                <Button variant="outline" asChild className="hidden md:inline-flex rounded-full">
                    <Link href="/login">
                        <UserRound className="mr-2"/>
                        Sign in
                    </Link>
                </Button>
            </>
            )}
        </div>
      </TooltipProvider>
    </header>
  );
}
