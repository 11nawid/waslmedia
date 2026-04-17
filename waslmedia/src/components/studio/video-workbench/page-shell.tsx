'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function WorkbenchPageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function WorkbenchSurface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('self-start overflow-hidden rounded-[28px] border-border/70 bg-card/70 shadow-sm', className)}>
      {children}
    </Card>
  );
}

export function WorkbenchPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <WorkbenchSurface>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This area is ready inside the dedicated video workspace, and the next improvement can add deeper tooling here
        without breaking the Studio layout.
      </CardContent>
    </WorkbenchSurface>
  );
}
