import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { dbPool } from '@/db/pool';
import type { UserNotificationSeverity, WalletHistoryPoint, WalletOverview, WalletTransaction } from '@/lib/ads/types';
import { createUserNotification } from '@/server/services/user-notifications';

type WalletTransactionType = 'credit' | 'debit';

interface WalletBalanceRow extends RowDataPacket {
  balance_paise: number;
}

interface WalletTransactionRow extends RowDataPacket {
  id: string;
  type: 'credit' | 'debit';
  amount_paise: number;
  balance_after_paise: number;
  reference_type: string;
  reference_id: string;
  related_campaign_id: string | null;
  notes: string | null;
  created_at: Date | string;
}

interface WalletTotalsRow extends RowDataPacket {
  total_credited_paise: number | null;
  total_debited_paise: number | null;
}

declare global {
  var __waslmediaWalletSchemaWarningShown: boolean | undefined;
}

function isWalletTableMissingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /user_ad_wallets|user_ad_wallet_transactions/i.test(message) && /doesn't exist|does not exist|ER_NO_SUCH_TABLE/i.test(message);
}

function warnWalletSchemaMissingOnce(error: unknown) {
  if (global.__waslmediaWalletSchemaWarningShown) {
    return;
  }

  global.__waslmediaWalletSchemaWarningShown = true;
  console.warn(
    'Ad wallet schema is not ready yet; defaulting wallet balance to 0 for this request.',
    error instanceof Error ? error.message : String(error)
  );
}

async function ensureWalletRow(connection: PoolConnection, userId: string) {
  await connection.query(
    `INSERT INTO user_ad_wallets (user_id, balance_paise)
     VALUES (?, 0)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    [userId]
  );
}

async function findWalletTransactionByReference(
  connection: PoolConnection,
  userId: string,
  referenceType: string,
  referenceId: string
) {
  const [rows] = await connection.query<WalletTransactionRow[]>(
    `SELECT amount_paise, balance_after_paise
     FROM user_ad_wallet_transactions
     WHERE user_id = ?
       AND reference_type = ?
       AND reference_id = ?
     LIMIT 1`,
    [userId, referenceType, referenceId]
  );

  return rows[0] || null;
}

export async function getUserAdWalletBalance(userId: string) {
  try {
    const [rows] = await dbPool.query<WalletBalanceRow[]>(
      `SELECT balance_paise
       FROM user_ad_wallets
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    return rows[0]?.balance_paise || 0;
  } catch (error) {
    if (isWalletTableMissingError(error)) {
      warnWalletSchemaMissingOnce(error);
      return 0;
    }

    throw error;
  }
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapWalletTransaction(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    type: row.type,
    amountPaise: row.amount_paise,
    balanceAfterPaise: row.balance_after_paise,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    relatedCampaignId: row.related_campaign_id,
    notes: row.notes,
    createdAt: toIso(row.created_at),
  };
}

export async function getUserAdWalletOverview(userId: string): Promise<WalletOverview> {
  try {
    const [balanceRows, totalRows, transactionRows] = await Promise.all([
      dbPool.query<WalletBalanceRow[]>(
        `SELECT balance_paise
         FROM user_ad_wallets
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
      ),
      dbPool.query<WalletTotalsRow[]>(
        `SELECT
          SUM(CASE WHEN type = 'credit' THEN amount_paise ELSE 0 END) AS total_credited_paise,
          SUM(CASE WHEN type = 'debit' THEN amount_paise ELSE 0 END) AS total_debited_paise
         FROM user_ad_wallet_transactions
         WHERE user_id = ?`,
        [userId]
      ),
      dbPool.query<WalletTransactionRow[]>(
        `SELECT id, type, amount_paise, balance_after_paise, reference_type, reference_id, related_campaign_id, notes, created_at
         FROM user_ad_wallet_transactions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 12`,
        [userId]
      ),
    ]);

    const balance = balanceRows[0][0]?.balance_paise || 0;
    const totals = totalRows[0][0];
    const transactions = transactionRows[0].map(mapWalletTransaction);
    const trend: WalletHistoryPoint[] = [...transactions]
      .reverse()
      .slice(-8)
      .map((transaction) => ({
        label: new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        balancePaise: transaction.balanceAfterPaise,
        changePaise: transaction.type === 'credit' ? transaction.amountPaise : -transaction.amountPaise,
        createdAt: transaction.createdAt,
      }));

    return {
      balancePaise: balance,
      totalCreditedPaise: Number(totals?.total_credited_paise || 0),
      totalDebitedPaise: Number(totals?.total_debited_paise || 0),
      transactions,
      trend,
    };
  } catch (error) {
    if (isWalletTableMissingError(error)) {
      warnWalletSchemaMissingOnce(error);
      return {
        balancePaise: 0,
        totalCreditedPaise: 0,
        totalDebitedPaise: 0,
        transactions: [],
        trend: [],
      };
    }

    throw error;
  }
}

export async function applyUserAdWalletTransaction(input: {
  userId: string;
  type: WalletTransactionType;
  amountPaise: number;
  referenceType: string;
  referenceId: string;
  relatedCampaignId?: string | null;
  notes?: string | null;
  connection?: PoolConnection | null;
  notification?:
    | {
        type?: 'wallet_credit';
        title: string;
        body: string;
        severity?: UserNotificationSeverity;
        ctaLabel?: string | null;
        ctaTarget?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | null;
}) {
  if (input.amountPaise <= 0) {
    return {
      applied: false,
      amountPaise: 0,
      balancePaise: await (input.connection ? Promise.resolve(0) : getUserAdWalletBalance(input.userId)),
    };
  }

  const ownConnection = !input.connection;
  const connection = input.connection || (await dbPool.getConnection());

  try {
    if (ownConnection) {
      await connection.beginTransaction();
    }

    const existing = await findWalletTransactionByReference(
      connection,
      input.userId,
      input.referenceType,
      input.referenceId
    );

    if (existing) {
      if (ownConnection) {
        await connection.commit();
      }

      return {
        applied: false,
        amountPaise: existing.amount_paise,
        balancePaise: existing.balance_after_paise,
      };
    }

    await ensureWalletRow(connection, input.userId);

    const [walletRows] = await connection.query<WalletBalanceRow[]>(
      `SELECT balance_paise
       FROM user_ad_wallets
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [input.userId]
    );

    const currentBalance = walletRows[0]?.balance_paise || 0;
    if (input.type === 'debit' && currentBalance < input.amountPaise) {
      throw new Error('USER_AD_WALLET_INSUFFICIENT_FUNDS');
    }

    const nextBalance =
      input.type === 'credit' ? currentBalance + input.amountPaise : currentBalance - input.amountPaise;

    await connection.query(
      `UPDATE user_ad_wallets
       SET balance_paise = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [nextBalance, input.userId]
    );

    await connection.query(
      `INSERT INTO user_ad_wallet_transactions (
        id, user_id, type, amount_paise, balance_after_paise, reference_type, reference_id, related_campaign_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.userId,
        input.type,
        input.amountPaise,
        nextBalance,
        input.referenceType,
        input.referenceId,
        input.relatedCampaignId || null,
        input.notes || null,
      ]
    );

    if (ownConnection) {
      await connection.commit();
    }

    if (input.notification && input.type === 'credit') {
      try {
        await createUserNotification({
          userId: input.userId,
          type: input.notification.type || 'wallet_credit',
          title: input.notification.title,
          body: input.notification.body,
          severity: input.notification.severity || 'success',
          relatedCampaignId: input.relatedCampaignId || null,
          ctaLabel: input.notification.ctaLabel || null,
          ctaTarget: input.notification.ctaTarget || null,
          metadata: input.notification.metadata || null,
        });
      } catch (notificationError) {
        console.warn(
          'Wallet credit notification could not be created.',
          notificationError instanceof Error ? notificationError.message : String(notificationError)
        );
      }
    }

    return {
      applied: true,
      amountPaise: input.amountPaise,
      balancePaise: nextBalance,
    };
  } catch (error) {
    if (isWalletTableMissingError(error)) {
      if (ownConnection) {
        await connection.rollback();
      }
      throw new Error('USER_AD_WALLET_UNAVAILABLE');
    }

    if (ownConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownConnection) {
      connection.release();
    }
  }
}
