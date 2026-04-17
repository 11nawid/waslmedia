'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';

export function PublicAppShell({
  children,
  mainClassName,
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={cn('flex-1 overflow-y-auto pb-20', mainClassName)}>{children}</main>
      </div>
    </div>
  );
}
