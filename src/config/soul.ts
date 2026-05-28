import fs from "fs/promises";
import path from "path";
import { APP_DIR } from "../utils/config.js";

const SOUL_FILE = path.join(APP_DIR, "soul.md");

const STARTER_TEMPLATE = `# My Voice

Write like a practitioner sharing hard-won lessons, not a guru.
Punchy, direct, contrarian. Challenge "quality over quantity" thinking.
Action-oriented — readers should feel they can start TODAY.

# Topics I Care About

- Clipping & repurposing long-form into short-form
- Content creation workflows and systems
- Organic marketing over paid ads
- Volume and consistency beat perfection
- Platform-native formats and hooks

# Phrases I Like

- "Just post more"
- "Quantity creates surface area for luck"
- "Stop editing, start shipping"

# Phrases I Avoid

- "game-changer"
- "unlock your potential"
- hashtags of any kind

# Learnings (auto-updated)

_This section is updated automatically based on your feedback._
`;

export async function loadSoul(): Promise<string> {
  try {
    const content = await fs.readFile(SOUL_FILE, "utf-8");
    return content;
  } catch {
    // Create starter template if missing
    await fs.mkdir(path.dirname(SOUL_FILE), { recursive: true });
    await fs.writeFile(SOUL_FILE, STARTER_TEMPLATE);
    return STARTER_TEMPLATE;
  }
}

export async function saveSoul(content: string): Promise<void> {
  await fs.mkdir(path.dirname(SOUL_FILE), { recursive: true });
  await fs.writeFile(SOUL_FILE, content);
}
