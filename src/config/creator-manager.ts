import fs from "fs/promises";
import path from "path";
import { APP_DIR } from "../utils/config.js";
import { log } from "../utils/logger.js";

const CREATORS_FILE = path.join(APP_DIR, "creators.json");

// Hardcoded defaults (migrated from creators.ts)
const DEFAULT_CREATORS: string[] = [
  "fyreinteractive",
  "adriansolarzz",
  "alexxgrowth",
  "danvsI",
  "iamshackelford",
];

async function ensureFile(): Promise<void> {
  try {
    await fs.access(CREATORS_FILE);
  } catch {
    await fs.mkdir(path.dirname(CREATORS_FILE), { recursive: true });
    await fs.writeFile(CREATORS_FILE, JSON.stringify(DEFAULT_CREATORS, null, 2));
  }
}

export async function loadCreators(): Promise<string[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(CREATORS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Fall back to defaults
  }
  return [...DEFAULT_CREATORS];
}

async function saveCreators(creators: string[]): Promise<void> {
  await fs.mkdir(path.dirname(CREATORS_FILE), { recursive: true });
  await fs.writeFile(CREATORS_FILE, JSON.stringify(creators, null, 2));
}

export async function followCreator(handle: string): Promise<void> {
  const clean = handle.replace(/^@/, "").trim().toLowerCase();
  if (!clean) {
    log.error("Please provide a valid handle");
    return;
  }

  const creators = await loadCreators();
  if (creators.includes(clean)) {
    log.warn(`@${clean} is already in your creator list`);
    return;
  }

  creators.push(clean);
  await saveCreators(creators);
  log.success(`Added @${clean} — now following ${creators.length} creator(s)`);
}

export async function unfollowCreator(handle: string): Promise<void> {
  const clean = handle.replace(/^@/, "").trim().toLowerCase();
  if (!clean) {
    log.error("Please provide a valid handle");
    return;
  }

  const creators = await loadCreators();
  const idx = creators.indexOf(clean);
  if (idx === -1) {
    log.warn(`@${clean} is not in your creator list`);
    return;
  }

  creators.splice(idx, 1);
  await saveCreators(creators);
  log.success(`Removed @${clean} — now following ${creators.length} creator(s)`);
}

export async function listCreators(): Promise<void> {
  const creators = await loadCreators();
  if (creators.length === 0) {
    console.log("No creators configured. Run: viral-engine follow @handle");
    return;
  }
  console.log(`\nFollowing ${creators.length} creator(s):\n`);
  for (const c of creators) {
    console.log(`  @${c}`);
  }
  console.log("");
}
