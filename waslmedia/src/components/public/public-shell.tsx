'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Menu, Moon, Search, Sun, UserRound } from 'lucide-react';
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
import { publicFooterGroups, publicNavigation } from '@/lib/public-site-content';
import { cn } from '@/lib/utils';
import { useProgressRouter } from '@/hooks/use-progress-router';

function ThemeToggle({ darkMode }: { darkMode: boolean }) {
  const { setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(darkMode ? 'light' : 'dark')}
      className={cn(
        'rounded-full border',
        darkMode
          ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950',
      )}
      aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function PublicNavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname() || '';

  return (
    <>
      {publicNavigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              mobile ? 'rounded-full px-4 py-3 text-base' : 'px-1 py-2 text-sm',
              active ? 'text-slate-950' : 'text-slate-500 transition hover:text-slate-950',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function PublicAuthActions() {
  const router = useProgressRouter();
  const { user, userChannelLink } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/company');
  };

  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" asChild className="rounded-full px-5 text-slate-600 hover:bg-slate-50 hover:text-slate-950">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
          <Link href="/signup">Get started</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 text-slate-950 md:inline-flex"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || 'User'} />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
          </Avatar>
          <span className="pr-3 text-sm font-medium">{user.displayName || 'Your profile'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] rounded-[24px] border border-slate-200 bg-white p-2 shadow-xl">
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user.photoURL || DEFAULT_PROFILE_PICTURE} alt={user.displayName || 'User'} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-950">{user.displayName}</p>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href={userChannelLink}>
              <UserRound />
              <span>Go to channel</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href="/">
              <Search />
              <span>Open app</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-3">
            <Link href="/studio/dashboard">
              <Search />
              <span>Open studio</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="rounded-2xl px-3 py-3">
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const { user, userChannelLink } = useAuth();
  const router = useProgressRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/company');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full border border-slate-200 bg-white text-slate-700 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] border-l border-slate-200 bg-white p-0 text-slate-950">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <SheetTitle className="text-slate-950">Waslmedia public pages</SheetTitle>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
            <div className="flex flex-col gap-2">
              <PublicNavLinks mobile />
            </div>
            {user ? (
              <div className="space-y-3">
                <Link href={userChannelLink} className="block text-base font-medium text-slate-950">Go to channel</Link>
                <Link href="/" className="block text-base font-medium text-slate-950">Open app</Link>
                <Link href="/studio/dashboard" className="block text-base font-medium text-slate-950">Open studio</Link>
                <button type="button" onClick={handleLogout} className="block text-left text-base font-medium text-rose-600">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button asChild className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                  <Link href="/signup">Get started</Link>
                </Button>
                <Button variant="outline" asChild className="w-full rounded-full border-slate-200">
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

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  useEffect(() => {
    document.body.classList.add('public-scroll-mode');

    return () => {
      document.body.classList.remove('public-scroll-mode');
    };
  }, []);

  return (
    <div className={cn('min-h-screen', darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f4f4f3] text-slate-950')}>
      <div className="relative">
        <header className={cn('sticky top-0 z-40 border-b', darkMode ? 'border-slate-800 bg-slate-950/92 backdrop-blur' : 'border-slate-200 bg-white/96 backdrop-blur')}>
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/company" className="flex items-center gap-3">
              <WaslmediaLogo className="h-8 w-8" />
              <div>
                <p className={cn('text-lg font-semibold tracking-tight', darkMode ? 'text-white' : 'text-slate-950')}>Waslmedia Help Center</p>
              </div>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
              <PublicNavLinks />
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'hidden rounded-full border md:inline-flex',
                  darkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-950',
                )}
              >
                <Search className="h-4 w-4" />
              </Button>
              <ThemeToggle darkMode={darkMode} />
              <PublicAuthActions />
              <MobileMenu />
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className={cn('border-t', darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white')}>
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <WaslmediaLogo className="h-8 w-8" />
                  <div>
                    <p className={cn('text-lg font-semibold tracking-tight', darkMode ? 'text-white' : 'text-slate-950')}>Waslmedia</p>
                    <p className={cn('text-sm', darkMode ? 'text-slate-400' : 'text-slate-500')}>
                      Company, docs, legal pages, and platform guidance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-3">
                {publicFooterGroups.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <h2 className={cn('text-sm font-semibold tracking-tight', darkMode ? 'text-slate-300' : 'text-slate-500')}>{group.title}</h2>
                    <div className="space-y-2">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn('block text-sm transition', darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950')}
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
    </div>
  );
}
