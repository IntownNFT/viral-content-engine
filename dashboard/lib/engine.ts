import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

// Resolve the project root (one level up from dashboard/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// Load .env from the project root explicitly (don't rely on cwd)
dotenvConfig({ path: path.join(PROJECT_ROOT, ".env") });

// Temporarily switch cwd so the engine's getDataRoot() finds the project
const originalCwd = process.cwd();
process.chdir(PROJECT_ROOT);

import { loadConfig, getDataRoot, APP_DIR } from "../../src/utils/config.js";
loadConfig();

// Capture the resolved data root while cwd is correct, then restore
const DATA_ROOT = getDataRoot();
const OUTPUT = path.join(DATA_ROOT, "output");

// Restore original cwd so Tailwind/PostCSS/Next.js work correctly
process.chdir(originalCwd);

// Re-export engine functions
export { loadLatestAbVariations, loadLatestScrapedData, loadAllSelfTweets, loadPerformanceData } from "../../src/utils/storage.js";
export { loadCreators, followCreator, unfollowCreator } from "../../src/config/creator-manager.js";
export { loadSoul, saveSoul } from "../../src/config/soul.js";
export { logFeedback } from "../../src/utils/feedback.js";
export { scrapeCreators, scrapeSelf } from "../../src/scraper/twitter.js";
export { scrapeTrends } from "../../src/scraper/trends.js";
export { generateTweets } from "../../src/generator/tweets.js";
export { generateBlog } from "../../src/generator/blogs.js";
export { generateReels } from "../../src/generator/reels.js";
export { runLearnPass } from "../../src/generator/learn.js";
export { runResearch, followThread } from "../../src/research/research.js";
export { getHeartbeatStatus, heartbeatCheck, markTaskComplete } from "../../src/utils/heartbeat.js";
export { CONTENT_PILLARS } from "../../src/config/prompts.js";
export { log } from "../../src/utils/logger.js";
export { APP_DIR, getMyHandle } from "../../src/utils/config.js";
export { trackPerformance } from "../../src/utils/performance.js";

export function getOutputDir(): string {
  return OUTPUT;
}

export function getEngineDataRoot(): string {
  return DATA_ROOT;
}

export async function getFiles(type: string): Promise<{ name: string; content: string }[]> {
  const dir = path.join(OUTPUT, type);
  try {
    const files = (await fs.readdir(dir))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    const results = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      results.push({ name: file, content });
    }
    return results;
  } catch {
    return [];
  }
}
