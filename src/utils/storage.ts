import fs from "fs/promises";
import path from "path";
import { log } from "./logger.js";
import { getDataRoot } from "./config.js";

const ROOT = getDataRoot();

export interface ScrapedTweet {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  hasMedia: boolean;
  timestamp: string;
  url: string;
}

export interface ScrapedData {
  handle: string;
  scrapedAt: string;
  tweets: ScrapedTweet[];
}

export interface History {
  generatedTweets: string[];
  generatedBlogs: string[];
  generatedReels: string[];
  lastScrape: string | null;
  lastGenerate: string | null;
}

function resolve(...segments: string[]) {
  return path.join(ROOT, ...segments);
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// ---- Scraped data ----

export async function saveScrapedData(data: ScrapedData) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve("data", "scraped");
  await ensureDir(dir);
  const file = path.join(dir, `${data.handle}_${date}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  log.success(`Saved scraped data → ${file}`);
}

export async function loadLatestScrapedData(): Promise<ScrapedData[]> {
  const dir = resolve("data", "scraped");
  await ensureDir(dir);

  const files = await fs.readdir(dir);
  if (files.length === 0) return [];

  // Group by handle, pick the most recent file per handle
  const byHandle = new Map<string, string>();
  for (const f of files.filter((f) => f.endsWith(".json"))) {
    const handle = f.split("_").slice(0, -1).join("_");
    const existing = byHandle.get(handle);
    if (!existing || f > existing) byHandle.set(handle, f);
  }

  const results: ScrapedData[] = [];
  for (const file of byHandle.values()) {
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    results.push(JSON.parse(raw));
  }
  return results;
}

// ---- History ----

const historyPath = () => resolve("data", "history.json");

export async function loadHistory(): Promise<History> {
  try {
    const raw = await fs.readFile(historyPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      generatedTweets: [],
      generatedBlogs: [],
      generatedReels: [],
      lastScrape: null,
      lastGenerate: null,
    };
  }
}

export async function saveHistory(history: History) {
  await fs.writeFile(historyPath(), JSON.stringify(history, null, 2));
}

// ---- Output (markdown) ----

export async function saveOutput(
  type: "tweets" | "blogs" | "reels",
  content: string,
  suffix = ""
) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve("output", type);
  await ensureDir(dir);
  const filename = suffix ? `${date}_${suffix}.md` : `${date}.md`;
  const file = path.join(dir, filename);
  await fs.writeFile(file, content);
  log.success(`Saved ${type} → ${file}`);
  return file;
}
