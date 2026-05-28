import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { APP_DIR, getEngineDataRoot, getOutputDir, CONTENT_PILLARS } from "@/lib/engine";

export const dynamic = "force-dynamic";

const PILLARS_FILE = path.join(APP_DIR, "pillars.json");
const HEARTBEAT_CONFIG_FILE = path.join(APP_DIR, "heartbeat-config.json");

function getEnvPath(): string {
  const cwdEnv = path.join(process.cwd(), ".env");
  try {
    require("fs").accessSync(cwdEnv);
    return cwdEnv;
  } catch {
    return path.join(APP_DIR, ".env");
  }
}

async function readEnv(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(getEnvPath(), "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      result[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
    return result;
  } catch {
    return {};
  }
}

async function writeEnv(updates: Record<string, string>): Promise<void> {
  const envPath = getEnvPath();
  let content = "";
  try {
    content = await fs.readFile(envPath, "utf-8");
  } catch {}

  const lines = content.split("\n");
  const updatedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    const key = trimmed.slice(0, eqIdx);
    if (key in updates) {
      updatedKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  await fs.mkdir(path.dirname(envPath), { recursive: true });
  await fs.writeFile(envPath, newLines.join("\n"));
}

async function loadPillars(): Promise<string[]> {
  try {
    const raw = await fs.readFile(PILLARS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return CONTENT_PILLARS;
  }
}

async function loadHeartbeatConfig(): Promise<
  { name: string; windowStart: number; windowEnd: number; intervalHours: number }[]
> {
  try {
    const raw = await fs.readFile(HEARTBEAT_CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [
      { name: "daily", windowStart: 6, windowEnd: 10, intervalHours: 24 },
      { name: "trends", windowStart: 0, windowEnd: 23, intervalHours: 2 },
      { name: "learn", windowStart: 20, windowEnd: 23, intervalHours: 24 },
    ];
  }
}

export async function GET() {
  const env = await readEnv();
  const pillars = await loadPillars();
  const heartbeatConfig = await loadHeartbeatConfig();
  const dataRoot = getEngineDataRoot();

  return NextResponse.json({
    keys: {
      anthropicKey: !!env.ANTHROPIC_API_KEY,
      xBearerToken: !!env.X_BEARER_TOKEN,
      twitterUsername: !!env.TWITTER_USERNAME,
      twitterPassword: !!env.TWITTER_PASSWORD,
    },
    model: env.CLAUDE_MODEL || "claude-sonnet-4-6",
    myHandle: env.MY_TWITTER_HANDLE || "",
    pillars,
    heartbeatConfig,
    paths: {
      dataRoot,
      appDir: APP_DIR,
      outputDir: getOutputDir(),
      soulFile: path.join(dataRoot, "data", "soul.md"),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Update API keys
  if (body.keys) {
    const updates: Record<string, string> = {};
    if (body.keys.anthropicKey !== undefined) updates.ANTHROPIC_API_KEY = body.keys.anthropicKey;
    if (body.keys.xBearerToken !== undefined) updates.X_BEARER_TOKEN = body.keys.xBearerToken;
    if (body.keys.twitterUsername !== undefined) updates.TWITTER_USERNAME = body.keys.twitterUsername;
    if (body.keys.twitterPassword !== undefined) updates.TWITTER_PASSWORD = body.keys.twitterPassword;
    if (Object.keys(updates).length > 0) {
      await writeEnv(updates);
    }
  }

  // Update my handle
  if (body.myHandle !== undefined) {
    await writeEnv({ MY_TWITTER_HANDLE: body.myHandle });
  }

  // Update model
  if (body.model) {
    await writeEnv({ CLAUDE_MODEL: body.model });
  }

  // Update pillars
  if (body.pillars && Array.isArray(body.pillars)) {
    await fs.mkdir(APP_DIR, { recursive: true });
    await fs.writeFile(PILLARS_FILE, JSON.stringify(body.pillars, null, 2));
  }

  // Update heartbeat config
  if (body.heartbeatConfig && Array.isArray(body.heartbeatConfig)) {
    await fs.mkdir(APP_DIR, { recursive: true });
    await fs.writeFile(HEARTBEAT_CONFIG_FILE, JSON.stringify(body.heartbeatConfig, null, 2));
  }

  return NextResponse.json({ ok: true });
}
