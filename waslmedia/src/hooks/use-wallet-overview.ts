'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { WalletOverview, WalletTransaction } from '@/lib/ads/types';
import { getWalletOverviewClient, type WalletSyncDetail, WALLET_SYNC_EVENT } from '@/lib/wallet/client';

const emptyWalletOverview: WalletOverview = {
  balancePaise: 0,
  totalCreditedPaise: 0,
  totalDebitedPaise: 0,
  transactions: [],
  trend: [],
};

type WalletOverviewState = {
  overview: WalletOverview;
  loading: boolean;
  loaded: boolean;
  refresh: () => Promise<void>;
  applyOverview: (overview: WalletOverview) => void;
  applyTransaction: (input: {
    transaction: WalletTransaction;
    balancePaise: number;
    totalCreditedDeltaPaise?: number;
    totalDebitedDeltaPaise?: number;
  }) => void;
};

function buildTrend(transactions: WalletTransaction[]) {
  return [...transactions]
    .reverse()
    .slice(-8)
    .map((transaction) => ({
      label: new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      balancePaise: transaction.balanceAfterPaise,
      changePaise: transaction.type === 'credit' ? transaction.amountPaise : -transaction.amountPaise,
      createdAt: transaction.createdAt,
    }));
}

const useWalletOverviewStore = create<WalletOverviewState>((set) => ({
  overview: emptyWalletOverview,
  loading: false,
  loaded: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const overview = await getWalletOverviewClient();
      set({ overview, loaded: true, loading: false });
    } catch {
      set({ overview: emptyWalletOverview, loaded: true, loading: false });
    }
  },
  applyOverview: (overview) => set({ overview, loaded: true }),
  applyTransaction: (input) =>
    set((state) => {
      const dedupedTransactions = state.overview.transactions.filter(
        (item) =>
          !(
            item.referenceType === input.transaction.referenceType &&
            item.referenceId === input.transaction.referenceId &&
            item.type === input.transaction.type
          )
      );
      const transactions = [input.transaction, ...dedupedTransactions].slice(0, 12);
      return {
        overview: {
          ...state.overview,
          balancePaise: input.balancePaise,
          totalCreditedPaise: state.overview.totalCreditedPaise + (input.totalCreditedDeltaPaise || 0),
          totalDebitedPaise: state.overview.totalDebitedPaise + (input.totalDebitedDeltaPaise || 0),
          transactions,
          trend: buildTrend(transactions),
        },
        loaded: true,
      };
    }),
}));

export function useWalletOverview(enabled = true) {
  const overview = useWalletOverviewStore((state) => state.overview);
  const loading = useWalletOverviewStore((state) => state.loading);
  const loaded = useWalletOverviewStore((state) => state.loaded);
  const refresh = useWalletOverviewStore((state) => state.refresh);
  const applyOverview = useWalletOverviewStore((state) => state.applyOverview);
  const applyTransaction = useWalletOverviewStore((state) => state.applyTransaction);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!loaded && !loading) {
      void refresh();
    }

    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<WalletSyncDetail | undefined>).detail;
      if (!detail) {
        return;
      }

      if (detail.type === 'overview') {
        applyOverview(detail.overview);
        return;
      }

      applyTransaction({
        transaction: detail.transaction,
        balancePaise: detail.balancePaise,
        totalCreditedDeltaPaise: detail.totalCreditedDeltaPaise,
        totalDebitedDeltaPaise: detail.totalDebitedDeltaPaise,
      });
    };

    window.addEventListener(WALLET_SYNC_EVENT, handleSync);
    return () => {
      window.removeEventListener(WALLET_SYNC_EVENT, handleSync);
    };
  }, [applyOverview, applyTransaction, enabled, loaded, loading, refresh]);

  return {
    overview,
    loading,
    loaded,
    refresh,
  };
}
