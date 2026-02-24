# Viral Content Engine

Automated content generation pipeline that scrapes viral tweets and generates original content using Claude AI.

**Core thesis:** Going viral is about output volume, not ad spend or video quality. Post more, clip more, repurpose more.

## What It Does

1. **Scrapes** tweets from top creators using Playwright (headless browser)
2. **Analyzes** engagement metrics and viral patterns
3. **Generates** three types of original content daily using Claude AI:
   - **10 tweets** — punchy, contrarian, action-oriented
   - **1 blog article** — 800-1200 words, SEO-friendly
   - **5 reel/TikTok scripts** — 30-60 second HOOK/BODY/CTA format
4. **Serves** a web dashboard to browse and copy generated content

## Installation

```bash
npm install -g viral-content-engine
```

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional) Twitter/X credentials for scraping

## Setup

```bash
# 1. Create config file
viral-engine init

# 2. Add your API key
# Edit ~/.viral-engine/.env and set ANTHROPIC_API_KEY

# 3. Install Playwright browsers
npx playwright install chromium
```

## Usage

```bash
# Scrape tweets from configured creators
viral-engine scrape

# Generate content from latest scraped data
viral-engine generate

# Full pipeline (scrape + generate)
viral-engine daily

# Launch web dashboard at localhost:3333
viral-engine view

# Show help
viral-engine --help

# Show version
viral-engine --version
```

## Configuration

### Environment Variables

Set these in `~/.viral-engine/.env` or `.env` in your working directory:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key |
| `TWITTER_USERNAME` | No | X/Twitter username for scraping |
| `TWITTER_PASSWORD` | No | X/Twitter password for scraping |
| `CLAUDE_MODEL` | No | Model to use (default: `claude-sonnet-4-6`) |

### Creator List

Edit `src/config/creators.ts` to configure which Twitter handles to scrape.

## Web Dashboard

Run `viral-engine view` to start the dashboard at `http://localhost:3333`.

Features:
- Browse generated tweets, blogs, and reel scripts
- Copy content to clipboard
- Dark theme with organized tabs
- Markdown rendering

## Output Structure

Generated content is saved as markdown files:

```
~/.viral-engine/
├── data/
│   ├── scraped/       # Raw scraped tweet data (JSON)
│   └── history.json   # Pipeline run history
├── output/
│   ├── tweets/        # YYYY-MM-DD.md
│   ├── blogs/         # YYYY-MM-DD.md
│   └── reels/         # YYYY-MM-DD.md
└── cookies/           # Saved browser sessions
```

## Troubleshooting

**"ANTHROPIC_API_KEY is not set"**
Run `viral-engine init` and add your key to `~/.viral-engine/.env`.

**"Browser not found" / Playwright errors**
Run `npx playwright install chromium` to install the browser.

**Twitter scraping fails**
- Check your credentials in `.env`
- Twitter may ask for verification — check the logs
- Cookies expire; delete `~/.viral-engine/cookies/` to force re-login

**Rate limiting**
The engine retries Claude API calls automatically with exponential backoff (up to 3 attempts).

## Development

```bash
# Clone the repo
git clone https://github.com/IntownNFT/viral-content-engine.git
cd viral-content-engine
npm install

# Run in dev mode
npm run daily

# Build
npm run build
```

## License

MIT — Dylan Worrall
