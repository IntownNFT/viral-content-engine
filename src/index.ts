#!/usr/bin/env node

import { loadConfig, initConfig, printMissingKeyMessage } from "./utils/config.js";
loadConfig();

import { createRequire } from "module";
import { log } from "./utils/logger.js";
import { loadLatestScrapedData, loadHistory, saveHistory } from "./utils/storage.js";
import { loadCreators, followCreator, unfollowCreator, listCreators } from "./config/creator-manager.js";
import { scrapeCreators } from "./scraper/twitter.js";
import { scrapeTrends } from "./scraper/trends.js";
import { generateTweets } from "./generator/tweets.js";
import { generateBlog } from "./generator/blogs.js";
import { generateReels } from "./generator/reels.js";

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
  view               Launch the web dashboard (localhost:3333)
  init               Create config file at ~/.viral-engine/.env

Options:
  --ab               Generate A/B tweet variations (use with generate or daily)
  --help, -h         Show this help message
  --version, -v      Show version number

Setup:
  1. Run: viral-engine init
  2. Add your ANTHROPIC_API_KEY to ~/.viral-engine/.env
  3. (Optional) Add Twitter credentials for scraping
  4. Install browsers: npx playwright install chromium
  5. Run: viral-engine daily

Docs: https://github.com/IntownNFT/viral-content-engine
`);
}

async function scrape() {
  const creators = await loadCreators();
  log.info(`Scraping ${creators.length} creator(s)...`);
  await scrapeCreators(creators);

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
  case "view": {
    // Dynamically import the server module
    import("./server.js");
    break;
  }
  default:
    printHelp();
}
