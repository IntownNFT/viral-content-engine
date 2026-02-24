import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { config as dotenvConfig } from "dotenv";

export const APP_DIR = path.join(os.homedir(), ".viral-engine");

/**
 * Determine the data root directory.
 * - If cwd has our package.json (dev mode), use cwd.
 * - Otherwise use ~/.viral-engine/ (global install).
 */
export function getDataRoot(): string {
  try {
    const pkg = path.join(process.cwd(), "package.json");
    const content = fsSync.readFileSync(pkg, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.name === "viral-content-engine") {
      return process.cwd();
    }
  } catch {
    // Not in project directory
  }
  return APP_DIR;
}

/**
 * Load .env from the first location found:
 * 1. cwd/.env
 * 2. ~/.viral-engine/.env
 */
export function loadConfig(): void {
  const cwdEnv = path.join(process.cwd(), ".env");
  const result = dotenvConfig({ path: cwdEnv });

  if (!result.error) return;

  const appEnv = path.join(APP_DIR, ".env");
  dotenvConfig({ path: appEnv });
}

/**
 * Create ~/.viral-engine/.env from template on first run.
 */
export async function initConfig(): Promise<void> {
  await fs.mkdir(APP_DIR, { recursive: true });

  const envPath = path.join(APP_DIR, ".env");
  try {
    await fs.access(envPath);
    console.log(`Config already exists at ${envPath}`);
    return;
  } catch {
    // Doesn't exist, create it
  }

  const template = `# Viral Content Engine Configuration
# Docs: https://github.com/IntownNFT/viral-content-engine

ANTHROPIC_API_KEY=
TWITTER_USERNAME=
TWITTER_PASSWORD=
CLAUDE_MODEL=claude-sonnet-4-6
`;

  await fs.writeFile(envPath, template);
  console.log(`Created config at ${envPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Add your ANTHROPIC_API_KEY to ${envPath}`);
  console.log(`  2. (Optional) Add Twitter credentials for scraping`);
  console.log(`  3. Install Playwright browsers: npx playwright install chromium`);
  console.log(`  4. Run: viral-engine daily`);
}

export function printMissingKeyMessage(): void {
  console.error(`\nError: ANTHROPIC_API_KEY is not set.\n`);
  console.error(`Set it in one of these locations:`);
  console.error(`  1. .env file in the current directory`);
  console.error(`  2. ~/.viral-engine/.env`);
  console.error(`\nRun 'viral-engine init' to create a config file.\n`);
}
