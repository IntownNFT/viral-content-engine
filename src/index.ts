#!/usr/bin/env node

import { loadConfig, initConfig, printMissingKeyMessage } from "./utils/config.js";
loadConfig();

import { createRequire } from "module";
import { log } from "./utils/logger.js";
import { loadLatestScrapedData, loadHistory, saveHistory } from "./utils/storage.js";
import { loadCreators, followCreator, unfollowCreator, listCreators } from "./config/creator-manager.js";
import { scrapeCreators, scrapeSelf } from "./scraper/twitter.js";
import { trackPerformance } from "./utils/performance.js";
import { scrapeTrends } from "./scraper/trends.js";
import { generateTweets } from "./generator/tweets.js";
import { generateBlog } from "./generator/blogs.js";
import { generateReels } from "./generator/reels.js";
import { runLearnPass } from "./generator/learn.js";
import { runResearch } from "./research/research.js";
import { heartbeatCheck, markTaskComplete, getHeartbeatStatus } from "./utils/heartbeat.js";

const hasFlag = (flag: string) => process.argv.includes(flag);

function getVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json");
  return pkg.version;
}

function printHelp() {
  console.log(`
Viral Content Engine v${getVersion()}
Scrape viral tweets & generate original content with Claude AI

Usage:
  viral-engine <command> [options]

Commands:
  scrape             Scrape tweets from configured creators
  generate           Generate content from latest scraped data
  daily              Full pipeline (scrape + trends + generate)
  trends             Scrape trending topics from X
  follow <@handle>   Add a creator to your follow list
  unfollow <@handle> Remove a creator from your follow list
  following          List all followed creators
  learn              Update soul.md style guide from recent feedback
  research <query>   Research a topic on X via API (multi-angle search)
  heartbeat          Check & run scheduled tasks (autonomous mode)
  view               Launch the web dashboard (localhost:3333)
  init               Create config file at ~/.viral-engine/.env

Options:
  --ab               Generate A/B tweet variations (use with generate or daily)
  --quick            Research: fewer results, longer cache
  --help, -h         Show this help message
  --version, -v      Show version number

Setup:
  1. Run: viral-engine init
  2. Add your ANTHROPIC_API_KEY to ~/.viral-engine/.env
  3. (Optional) Add X_BEARER_TOKEN for API-based research
  4. (Optional) Add Twitter credentials for Playwright scraping
  5. Install browsers: npx playwright install chromium
  6. Run: viral-engine daily

Docs: https://github.com/IntownNFT/viral-content-engine
`);
}

async function scrape() {
  const creators = await loadCreators();
  log.info(`Scraping ${creators.length} creator(s)...`);
  await scrapeCreators(creators);

  // Self-scrape (non-blocking — failure won't stop the pipeline)
  try {
    await scrapeSelf();
  } catch (e) {
    log.warn(`Self-scrape failed (continuing): ${e instanceof Error ? e.message : e}`);
  }

  // Track performance of generated → posted tweets
  try {
    await trackPerformance();
  } catch (e) {
    log.warn(`Performance tracking failed (continuing): ${e instanceof Error ? e.message : e}`);
  }

  const history = await loadHistory();
  history.lastScrape = new Date().toISOString();
  await saveHistory(history);

  log.success("Scrape complete");
}

async function generate() {
  if (!process.env.ANTHROPIC_API_KEY) {
    printMissingKeyMessage();
    process.exit(1);
  }

  const abTest = hasFlag("--ab");
  const scraped = await loadLatestScrapedData();
  log.info(`Loaded scraped data for ${scraped.length} creator(s)`);

  await generateTweets(scraped, { abTest });
  await generateBlog(scraped);
  await generateReels(scraped);

  const history = await loadHistory();
  history.lastGenerate = new Date().toISOString();
  await saveHistory(history);

  log.success("All content generated — check output/ folder");

  // Auto-learn from feedback after generating
  try {
    await runLearnPass();
  } catch (e) {
    log.warn(`Auto-learn skipped: ${e instanceof Error ? e.message : e}`);
  }
}

async function daily() {
  log.info("=== Daily Pipeline Start ===");
  await scrape();

  // Scrape trends (non-blocking — failure won't stop the pipeline)
  try {
    await scrapeTrends();
  } catch (e) {
    log.warn(`Trends scrape failed (continuing): ${e instanceof Error ? e.message : e}`);
  }

  await generate();
  log.info("=== Daily Pipeline Complete ===");
}

// ---- CLI ----

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case "--help":
  case "-h":
    printHelp();
    break;
  case "--version":
  case "-v":
    console.log(getVersion());
    break;
  case "init":
    initConfig().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "scrape":
    scrape().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "generate":
    generate().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "daily":
    daily().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "trends":
    scrapeTrends().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "follow":
    if (!arg) {
      log.error("Usage: viral-engine follow @handle");
      process.exit(1);
    }
    followCreator(arg).catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "unfollow":
    if (!arg) {
      log.error("Usage: viral-engine unfollow @handle");
      process.exit(1);
    }
    unfollowCreator(arg).catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "following":
    listCreators().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "learn":
    runLearnPass().catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "research": {
    const query = process.argv.slice(3).filter((a) => !a.startsWith("--")).join(" ");
    if (!query) {
      log.error('Usage: viral-engine research "your topic"');
      process.exit(1);
    }
    runResearch(query, { quick: hasFlag("--quick") }).then((result) => {
      console.log(result.briefing);
    }).catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  }
  case "heartbeat":
    heartbeatCheck().then(async ({ readyTasks, state }) => {
      if (readyTasks.length === 0) {
        log.info("No tasks due right now");
        const status = await getHeartbeatStatus();
        for (const t of status.tasks) {
          log.info(`  ${t.name}: last run ${t.lastRun || "never"}, window ${t.nextWindow}, ${t.isDue ? "DUE" : "ok"}`);
        }
        return;
      }
      for (const task of readyTasks) {
        log.info(`Running scheduled task: ${task.name}`);
        try {
          switch (task.name) {
            case "daily": await daily(); break;
            case "trends": await scrapeTrends(); break;
            case "learn": await runLearnPass(); break;
            default: log.warn(`Unknown task: ${task.name}`);
          }
          await markTaskComplete(task.name);
          log.success(`Completed: ${task.name}`);
        } catch (e) {
          log.error(`Task ${task.name} failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }).catch((e) => {
      log.error(e.message);
      process.exit(1);
    });
    break;
  case "view": {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const dashboardDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "dashboard");
    console.log("\n  Starting dashboard at http://localhost:3333\n");
    spawn("npx", ["next", "dev", "--port", "3333"], { cwd: dashboardDir, stdio: "inherit", shell: true });
    break;
  }
  default:
    printHelp();
}
