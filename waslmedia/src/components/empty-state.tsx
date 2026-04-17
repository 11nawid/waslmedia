'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-6 text-center',
        compact ? 'py-12' : 'py-20',
        className
      )}
    >
      <Icon className={cn('mb-4 text-muted-foreground/70', compact ? 'h-7 w-7' : 'h-9 w-9')} />
      <h2 className={cn('max-w-xl font-semibold tracking-tight text-foreground', compact ? 'text-xl' : 'text-[2rem]')}>
        {title}
      </h2>
      <p className={cn('mt-2 max-w-xl text-muted-foreground', compact ? 'text-sm leading-6' : 'text-[1.02rem] leading-8')}>
        {description}
      </p>
      {actionLabel && (actionHref || onAction) ? (
        <div className="mt-6">
          {actionHref ? (
            <Button asChild variant="outline" className="rounded-full px-5">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button variant="outline" className="rounded-full px-5" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
