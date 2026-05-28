import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getDataRoot } from "../utils/config.js";

const CACHE_DIR = path.join(getDataRoot(), "data", "cache");
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function cacheKey(query: string, params: Record<string, unknown> = {}): string {
  const raw = `${query}|${JSON.stringify(params)}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

export async function cacheGet<T>(query: string, params: Record<string, unknown> = {}): Promise<T | null> {
  const key = cacheKey(query, params);
  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    // Expired — delete
    await fs.unlink(file).catch(() => {});
  } catch {
    // Cache miss
  }
  return null;
}

export async function cacheSet<T>(query: string, params: Record<string, unknown>, data: T, ttl = DEFAULT_TTL): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const key = cacheKey(query, params);
  const file = path.join(CACHE_DIR, `${key}.json`);
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
  await fs.writeFile(file, JSON.stringify(entry));
}

export async function cacheClear(): Promise<number> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    let cleared = 0;
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      await fs.unlink(path.join(CACHE_DIR, f));
      cleared++;
    }
    return cleared;
  } catch {
    return 0;
  }
}

export async function cachePrune(): Promise<number> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    let pruned = 0;
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const file = path.join(CACHE_DIR, f);
      try {
        const raw = await fs.readFile(file, "utf-8");
        const entry: CacheEntry<unknown> = JSON.parse(raw);
        if (Date.now() - entry.timestamp >= entry.ttl) {
          await fs.unlink(file);
          pruned++;
        }
      } catch {
        await fs.unlink(file).catch(() => {});
        pruned++;
      }
    }
    return pruned;
  } catch {
    return 0;
  }
}
