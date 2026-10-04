/**
 * Minimal database port so services are decoupled from `pg` and can be exercised
 * against an in-process Postgres (PGlite) in tests. All values returned in `rows`
 * are the driver's native representation (bigint/numeric may arrive as strings).
 */
export interface DbQueryResult<T> {
  rows: T[];
}

export interface Db {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<DbQueryResult<T>>;
  /** Runs `fn` inside a single database transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}
