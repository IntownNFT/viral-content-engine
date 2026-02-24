#!/usr/bin/env node

import { loadConfig, initConfig, printMissingKeyMessage } from "./utils/config.js";
loadConfig();

import { createRequire } from "module";
import { log } from "./utils/logger.js";
import { loadLatestScrapedData, loadHistory, saveHistory } from "./utils/storage.js";
import { CREATORS } from "./config/creators.js";
import { scrapeCreators } from "./scraper/twitter.js";
import { generateTweets } from "./generator/tweets.js";
import { generateBlog } from "./generator/blogs.js";
import { generateReels } from "./generator/reels.js";

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
  viral-engine <command>

Commands:
  scrape       Scrape tweets from configured creators
  generate     Generate content from latest scraped data
  daily        Full pipeline (scrape + generate)
  view         Launch the web dashboard (localhost:3333)
  init         Create config file at ~/.viral-engine/.env

Options:
  --help, -h       Show this help message
  --version, -v    Show version number

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
  log.info(`Scraping ${CREATORS.length} creator(s)...`);
  await scrapeCreators(CREATORS);

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

  const scraped = await loadLatestScrapedData();
  log.info(`Loaded scraped data for ${scraped.length} creator(s)`);

  await generateTweets(scraped);
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
  await generate();
  log.info("=== Daily Pipeline Complete ===");
}

// ---- CLI ----

const command = process.argv[2];

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
  case "view": {
    // Dynamically import the server module
    import("./server.js");
    break;
  }
  default:
    printHelp();
}
