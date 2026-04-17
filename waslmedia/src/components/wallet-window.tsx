'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowUpRight, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useStrictDesktopAccess } from '@/hooks/use-strict-desktop-access';
import { useWalletOverview } from '@/hooks/use-wallet-overview';
import { useWalletWindowStore } from '@/hooks/use-wallet-window-store';
import { cn } from '@/lib/utils';

const DESKTOP_WIDTH = 430;
const DESKTOP_HEIGHT = 620;

function formatCurrencyFromPaise(value: number) {
  return `Rs ${(value / 100).toLocaleString('en-IN')}`;
}

function formatWalletTransactionTitle(referenceType: string, notes: string | null) {
  if (referenceType === 'ad_campaign_delete_refund') {
    return 'Refund added to wallet';
  }
  if (referenceType === 'ad_order_wallet_debit') {
    return 'Wallet used for ad payment';
  }
  return notes || 'Wallet activity';
}

function clampPosition(x: number, y: number) {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  const maxX = Math.max(16, window.innerWidth - DESKTOP_WIDTH - 16);
  const maxY = Math.max(16, window.innerHeight - DESKTOP_HEIGHT - 16);

  return {
    x: Math.min(Math.max(16, x), maxX),
    y: Math.min(Math.max(16, y), maxY),
  };
}

export function WalletWindow() {
  const { userProfile } = useAuth();
  const isDesktop = useStrictDesktopAccess(true);
  const isOpen = useWalletWindowStore((state) => state.isOpen);
  const position = useWalletWindowStore((state) => state.position);
  const focusedAt = useWalletWindowStore((state) => state.focusedAt);
  const closeWallet = useWalletWindowStore((state) => state.closeWallet);
  const setPosition = useWalletWindowStore((state) => state.setPosition);
  const { overview } = useWalletOverview(isDesktop && isOpen);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!userProfile && isOpen) {
      closeWallet();
    }
  }, [closeWallet, isOpen, userProfile]);

  useEffect(() => {
    if (!isDesktop && isOpen) {
      closeWallet();
    }
  }, [closeWallet, isDesktop, isOpen]);

  useEffect(() => {
    if (!isDesktop || !isOpen || position) {
      return;
    }

    setPosition(
      clampPosition(
        (typeof window !== 'undefined' ? window.innerWidth : DESKTOP_WIDTH) - DESKTOP_WIDTH - 24,
        92
      )
    );
  }, [isDesktop, isOpen, position, setPosition]);

  const bars = useMemo(() => {
    const trend = overview.trend.slice(-8);
    const maxValue = Math.max(1, ...trend.map((point) => point.balancePaise));
    return trend.map((point, index) => ({
      ...point,
      heightPercent: Math.max(14, Math.round((point.balancePaise / maxValue) * 100)),
      active: index === trend.length - 1,
    }));
  }, [overview.trend]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktop) {
      return;
    }

    const basePosition =
      position ??
      clampPosition(
        (typeof window !== 'undefined' ? window.innerWidth : DESKTOP_WIDTH) - DESKTOP_WIDTH - 24,
        92
      );

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - basePosition.x,
      offsetY: event.clientY - basePosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    setPosition(
      clampPosition(
        event.clientX - dragStateRef.current.offsetX,
        event.clientY - dragStateRef.current.offsetY
      )
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const stopHeaderDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  if (!userProfile || !isDesktop || !isOpen) {
    return null;
  }

  const windowStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${DESKTOP_WIDTH}px`,
        height: `${DESKTOP_HEIGHT}px`,
      }
    : {
        right: '24px',
        top: '92px',
        width: `${DESKTOP_WIDTH}px`,
        height: `${DESKTOP_HEIGHT}px`,
      };

  return (
    <div className="pointer-events-none fixed inset-0 z-[85]">
      <div
        className="pointer-events-auto fixed overflow-hidden rounded-[34px] border border-sky-400/20 bg-[linear-gradient(180deg,rgba(7,18,35,0.98)_0%,rgba(4,10,22,0.98)_100%)] text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{ ...windowStyle, zIndex: focusedAt ? 85 : 84 }}
      >
        <div
          className="flex cursor-grab items-center justify-between border-b border-white/10 px-5 py-4 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#2152ff_0%,#1b2d46_100%)] shadow-[0_0_24px_rgba(33,82,255,0.3)]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/55">Wallet</p>
              <p className="text-xs text-white/70">Shared across app and Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              onPointerDown={stopHeaderDrag}
              onClick={(event) => {
                event.stopPropagation();
                closeWallet();
              }}
              title="Close wallet"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100%-76px)] min-h-0 flex-col overflow-hidden">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="relative overflow-hidden rounded-[30px] border border-sky-400/20 bg-[radial-gradient(circle_at_top_left,rgba(40,95,255,0.45),transparent_35%),linear-gradient(180deg,#0f2749_0%,#050c1a_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/65">Your Balance</p>
                  <p className="mt-2 text-5xl font-black tracking-tight">{formatCurrencyFromPaise(overview.balancePaise)}</p>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                  Wallet
                </div>
              </div>

              <div className="mt-5 flex items-end gap-2 rounded-[24px] bg-black/25 px-4 pb-4 pt-6">
                {bars.length > 0 ? (
                  bars.map((bar) => (
                    <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div
                        className={cn(
                          'w-full rounded-full bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]',
                          bar.active &&
                            'bg-[linear-gradient(180deg,rgba(93,176,255,0.95)_0%,rgba(27,90,255,0.9)_100%)] shadow-[0_0_22px_rgba(52,140,255,0.35)]'
                        )}
                        style={{ height: `${bar.heightPercent}%` }}
                      />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{bar.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-[20px] border border-dashed border-white/15 bg-white/5 text-sm text-white/55">
                    No wallet graph yet
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Available',
                  value: formatCurrencyFromPaise(overview.balancePaise),
                  tone: 'from-sky-500/20 to-sky-400/5',
                },
                {
                  label: 'Credited',
                  value: formatCurrencyFromPaise(overview.totalCreditedPaise),
                  tone: 'from-emerald-500/20 to-emerald-400/5',
                },
                {
                  label: 'Spent',
                  value: formatCurrencyFromPaise(overview.totalDebitedPaise),
                  tone: 'from-white/10 to-white/0',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'rounded-[24px] border border-white/10 bg-gradient-to-br p-4',
                    item.tone
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Recent activity</p>
                <p className="text-xs text-white/55">Refunds, wallet ad payments, and account balance changes.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                {overview.transactions.length} entries
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {overview.transactions.length > 0 ? (
                overview.transactions.map((transaction) => {
                  const positive = transaction.type === 'credit';
                  const campaignHref =
                    transaction.relatedCampaignId && transaction.referenceType === 'ad_campaign_delete_refund'
                      ? '/studio/ads?view=history'
                      : transaction.relatedCampaignId
                        ? '/studio/ads'
                        : null;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {formatWalletTransactionTitle(transaction.referenceType, transaction.notes)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">
                            {transaction.notes || 'Wallet activity from your ad account.'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-sm font-semibold', positive ? 'text-emerald-300' : 'text-white')}>
                            {positive ? '+' : '-'}
                            {formatCurrencyFromPaise(transaction.amountPaise)}
                          </p>
                          <p className="mt-1 text-[11px] text-white/45">
                            {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-white/50">
                          Balance after: <span className="font-medium text-white/80">{formatCurrencyFromPaise(transaction.balanceAfterPaise)}</span>
                        </p>
                        {campaignHref ? (
                          <Button asChild variant="ghost" className="h-8 rounded-full px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white">
                            <Link href={campaignHref}>
                              Open ad
                              <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center">
                  <p className="text-base font-semibold text-white">No wallet activity yet</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Refunds from deleted paid ad campaigns and wallet-based ad payments will show here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
