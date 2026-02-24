import { chromium, type BrowserContext } from "playwright";
import fs from "fs/promises";
import path from "path";
import { log } from "../utils/logger.js";
import { getDataRoot } from "../utils/config.js";

const COOKIES_DIR = path.join(getDataRoot(), "cookies");
const COOKIES_FILE = path.join(COOKIES_DIR, "twitter.json");

async function ensureCookiesDir() {
  await fs.mkdir(COOKIES_DIR, { recursive: true });
}

export async function saveCookies(context: BrowserContext) {
  await ensureCookiesDir();
  const cookies = await context.cookies();
  await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  log.info("Cookies saved");
}

export async function hasSavedCookies(): Promise<boolean> {
  try {
    await fs.access(COOKIES_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function createBrowserContext(): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  // Load saved cookies if available
  if (await hasSavedCookies()) {
    try {
      const raw = await fs.readFile(COOKIES_FILE, "utf-8");
      const cookies = JSON.parse(raw);
      await context.addCookies(cookies);
      log.info("Loaded saved cookies");
    } catch (e) {
      log.warn("Failed to load cookies, will need fresh login");
    }
  }

  return context;
}

export async function loginToTwitter(context: BrowserContext): Promise<boolean> {
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;

  if (!username || !password) {
    log.error("TWITTER_USERNAME and TWITTER_PASSWORD must be set in .env");
    return false;
  }

  const page = await context.newPage();

  try {
    log.info("Logging in to Twitter/X...");
    await page.goto("https://x.com/i/flow/login", { waitUntil: "networkidle" });

    // Enter username
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
    await page.fill('input[autocomplete="username"]', username);
    await page.click('button:has-text("Next")');

    // Sometimes Twitter asks for phone/email verification — handle the "unusual activity" step
    try {
      const verifyInput = await page.waitForSelector(
        'input[data-testid="ocfEnterTextTextInput"]',
        { timeout: 5000 }
      );
      if (verifyInput) {
        log.warn("Twitter is asking for additional verification (phone/email). Enter it in .env or handle manually.");
        await page.close();
        return false;
      }
    } catch {
      // No verification step, continue
    }

    // Enter password
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.fill('input[type="password"]', password);
    await page.click('button[data-testid="LoginForm_Login_Button"]');

    // Wait for redirect to home
    await page.waitForURL("https://x.com/home", { timeout: 15000 });
    log.success("Logged in to Twitter/X");

    await saveCookies(context);
    await page.close();
    return true;
  } catch (e) {
    log.error(`Login failed: ${e instanceof Error ? e.message : e}`);
    await page.close();
    return false;
  }
}

export async function ensureLoggedIn(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage();

  try {
    await page.goto("https://x.com/home", { waitUntil: "networkidle", timeout: 20000 });
    const url = page.url();
    await page.close();

    // If we weren't redirected away from home, cookies are valid
    if (url.includes("/home")) {
      log.info("Session is valid");
      return true;
    }
  } catch {
    await page.close();
  }

  log.warn("Session expired, logging in again...");
  return loginToTwitter(context);
}
