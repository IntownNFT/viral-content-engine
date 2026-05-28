import { generate } from "./claude.js";
import { loadSoul, saveSoul } from "../config/soul.js";
import { loadRecentFeedback } from "../utils/feedback.js";
import { loadAllSelfTweets } from "../utils/storage.js";
import { log } from "../utils/logger.js";

const LEARN_SYSTEM_PROMPT = `You are a writing style analyst. You will receive:
1. A user's current style guide (soul.md)
2. Recent feedback data — copies (content the user liked) and edits (original vs edited, showing preference diffs)
3. The user's own tweet performance data — their top and bottom performing tweets

Your job: Update the style guide based on ALL patterns. Rules:
- Copies = the user liked this content as-is. Note recurring themes, tones, formats.
- Edits = the user changed something. The diff reveals their preferences.
- Own tweets = analyze what works vs. what doesn't based on engagement. Note patterns in top performers (hooks, length, format, tone) and patterns in underperformers.
- Add new learnings to the "Learnings (auto-updated)" section
- You may also refine other sections if the feedback clearly supports it
- Keep the entire style guide under 500 words
- Preserve the markdown structure with # headers
- Return ONLY the updated style guide content, nothing else`;

export async function runLearnPass(): Promise<boolean> {
  const feedback = await loadRecentFeedback(7);

  if (feedback.length === 0) {
    log.info("No recent feedback — skipping learn pass");
    return false;
  }

  log.info(`Learning from ${feedback.length} feedback interaction(s)...`);

  const soul = await loadSoul();

  const copies = feedback.filter((f) => f.type === "copy");
  const edits = feedback.filter((f) => f.type === "edit");

  let feedbackSummary = "";

  if (copies.length > 0) {
    feedbackSummary += "## Copied content (user liked these):\n\n";
    for (const c of copies.slice(-20)) {
      feedbackSummary += `- [${c.contentType}] "${c.original.slice(0, 200)}"\n`;
    }
    feedbackSummary += "\n";
  }

  if (edits.length > 0) {
    feedbackSummary += "## Edited content (user changed these):\n\n";
    for (const e of edits.slice(-20)) {
      feedbackSummary += `Original: "${e.original.slice(0, 200)}"\nEdited to: "${(e.edited || "").slice(0, 200)}"\n\n`;
    }
  }

  // Own-tweet performance analysis
  let ownTweetSection = "";
  try {
    const selfTweets = await loadAllSelfTweets();
    if (selfTweets.length > 0) {
      const scored = selfTweets
        .map((t) => ({
          text: t.text,
          score: t.likes + t.retweets * 3 + t.replies * 2,
          likes: t.likes,
          retweets: t.retweets,
        }))
        .sort((a, b) => b.score - a.score);

      const topN = scored.slice(0, 10);
      const bottomN = scored.slice(-5).reverse();

      ownTweetSection += "\n\n## Own tweet performance analysis:\n\n";
      ownTweetSection += "### Top performers:\n";
      for (const t of topN) {
        ownTweetSection += `- (${t.likes} likes, ${t.retweets} RTs) "${t.text.slice(0, 200)}"\n`;
      }
      if (bottomN.length > 0 && scored.length > 10) {
        ownTweetSection += "\n### Underperformers:\n";
        for (const t of bottomN) {
          ownTweetSection += `- (${t.likes} likes, ${t.retweets} RTs) "${t.text.slice(0, 200)}"\n`;
        }
      }
    }
  } catch {
    // No self-tweets available
  }

  const userPrompt = `Current style guide:\n\n${soul}\n\n---\n\nRecent feedback:\n\n${feedbackSummary}${ownTweetSection}`;

  const updated = await generate(LEARN_SYSTEM_PROMPT, userPrompt, 2048);
  await saveSoul(updated);

  log.success("Soul.md updated with new learnings");
  return true;
}
