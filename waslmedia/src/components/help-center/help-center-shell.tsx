'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, Search, UserRound } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WaslmediaLogo } from '@/components/waslmedia-logo';
import { useAuth } from '@/hooks/use-auth';
import { logoutUser } from '@/lib/auth/client';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import { helpCenterFooterGroups, helpCenterNavigation } from '@/lib/help-center-content';
import { cn } from '@/lib/utils';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { HelpCenterFooterNote } from '@/components/help-center/help-center-primitives';
import { HelpCenterSearch } from '@/components/help-center/help-center-search';

function HelpCenterNavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname() || '';

  return (
    <>
      {helpCenterNavigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
        className={cn(
              mobile ? 'rounded-full px-4 py-3 text-[1.05rem]' : 'border-b-2 border-transparent px-1 py-2 text-[1.02rem]',
              active
                ? 'border-[#1d9bf0] font-medium text-[#111827]'
                : 'font-medium text-[#667085] transition hover:text-[#111827]'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function HelpCenterAuthActions() {
  const router = useProgressRouter();
  const { user, userChannelLink } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/help-center');
  };

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Button variant="ghost" asChild className="rounded-full px-5 text-[#4b5563] hover:bg-[#f4f6f8] hover:text-[#111827]">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden h-12 w-12 items-center justify-center rounded-full border border-[#dfe6ee] bg-[#111827] text-white lg:inline-flex"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || 'User'} />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[300px] rounded-[24px] border border-[#e2e8f0] bg-white p-2 shadow-xl"
      >
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || 'User'} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#111827]">{user.displayName}</p>
              <p className="truncate text-sm text-[#667085]">{user.email}</p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href={userChannelLink}>
              <UserRound className="mr-2 h-4 w-4" />
              <span>Go to channel</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href="/">
              <Search className="mr-2 h-4 w-4" />
              <span>Open app</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href="/studio/dashboard">
              <Search className="mr-2 h-4 w-4" />
              <span>Open studio</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="rounded-2xl px-3 py-3">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HelpCenterMobileMenu() {
  const router = useProgressRouter();
  const { user, userChannelLink } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/help-center');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-[#e2e8f0] bg-white text-[#111827] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] border-l border-[#e2e8f0] bg-white p-0 text-[#111827]">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#e2e8f0] px-5 py-5">
            <SheetTitle className="text-[#111827]">Waslmedia Help Center</SheetTitle>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
            <HelpCenterSearch variant="header" className="w-full" />
            <div className="flex flex-col gap-2">
              <HelpCenterNavLinks mobile />
            </div>
            {user ? (
              <div className="space-y-3">
                <Link href={userChannelLink} className="block text-base font-medium text-[#111827]">
                  Go to channel
                </Link>
                <Link href="/" className="block text-base font-medium text-[#111827]">
                  Open app
                </Link>
                <Link href="/studio/dashboard" className="block text-base font-medium text-[#111827]">
                  Open studio
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block text-left text-base font-medium text-rose-600"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button asChild className="w-full rounded-full bg-[#111827] text-white hover:bg-[#1f2937]">
                  <Link href="/signup">Sign up</Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="w-full rounded-full border-[#e2e8f0] text-[#111827]"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function HelpCenterShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const headerSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    previousThemeRef.current = theme || 'system';
    setTheme('light');
    document.body.classList.add('public-scroll-mode');
    document.documentElement.classList.remove('dark');

    return () => {
      document.body.classList.remove('public-scroll-mode');
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme, theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(event.target as Node)) {
        setIsHeaderSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-[#e7ecf2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1720px] items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-10">
          <Link href="/help-center" className="flex items-center gap-3">
            <WaslmediaLogo className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9" />
            <div className="text-[1.15rem] font-semibold tracking-[-0.05em] text-[#111827] sm:text-[1.55rem] lg:text-[2.15rem]">
              Help Center
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-12 lg:flex">
            <HelpCenterNavLinks />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div ref={headerSearchRef} className="relative hidden lg:block">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full border border-[#dfe6ee] bg-white text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
                onClick={() => setIsHeaderSearchOpen((current) => !current)}
              >
                <Search className="h-4 w-4" />
              </Button>
              {isHeaderSearchOpen ? (
                <div className="absolute right-0 top-full mt-3 w-[420px]">
                  <HelpCenterSearch variant="header" className="w-full" />
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              asChild
              className="hidden h-12 rounded-full border border-[#dfe6ee] bg-white px-6 text-[#111827] hover:bg-[#f8fafc] lg:inline-flex"
            >
              <Link href="/help-center/contact">Contact Us</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-full border border-[#e2e8f0] bg-white text-[#111827] hover:bg-[#f8fafc] lg:hidden"
            >
              <Link href="/help-center/search">
                <Search className="h-4 w-4" />
              </Link>
            </Button>
            <HelpCenterAuthActions />
            <HelpCenterMobileMenu />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#e7ecf2] bg-white">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <HelpCenterFooterNote />

            <div className="grid gap-8 sm:grid-cols-3">
              {helpCenterFooterGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-[0.02em] text-[#667085]">
                    {group.title}
                  </h2>
                  <div className="space-y-2">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block text-sm text-[#4b5563] transition hover:text-[#111827]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
