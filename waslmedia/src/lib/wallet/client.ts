import { apiGet, invalidateApiGet } from '@/lib/api/client';
import type { WalletOverview, WalletTransaction } from '@/lib/ads/types';

export const WALLET_SYNC_EVENT = 'waslmedia:wallet-sync';

export type WalletSyncDetail =
  | {
      type: 'overview';
      overview: WalletOverview;
    }
  | {
      type: 'transaction';
      transaction: WalletTransaction;
      balancePaise: number;
      totalCreditedDeltaPaise?: number;
      totalDebitedDeltaPaise?: number;
    };

export function emitWalletSync(detail?: WalletSyncDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<WalletSyncDetail | undefined>(WALLET_SYNC_EVENT, { detail }));
  }
  if (detail?.type === 'overview') {
    invalidateApiGet((key) => key.includes('/api/wallet'));
  }
}

export async function getWalletOverviewClient() {
  return apiGet<WalletOverview>('/api/wallet', { cache: 'no-store', progressMode: 'silent' });
}
