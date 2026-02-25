# Viral Content Engine

Automated content generation pipeline that scrapes viral tweets and generates original content using Claude AI.

**Core thesis:** Going viral is about output volume, not ad spend or video quality. Post more, clip more, repurpose more.

## What It Does

1. **Scrapes** tweets from top creators using Playwright (headless browser)
2. **Scrapes** trending topics from X for timely hooks
3. **Analyzes** engagement metrics and viral patterns
4. **Generates** three types of original content daily using Claude AI:
   - **10 tweets** — punchy, contrarian, action-oriented
   - **1 blog article** — 800-1200 words, SEO-friendly
   - **5 reel/TikTok scripts** — 30-60 second HOOK/BODY/CTA format
5. **A/B variations** — optionally generates 3 versions of each tweet (original + 2 hooks)
6. **Serves** a web dashboard to browse, compare, and copy generated content

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
# Full pipeline (scrape + trends + generate)
viral-engine daily

# Full pipeline with A/B tweet variations
viral-engine daily --ab

# Scrape tweets from configured creators
viral-engine scrape

# Scrape trending topics from X
viral-engine trends

# Generate content from latest scraped data
viral-engine generate

# Generate content with A/B tweet variations
viral-engine generate --ab

# Launch web dashboard at localhost:3333
viral-engine view

# Show help
viral-engine --help
```

### Creator Management

Manage which Twitter/X creators are scraped — no need to edit source code.

```bash
# Add a creator
viral-engine follow @garyvee

# Remove a creator
viral-engine unfollow @garyvee

# List all followed creators
viral-engine following
```

Creators are stored in `~/.viral-engine/creators.json`. On first run, defaults to a built-in starter list.

### A/B Tweet Variations

The `--ab` flag runs a second pass that generates two alternative versions of each tweet with different hooks and formats. Use it to pick the strongest version before posting.

```bash
viral-engine generate --ab
```

Variations are saved to:
- `output/tweets/YYYY-MM-DD_ab-variations.md` (readable markdown)
- `data/ab-variations/YYYY-MM-DD.json` (structured data for the dashboard)

View them side-by-side in the web dashboard under the **A/B Tests** tab.

### Trending Topics

The `trends` command scrapes the X Explore page for up to 30 trending topics. These are automatically woven into tweet, blog, and reel generation as timely hooks.

```bash
viral-engine trends
```

The `daily` command runs trends automatically between scraping and generation. If trending scrape fails, the pipeline continues without it.

## Configuration

### Environment Variables

Set these in `~/.viral-engine/.env` or `.env` in your working directory:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key |
| `TWITTER_USERNAME` | No | X/Twitter username for scraping |
| `TWITTER_PASSWORD` | No | X/Twitter password for scraping |
| `CLAUDE_MODEL` | No | Model to use (default: `claude-sonnet-4-6`) |

## Web Dashboard

Run `viral-engine view` to start the dashboard at `http://localhost:3333`.

Features:
- Browse generated tweets, blogs, and reel scripts
- **A/B Tests tab** — 3-column grid comparing Original / Variation A / Variation B
- Copy any piece of content to clipboard
- Dark theme with organized tabs
- Markdown rendering

## Output Structure

Generated content is saved as markdown files:

```
~/.viral-engine/
├── data/
│   ├── scraped/          # Raw scraped tweet data (JSON)
│   ├── trends/           # Trending topics by date (JSON)
│   ├── ab-variations/    # A/B variation data by date (JSON)
│   └── history.json      # Pipeline run history
├── output/
│   ├── tweets/           # YYYY-MM-DD.md + YYYY-MM-DD_ab-variations.md
│   ├── blogs/            # YYYY-MM-DD.md
│   └── reels/            # YYYY-MM-DD.md
├── cookies/              # Saved browser sessions
└── creators.json         # Your followed creator list
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
