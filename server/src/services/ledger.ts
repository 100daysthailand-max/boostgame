import type { Db } from '../db/types.js';
import type { Asset, BcState, LedgerReason } from '../config/constants.js';

/**
 * Immutable ledger (spec 02 sections 1 & 4):
 * - every Coin/BC/Gem change writes one append-only ledger row,
 * - each reward operation carries a unique idempotency key,
 * - balances live in `wallets` and are updated atomically with the ledger row.
 */

export type WalletColumn = 'coin' | 'gem' | 'bc_available' | 'bc_locked' | 'bc_withheld';

export interface LedgerEntryInput {
  userId: string;
  asset: Asset;
  /** Signed integer amount: positive credits, negative debits. */
  amount: number;
  reason: LedgerReason;
  source: string;
  idempotencyKey: string;
  bcState?: BcState;
  metadata?: Record<string, unknown>;
}

export interface LedgerEntryResult {
  ledgerEntryId: string;
  balanceAfter: number;
  /** false when an entry with the same idempotency key already existed (no-op). */
  applied: boolean;
}

export class InsufficientBalanceError extends Error {
  readonly code = 'insufficient_balance';
  constructor() {
    super('insufficient_balance');
    this.name = 'InsufficientBalanceError';
  }
}

export function walletColumn(asset: Asset, bcState?: BcState): WalletColumn {
  if (asset === 'COIN') return 'coin';
  if (asset === 'GEM') return 'gem';
  switch (bcState) {
    case 'LOCKED':
      return 'bc_locked';
    case 'WITHHELD':
      return 'bc_withheld';
    default:
      return 'bc_available';
  }
}

interface ExistingRow {
  id: string;
  balance_after: string | number | null;
}

/**
 * Applies a single ledger entry inside the caller's transaction.
 * Safe to retry: a duplicate idempotency key returns the original result and
 * writes nothing.
 */
export async function applyLedgerEntry(tx: Db, input: LedgerEntryInput): Promise<LedgerEntryResult> {
  const existing = await tx.query<ExistingRow>(
    'SELECT id, balance_after FROM ledger_entries WHERE idempotency_key = $1',
    [input.idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0]!;
    return {
      ledgerEntryId: String(row.id),
      balanceAfter: Number(row.balance_after ?? 0),
      applied: false,
    };
  }

  const column = walletColumn(input.asset, input.bcState);

  const wallet = await tx.query<{ balance: string | number }>(
    `SELECT ${column} AS balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
    [input.userId],
  );
  if (wallet.rows.length === 0) {
    throw new Error(`wallet not found for user ${input.userId}`);
  }

  const current = Number(wallet.rows[0]!.balance);
  const next = current + input.amount;
  if (next < 0) throw new InsufficientBalanceError();

  await tx.query(
    `UPDATE wallets SET ${column} = $2, updated_at = now() WHERE user_id = $1`,
    [input.userId, next],
  );

  const inserted = await tx.query<{ id: string }>(
    `INSERT INTO ledger_entries
       (user_id, asset, bc_state, amount, reason, source, idempotency_key, balance_after, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING id`,
    [
      input.userId,
      input.asset,
      input.bcState ?? null,
      input.amount,
      input.reason,
      input.source,
      input.idempotencyKey,
      next,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return { ledgerEntryId: String(inserted.rows[0]!.id), balanceAfter: next, applied: true };
}

/** Reads the current wallet balances for a user. */
export async function getWallet(tx: Db, userId: string): Promise<Record<WalletColumn, number>> {
  const res = await tx.query<Record<WalletColumn, string | number>>(
    `SELECT coin, gem, bc_available, bc_locked, bc_withheld FROM wallets WHERE user_id = $1`,
    [userId],
  );
  const row = res.rows[0];
  return {
    coin: Number(row?.coin ?? 0),
    gem: Number(row?.gem ?? 0),
    bc_available: Number(row?.bc_available ?? 0),
    bc_locked: Number(row?.bc_locked ?? 0),
    bc_withheld: Number(row?.bc_withheld ?? 0),
  };
}
