'use client';

import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStrictDesktopAccess } from '@/hooks/use-strict-desktop-access';
import { useWalletOverview } from '@/hooks/use-wallet-overview';
import { useWalletWindowStore } from '@/hooks/use-wallet-window-store';
import { cn } from '@/lib/utils';

function formatCurrencyFromPaise(value: number) {
  return `Rs ${(value / 100).toLocaleString('en-IN')}`;
}

export function WalletTriggerButton({
  enabled = true,
  className,
}: {
  enabled?: boolean;
  className?: string;
}) {
  const strictDesktop = useStrictDesktopAccess(enabled);
  const openWallet = useWalletWindowStore((state) => state.openWallet);
  const { overview } = useWalletOverview(strictDesktop);

  if (!strictDesktop) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className={cn(
        'rounded-full border-border/70 bg-background/80 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/70',
        className
      )}
      onClick={openWallet}
    >
      <Wallet className="mr-2 h-4 w-4" />
      <span>Wallet</span>
      <span className="ml-3 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
        {formatCurrencyFromPaise(overview.balancePaise)}
      </span>
    </Button>
  );
}
