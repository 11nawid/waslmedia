'use client';

import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function AdvancedAnalyticsShell({
  backHref,
  title,
  subtitle,
  controls,
  children,
}: {
  backHref: string;
  title: string;
  subtitle: string;
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href={backHref}>
              <Menu className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold tracking-tight">{title}</p>
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href={backHref}>
            <X className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden h-full w-[320px] shrink-0 border-r border-border/70 bg-card/50 xl:flex xl:flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-4">{controls}</div>
          </ScrollArea>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-6 lg:px-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdvancedControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function AdvancedControlButton({
  label,
  value,
  onClick,
  active,
  icon,
}: {
  label: string;
  value: string;
  onClick: () => void;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border/70 bg-card/80 text-foreground hover:bg-secondary/60'
      )}
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <div className="ml-3 flex items-center gap-2 text-muted-foreground">
        {icon}
        <ChevronDown className="h-4 w-4" />
      </div>
    </button>
  );
}
