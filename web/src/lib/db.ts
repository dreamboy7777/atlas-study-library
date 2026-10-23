import { mkdirSync } from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;
type Handle = {
  kind: "pglite" | "postgres";
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>;
};

const g = globalThis as typeof globalThis & { __studyhubDb?: Promise<Handle> };

async function connect(): Promise<Handle> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Client } = await import("pg");
    const local = url.includes("localhost") || url.includes("127.0.0.1");
    const client = new Client({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
    });
    await client.connect();
    return {
      kind: "postgres",
      query: (sql, params) => client.query(sql, params as unknown[]) as Promise<{ rows: Row[] }>,
    };
  }

  const dir = path.join(process.cwd(), ".data", "pg");
  mkdirSync(dir, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(dir);
  await db.waitReady;
  return {
    kind: "pglite",
    query: (sql, params) => db.query(sql, params as unknown[]) as unknown as Promise<{ rows: Row[] }>,
  };
}

/** Lazily opened, process-wide connection. One instance per dev server. */
export function getDb() {
  if (!g.__studyhubDb) g.__studyhubDb = connect();
  return g.__studyhubDb;
}

export async function q<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.query(sql, params);
  return res.rows as T[];
}
