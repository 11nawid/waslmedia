'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppErrorState({
  badge,
  icon,
  title,
  description,
  primaryLabel,
  primaryHref,
  onPrimaryAction,
  secondaryLabel,
  secondaryHref,
  onSecondaryAction,
  className,
}: {
  badge: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref?: string;
  onPrimaryAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryAction?: () => void;
  className?: string;
}) {
  const primaryButton = (
    <Button className="rounded-full px-6 py-6 text-sm font-semibold" onClick={onPrimaryAction}>
      {primaryLabel}
    </Button>
  );

  const secondaryButton = secondaryLabel ? (
    <Button
      variant="outline"
      className="rounded-full px-6 py-6 text-sm font-semibold"
      onClick={onSecondaryAction}
    >
      {secondaryLabel}
    </Button>
  ) : null;

  return (
    <div className={cn('mx-auto flex min-h-full w-full max-w-4xl items-center justify-center px-6 py-12 md:px-8', className)}>
      <div className="w-full max-w-3xl text-center">
        <div className="inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {badge}
        </div>
        <div className="mt-5 flex justify-center text-muted-foreground/75">{icon}</div>
        <div className="mt-6 space-y-3">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">{title}</h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {primaryHref ? <Button asChild className="rounded-full px-6 py-6 text-sm font-semibold"><Link href={primaryHref}>{primaryLabel}</Link></Button> : primaryButton}
          {secondaryLabel
            ? secondaryHref
              ? <Button asChild variant="outline" className="rounded-full px-6 py-6 text-sm font-semibold"><Link href={secondaryHref}>{secondaryLabel}</Link></Button>
              : secondaryButton
            : null}
        </div>
      </div>
    </div>
  );
}
