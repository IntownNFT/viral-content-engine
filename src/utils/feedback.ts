import fs from "fs/promises";
import path from "path";
import { getDataRoot } from "./config.js";

export interface FeedbackInteraction {
  type: "copy" | "edit";
  contentType: string;
  original: string;
  edited?: string;
  timestamp: string;
}

function feedbackDir(): string {
  return path.join(getDataRoot(), "data", "feedback");
}

export async function logFeedback(interaction: FeedbackInteraction): Promise<void> {
  const dir = feedbackDir();
  await fs.mkdir(dir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `${date}.json`);

  let entries: FeedbackInteraction[] = [];
  try {
    const raw = await fs.readFile(file, "utf-8");
    entries = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }

  entries.push(interaction);
  await fs.writeFile(file, JSON.stringify(entries, null, 2));
}

export async function loadRecentFeedback(days = 7): Promise<FeedbackInteraction[]> {
  const dir = feedbackDir();
  await fs.mkdir(dir, { recursive: true });

  const all: FeedbackInteraction[] = [];
  const now = Date.now();

  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort().reverse();
  } catch {
    return [];
  }

  for (const file of files) {
    // Parse date from filename
    const dateStr = file.replace(".json", "");
    const fileDate = new Date(dateStr).getTime();
    if (now - fileDate > days * 86_400_000) break;

    try {
      const raw = await fs.readFile(path.join(dir, file), "utf-8");
      const entries: FeedbackInteraction[] = JSON.parse(raw);
      all.push(...entries);
    } catch {
      // Skip corrupt files
    }
  }

  return all;
}
