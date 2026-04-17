
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlaySquare, BarChart, MessageCircle, Brush } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';

const navItems = [
    { href: '/studio/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/studio/upload', label: 'Content', icon: PlaySquare },
    { href: '/studio/analytics', label: 'Analytics', icon: BarChart },
    { href: '/studio/community', label: 'Community', icon: MessageCircle },
    { href: '/studio/customisation', label: 'Customise', icon: Brush },
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

export function StudioBottomNav() {
  const pathname = usePathname() || '';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <HoldHint key={item.href} label={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs text-muted-foreground transition-colors',
                  isActive && 'bg-secondary text-foreground'
                )}
              >
                  <item.icon className={cn("h-5 w-5", isActive && "text-foreground")} />
                  <span className={cn("text-[10px]", isActive && "text-foreground")}>{item.label}</span>
              </Link>
            </HoldHint>
          );
        })}
      </div>
    </div>
  );
}
