import Anthropic from "@anthropic-ai/sdk";
import { log } from "../utils/logger.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set in .env");
    }
    client = new Anthropic();
  }
  return client;
}

export async function generate(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      return text;
    } catch (e: any) {
      // Retry on rate limit / overloaded
      if (e?.status === 429 || e?.status === 529) {
        const wait = attempt * 5000;
        log.warn(`Rate limited, retrying in ${wait / 1000}s (attempt ${attempt}/3)...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }

  throw new Error("Claude API: max retries exceeded");
}
