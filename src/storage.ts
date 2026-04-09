import { isTauri } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

const DB_FILE = "sqlite:codeledger.db";

let db: Database | null = null;
let ready: Promise<void> | null = null;

/** Ensures SQLite table exists (Tauri) or no-op (browser). */
export async function initStorage(): Promise<void> {
  if (!isTauri()) return;
  if (db) return;
  if (!ready) {
    ready = (async () => {
      const instance = await Database.load(DB_FILE);
      await instance.execute(
        "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
      );
      db = instance;
    })();
  }
  await ready;
}

export async function load<T>(key: string, fallback: T): Promise<T> {
  await initStorage();
  if (isTauri() && db) {
    try {
      const rows = await db.select<{ value: string }[]>(
        "SELECT value FROM kv WHERE key = $1",
        [key]
      );
      if (!rows.length) return fallback;
      return JSON.parse(rows[0].value) as T;
    } catch {
      return fallback;
    }
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  await initStorage();
  if (isTauri() && db) {
    try {
      await db.execute(
        "INSERT OR REPLACE INTO kv (key, value) VALUES ($1, $2)",
        [key, json]
      );
    } catch (e) {
      console.error(e);
    }
    return;
  }
  try {
    localStorage.setItem(key, json);
  } catch (e) {
    console.error(e);
  }
}
