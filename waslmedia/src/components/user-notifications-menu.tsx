'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ADS_SYNC_EVENT } from '@/lib/ads/feed';
import type { UserNotification } from '@/lib/ads/types';
import {
  getUserNotificationDetailClient,
  getUserNotificationsClient,
  markUserNotificationReadClient,
} from '@/lib/notifications/client';
import { cn } from '@/lib/utils';
import { useWalletWindowStore } from '@/hooks/use-wallet-window-store';
import { WALLET_SYNC_EVENT } from '@/lib/wallet/client';

const WALLET_NOTIFICATION_TARGET = 'wallet://open';

function isWalletTarget(target: string | null | undefined) {
  return target === WALLET_NOTIFICATION_TARGET;
}

export function UserNotificationsMenu({
  enabled,
  buttonClassName,
}: {
  enabled: boolean;
  buttonClassName?: string;
}) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<UserNotification | null>(null);
  const openWallet = useWalletWindowStore((state) => state.openWallet);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const load = async () => {
      try {
        const payload = await getUserNotificationsClient();
        if (!active) {
          return;
        }
        setItems(payload.items);
        setUnreadCount(payload.unreadCount);
      } catch {
        if (active) {
          setItems([]);
          setUnreadCount(0);
        }
      }
    };

    void load();
    window.addEventListener(ADS_SYNC_EVENT, load);
    window.addEventListener(WALLET_SYNC_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(ADS_SYNC_EVENT, load);
      window.removeEventListener(WALLET_SYNC_EVENT, load);
    };
  }, [enabled]);

  const openNotification = async (notification: UserNotification) => {
    try {
      const payload = await getUserNotificationDetailClient(notification.id);
      const readPayload = notification.readAt ? null : await markUserNotificationReadClient(notification.id).catch(() => null);
      const next = readPayload?.notification || payload.notification;
      setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
      if (!notification.readAt) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      setSelected(next);
    } catch {
      setSelected(notification);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative rounded-full text-muted-foreground hover:text-foreground',
              buttonClassName
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {Math.min(unreadCount, 99)}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[380px] rounded-[24px] border-border/70 bg-popover/95 p-2">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">Wallet updates, ad review changes, and payment events.</p>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="items-start rounded-2xl px-3 py-3"
                  onSelect={(event) => {
                    event.preventDefault();
                    void openNotification(item);
                  }}
                >
                  <div className="flex w-full items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full',
                        item.severity === 'success' && 'bg-emerald-500',
                        item.severity === 'warning' && 'bg-amber-500',
                        item.severity === 'error' && 'bg-rose-500',
                        item.severity === 'info' && 'bg-sky-500'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        {!item.readAt ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">New</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-border/70 bg-secondary/15 p-4">
                <p className="text-sm leading-7 text-foreground">{selected.body}</p>
              </div>
              {selected.metadata ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(selected.metadata).map(([key, value]) => (
                    <div key={key} className="rounded-[20px] border border-border/70 bg-secondary/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="mt-2 break-words text-sm font-medium">{String(value || '—')}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {selected.ctaTarget ? (
                <div className="flex justify-end">
                  {isWalletTarget(selected.ctaTarget) ? (
                    <Button
                      className="rounded-full"
                      onClick={() => {
                        openWallet();
                        setSelected(null);
                      }}
                    >
                      {selected.ctaLabel || 'Open wallet'}
                    </Button>
                  ) : (
                    <Button asChild className="rounded-full">
                      <Link href={selected.ctaTarget}>{selected.ctaLabel || 'Open'}</Link>
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
