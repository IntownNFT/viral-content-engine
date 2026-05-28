import fs from "fs/promises";
import path from "path";
import { APP_DIR } from "./config.js";
import { log } from "./logger.js";

const STATE_FILE = path.join(APP_DIR, "heartbeat-state.json");

export interface HeartbeatTask {
  name: string;
  /** Cron-style window: hours (0-23) during which this task can run */
  windowStart: number;
  windowEnd: number;
  /** How often to run (in hours). E.g., 24 = once daily, 2 = every 2h */
  intervalHours: number;
}

export interface HeartbeatState {
  lastRun: Record<string, string>; // task name → ISO timestamp of last run
  lastCheck: string | null;
}

// ---- Default schedule ----

export const DEFAULT_TASKS: HeartbeatTask[] = [
  { name: "daily", windowStart: 6, windowEnd: 10, intervalHours: 24 },
  { name: "trends", windowStart: 0, windowEnd: 23, intervalHours: 2 },
  { name: "learn", windowStart: 20, windowEnd: 23, intervalHours: 24 },
];

// ---- State management ----

export async function loadHeartbeatState(): Promise<HeartbeatState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { lastRun: {}, lastCheck: null };
  }
}

export async function saveHeartbeatState(state: HeartbeatState): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export async function markTaskComplete(taskName: string): Promise<void> {
  const state = await loadHeartbeatState();
  state.lastRun[taskName] = new Date().toISOString();
  await saveHeartbeatState(state);
}

// ---- Scheduling logic ----

/**
 * Determine which tasks should run right now.
 * A task should run if:
 * 1. Current hour is within its time window
 * 2. It hasn't run within its interval period
 */
export function getReadyTasks(
  tasks: HeartbeatTask[],
  state: HeartbeatState,
  now = new Date()
): HeartbeatTask[] {
  const hour = now.getHours();
  const ready: HeartbeatTask[] = [];

  for (const task of tasks) {
    // Check time window
    const inWindow = task.windowStart <= task.windowEnd
      ? hour >= task.windowStart && hour <= task.windowEnd
      : hour >= task.windowStart || hour <= task.windowEnd; // handles overnight windows

    if (!inWindow) continue;

    // Check interval
    const lastRunStr = state.lastRun[task.name];
    if (lastRunStr) {
      const lastRun = new Date(lastRunStr).getTime();
      const elapsed = now.getTime() - lastRun;
      const intervalMs = task.intervalHours * 3_600_000;
      if (elapsed < intervalMs) continue;
    }

    ready.push(task);
  }

  return ready;
}

/**
 * Check what tasks are due and return them. Also returns current state for display.
 */
export async function heartbeatCheck(tasks?: HeartbeatTask[]): Promise<{
  readyTasks: HeartbeatTask[];
  state: HeartbeatState;
  allTasks: HeartbeatTask[];
}> {
  const taskList = tasks || DEFAULT_TASKS;
  const state = await loadHeartbeatState();
  const readyTasks = getReadyTasks(taskList, state);

  // Update last check time
  state.lastCheck = new Date().toISOString();
  await saveHeartbeatState(state);

  return { readyTasks, state, allTasks: taskList };
}

/**
 * Get a summary of heartbeat status for display.
 */
export async function getHeartbeatStatus(): Promise<{
  tasks: { name: string; lastRun: string | null; nextWindow: string; intervalHours: number; isDue: boolean }[];
  lastCheck: string | null;
}> {
  const state = await loadHeartbeatState();
  const now = new Date();
  const hour = now.getHours();
  const readySet = new Set(getReadyTasks(DEFAULT_TASKS, state, now).map((t) => t.name));

  const tasks = DEFAULT_TASKS.map((task) => {
    const lastRun = state.lastRun[task.name] || null;
    const windowStr = `${task.windowStart}:00–${task.windowEnd}:00`;
    return {
      name: task.name,
      lastRun,
      nextWindow: windowStr,
      intervalHours: task.intervalHours,
      isDue: readySet.has(task.name),
    };
  });

  return { tasks, lastCheck: state.lastCheck };
}
