
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilmSlate, House, Plus, Rows, UserCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRef, useState } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: House },
  { href: '/shorts', label: 'Shorts', icon: FilmSlate },
  { href: null, label: 'Create', icon: Plus, isCreate: true },
  { href: '/subscriptions', label: 'Subscriptions', icon: Rows },
  { href: '/your-data', label: 'You', icon: UserCircle, requiresAuth: true },
];

function HoldHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearHint = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  const startHint = () => {
    clearHint();
    timerRef.current = setTimeout(() => setVisible(true), 350);
  };

  return (
    <div
      className="relative flex w-full items-center justify-center"
      onTouchStart={startHint}
      onTouchEnd={clearHint}
      onTouchCancel={clearHint}
    >
      {visible ? (
        <div className="pointer-events-none absolute bottom-full mb-2 rounded-full bg-popover px-3 py-1 text-xs font-medium text-popover-foreground shadow-md">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function BottomNavBar() {
  const pathname = usePathname() || '';
  const { userProfile } = useAuth();
  const { onOpen: onUploadOpen } = useUploadDialog();
  const isMobile = useIsMobile();

  const isStudioPage = pathname.startsWith('/studio');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isWatchPage = pathname.startsWith('/watch/');
  const isSearchPage = pathname.startsWith('/search');

  if (!isMobile || isStudioPage || isAuthPage || isWatchPage || isSearchPage) {
    return null;
  }

  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          if (item.requiresAuth && !userProfile) {
            return (
              <HoldHint key={item.href || item.label} label={item.label}>
                <Link href="/login" className="flex flex-col items-center justify-center text-muted-foreground w-full p-2">
                  <item.icon className="w-7 h-7" weight="regular" />
                </Link>
              </HoldHint>
            );
          }

          if (item.isCreate) {
             return (
                <HoldHint key={item.label} label={item.label}>
                  <button
                    onClick={() => onUploadOpen()}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground shadow-sm"
                  >
                      <Plus className="w-6 h-6" weight="bold" />
                  </button>
                </HoldHint>
             )
          }

          const isActive = isItemActive(item.href!);

          return (
            <HoldHint key={item.href} label={item.label}>
              <Link
                href={item.href!}
                className={cn(
                  'flex w-full flex-col items-center justify-center p-2 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.label === 'You' && userProfile ? (
                   <Avatar className={cn("w-7 h-7", isActive && "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background")}>
                      <AvatarImage src={userProfile.photoURL || undefined} />
                      <AvatarFallback>{userProfile.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <item.icon className="w-7 h-7" weight={isActive ? 'fill' : 'regular'} />
                )}
              </Link>
            </HoldHint>
          );
        })}
      </div>
    </div>
  );
}
