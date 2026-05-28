export interface CommandStatus {
  state: "idle" | "running" | "complete" | "error";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ContentFile {
  name: string;
  content: string;
}

export interface TweetCard {
  id: string;
  username: string;
  name: string;
  text: string;
  timeAgo: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  tweetUrl: string;
  createdAt: string;
}

export interface ResearchQuery {
  query: string;
  count: number;
  tweets: TweetCard[];
}

export interface ResearchResult {
  topic: string;
  briefing: string;
  queries: ResearchQuery[];
  totalTweets: number;
  totalCost: number;
  timestamp: string;
}

export interface AbVariationGroup {
  original: string;
  variationA: string;
  variationB: string;
}

export interface AbVariationsData {
  generatedAt: string | null;
  groups: AbVariationGroup[];
}

export interface HeartbeatTaskStatus {
  name: string;
  lastRun: string | null;
  nextWindow: string;
  intervalHours: number;
  isDue: boolean;
}

export interface HeartbeatStatus {
  tasks: HeartbeatTaskStatus[];
  lastCheck: string | null;
}

export interface SettingsData {
  keys: {
    anthropicKey: boolean;
    xBearerToken: boolean;
    twitterUsername: boolean;
    twitterPassword: boolean;
  };
  model: string;
  myHandle: string;
  pillars: string[];
  heartbeatConfig: { name: string; windowStart: number; windowEnd: number; intervalHours: number }[];
  paths: {
    dataRoot: string;
    appDir: string;
    outputDir: string;
    soulFile: string;
  };
}
