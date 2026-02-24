/**
 * Twitter/X handles to scrape for viral content patterns.
 * Add handles WITHOUT the @ symbol.
 */
export const CREATORS: string[] = [
  "fyreinteractive",
  "adriansolarzz",
  "alexxgrowth",
  "danvsI",
  "iamshackelford",
];

if (CREATORS.length === 0) {
  console.warn(
    "[config] No creators configured. Edit src/config/creators.ts to add Twitter handles."
  );
}
