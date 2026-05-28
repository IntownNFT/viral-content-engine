import http from "http";
import fs from "fs/promises";
import path from "path";
import { loadConfig, getDataRoot } from "./utils/config.js";
import { loadLatestAbVariations, loadLatestScrapedData } from "./utils/storage.js";
import { loadCreators, followCreator, unfollowCreator } from "./config/creator-manager.js";
import { loadSoul, saveSoul } from "./config/soul.js";
import { logFeedback } from "./utils/feedback.js";
import { scrapeCreators } from "./scraper/twitter.js";
import { scrapeTrends } from "./scraper/trends.js";
import { generateTweets } from "./generator/tweets.js";
import { generateBlog } from "./generator/blogs.js";
import { generateReels } from "./generator/reels.js";
import { runLearnPass } from "./generator/learn.js";
import { runResearch, followThread } from "./research/research.js";
import { getHeartbeatStatus, heartbeatCheck, markTaskComplete } from "./utils/heartbeat.js";
import { log } from "./utils/logger.js";

loadConfig();

const OUTPUT = path.join(getDataRoot(), "output");
const PORT = 3333;

// ---- Command status tracking ----

interface CommandStatus {
  state: "idle" | "running" | "complete" | "error";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

const statuses: Record<string, CommandStatus> = {
  scrape: { state: "idle" },
  generate: { state: "idle" },
  daily: { state: "idle" },
  trends: { state: "idle" },
  learn: { state: "idle" },
  research: { state: "idle" },
};

// Store latest research result in memory for quick retrieval
let latestResearch: any = null;

async function runCommand(name: string, fn: () => Promise<void>): Promise<void> {
  if (statuses[name]?.state === "running") {
    throw new Error(`${name} is already running`);
  }
  statuses[name] = { state: "running", startedAt: new Date().toISOString() };
  try {
    await fn();
    statuses[name] = { state: "complete", startedAt: statuses[name].startedAt, completedAt: new Date().toISOString() };
  } catch (e: any) {
    statuses[name] = { state: "error", startedAt: statuses[name].startedAt, completedAt: new Date().toISOString(), error: e.message || String(e) };
    throw e;
  }
}

// ---- Helpers ----

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

async function getFiles(type: string) {
  const dir = path.join(OUTPUT, type);
  try {
    const files = (await fs.readdir(dir))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    const results = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      results.push({ name: file, content });
    }
    return results;
  } catch {
    return [];
  }
}

function json(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function buildHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Viral Content Engine</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; }
  .header { background: #111; border-bottom: 1px solid #222; padding: 20px 32px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .header h1 { font-size: 20px; font-weight: 600; color: #fff; }
  .header span { color: #666; font-size: 14px; }
  .cmd-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .cmd-btn { background: #1a1a1a; border: 1px solid #333; color: #ccc; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
  .cmd-btn:hover { border-color: #00C853; color: #00C853; }
  .cmd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cmd-btn.running { border-color: #FFD700; color: #FFD700; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
  .ab-check { display: flex; align-items: center; gap: 4px; color: #888; font-size: 12px; }
  .ab-check input { accent-color: #00C853; }
  .status-bar { background: #0d0d0d; border-bottom: 1px solid #1a1a1a; padding: 8px 32px; font-size: 12px; color: #555; min-height: 32px; }
  .status-bar .running { color: #FFD700; }
  .status-bar .complete { color: #00C853; }
  .status-bar .error { color: #FF5252; }
  .tabs { display: flex; gap: 0; background: #111; border-bottom: 1px solid #222; padding: 0 32px; overflow-x: auto; }
  .tab { padding: 14px 20px; cursor: pointer; color: #888; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
  .tab:hover { color: #ccc; }
  .tab.active { color: #00C853; border-bottom-color: #00C853; }
  .count { background: #1a1a1a; color: #888; font-size: 11px; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }
  .tab.active .count { background: #00C85322; color: #00C853; }
  .main { max-width: 1200px; margin: 0 auto; padding: 32px; }
  .main.narrow { max-width: 800px; }
  .card { background: #141414; border: 1px solid #222; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
  .card-header:hover { background: #1a1a1a; }
  .card-title { font-size: 14px; color: #aaa; font-weight: 500; }
  .card-toggle { color: #555; font-size: 18px; transition: transform 0.2s; }
  .card.open .card-toggle { transform: rotate(180deg); }
  .card-body { padding: 20px; display: none; }
  .card.open .card-body { display: block; }
  .prose h1 { font-size: 22px; color: #fff; margin: 16px 0 8px; line-height: 1.3; }
  .prose h2 { font-size: 18px; color: #ddd; margin: 20px 0 8px; }
  .prose h3 { font-size: 15px; color: #bbb; margin: 16px 0 6px; }
  .prose p { line-height: 1.7; margin: 8px 0; color: #ccc; }
  .prose ul, .prose ol { margin: 8px 0 8px 20px; }
  .prose li { line-height: 1.6; margin: 4px 0; color: #ccc; }
  .prose strong { color: #fff; }
  .prose em { color: #aaa; }
  .prose hr { border: none; border-top: 1px solid #333; margin: 20px 0; }
  .prose blockquote { border-left: 3px solid #00C853; padding-left: 16px; margin: 12px 0; color: #aaa; }
  .prose code { background: #1e1e1e; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #00C853; }
  .prose a { color: #00C853; text-decoration: none; }
  .prose a:hover { text-decoration: underline; }
  .empty { text-align: center; padding: 60px; color: #555; }
  .copy-btn { background: #1e1e1e; border: 1px solid #333; color: #aaa; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .copy-btn:hover { background: #252525; color: #fff; }
  .edit-btn { background: #1e1e1e; border: 1px solid #333; color: #aaa; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 6px; }
  .edit-btn:hover { background: #252525; color: #fff; }
  .refresh { background: none; border: 1px solid #333; color: #888; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .refresh:hover { border-color: #00C853; color: #00C853; }
  .ab-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .ab-col { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; }
  .ab-col h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #333; }
  .ab-col.original h4 { color: #00C853; }
  .ab-col.var-a h4 { color: #448AFF; }
  .ab-col.var-b h4 { color: #FF9100; }
  .ab-col p { font-size: 13px; line-height: 1.6; color: #ccc; }
  .ab-number { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 12px; }
  .ab-copy { background: none; border: 1px solid #333; color: #777; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 10px; }
  .ab-copy:hover { border-color: #00C853; color: #00C853; }
  .creator-list { list-style: none; }
  .creator-list li { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #1a1a1a; }
  .creator-list li:last-child { border-bottom: none; }
  .creator-handle { color: #00C853; font-weight: 500; }
  .remove-btn { background: none; border: 1px solid #333; color: #888; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .remove-btn:hover { border-color: #FF5252; color: #FF5252; }
  .add-form { display: flex; gap: 8px; margin-bottom: 20px; }
  .add-input { background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; padding: 10px 14px; border-radius: 8px; font-size: 14px; flex: 1; outline: none; }
  .add-input:focus { border-color: #00C853; }
  .add-btn { background: #00C853; border: none; color: #000; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .add-btn:hover { background: #00E676; }
  .soul-editor { width: 100%; min-height: 400px; background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; padding: 16px; border-radius: 8px; font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 14px; line-height: 1.6; resize: vertical; outline: none; }
  .soul-editor:focus { border-color: #00C853; }
  .soul-actions { display: flex; gap: 8px; margin-top: 12px; }
  .save-btn { background: #00C853; border: none; color: #000; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .save-btn:hover { background: #00E676; }
  .learn-btn { background: #1a1a1a; border: 1px solid #333; color: #ccc; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .learn-btn:hover { border-color: #00C853; color: #00C853; }
  .tweet-block { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .tweet-text { color: #ccc; line-height: 1.6; font-size: 14px; white-space: pre-wrap; }
  .tweet-actions { display: flex; gap: 6px; margin-top: 10px; }
  .tweet-edit-area { width: 100%; min-height: 80px; background: #111; border: 1px solid #00C853; color: #e0e0e0; padding: 12px; border-radius: 6px; font-family: inherit; font-size: 14px; line-height: 1.6; resize: vertical; outline: none; margin-top: 8px; }
  /* Research tab */
  .research-form { display: flex; gap: 8px; margin-bottom: 12px; }
  .research-input { background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; padding: 12px 16px; border-radius: 8px; font-size: 14px; flex: 1; outline: none; }
  .research-input:focus { border-color: #00C853; }
  .research-btn { background: #00C853; border: none; color: #000; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; white-space: nowrap; }
  .research-btn:hover { background: #00E676; }
  .research-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .research-opts { display: flex; gap: 16px; margin-bottom: 20px; align-items: center; }
  .research-opts label { color: #888; font-size: 13px; display: flex; align-items: center; gap: 4px; }
  .research-opts input[type="checkbox"] { accent-color: #00C853; }
  .research-opts input[type="number"] { background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; padding: 4px 8px; border-radius: 4px; width: 60px; font-size: 13px; outline: none; }
  .research-cost { color: #FFD700; font-size: 12px; margin-bottom: 16px; }
  .x-tweet { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 10px; }
  .x-tweet-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .x-tweet-user { color: #00C853; font-weight: 600; font-size: 14px; }
  .x-tweet-time { color: #555; font-size: 12px; }
  .x-tweet-body { color: #ccc; line-height: 1.6; font-size: 14px; white-space: pre-wrap; margin-bottom: 8px; }
  .x-tweet-metrics { display: flex; gap: 16px; font-size: 12px; color: #666; }
  .x-tweet-metrics span { display: flex; align-items: center; gap: 3px; }
  .x-tweet-link { color: #00C853; font-size: 12px; text-decoration: none; margin-left: auto; }
  .x-tweet-link:hover { text-decoration: underline; }
  .thread-btn { background: none; border: 1px solid #333; color: #777; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-left: 8px; }
  .thread-btn:hover { border-color: #00C853; color: #00C853; }
  /* Heartbeat tab */
  .hb-task { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
  .hb-name { color: #fff; font-weight: 600; font-size: 15px; }
  .hb-detail { color: #888; font-size: 13px; }
  .hb-due { background: #00C85322; color: #00C853; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .hb-ok { background: #1a1a1a; color: #555; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
  .hb-run-btn { background: #00C853; border: none; color: #000; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 16px; }
  .hb-run-btn:hover { background: #00E676; }
  .query-section { margin-bottom: 24px; }
  .query-label { color: #448AFF; font-size: 13px; font-weight: 600; margin-bottom: 8px; padding: 6px 10px; background: #448AFF11; border-radius: 6px; display: inline-block; }
  @media (max-width: 768px) { .ab-group { grid-template-columns: 1fr; } .cmd-bar { width: 100%; } }
</style>
</head>
<body>
<div class="header">
  <h1>Viral Content Engine</h1>
  <span id="lastRun"></span>
  <div style="flex:1"></div>
  <div class="cmd-bar">
    <button class="cmd-btn" id="btn-scrape" onclick="runCmd('scrape')">Scrape</button>
    <button class="cmd-btn" id="btn-trends" onclick="runCmd('trends')">Trends</button>
    <button class="cmd-btn" id="btn-generate" onclick="runCmd('generate')">Generate</button>
    <button class="cmd-btn" id="btn-daily" onclick="runCmd('daily')">Daily</button>
    <label class="ab-check"><input type="checkbox" id="ab-flag"> A/B</label>
    <button class="refresh" onclick="loadAll()">Refresh</button>
  </div>
</div>
<div class="status-bar" id="status-bar"></div>
<div class="tabs">
  <div class="tab active" data-tab="tweets">Tweets <span class="count" id="count-tweets">0</span></div>
  <div class="tab" data-tab="blogs">Blogs <span class="count" id="count-blogs">0</span></div>
  <div class="tab" data-tab="reels">Reels <span class="count" id="count-reels">0</span></div>
  <div class="tab" data-tab="ab">A/B Tests <span class="count" id="count-ab">0</span></div>
  <div class="tab" data-tab="research">Research <span class="count" id="count-research">0</span></div>
  <div class="tab" data-tab="creators">Creators</div>
  <div class="tab" data-tab="soul">Soul</div>
  <div class="tab" data-tab="heartbeat">Heartbeat</div>
</div>
<div class="main narrow" id="main"></div>
<script>
var data = { tweets: [], blogs: [], reels: [] };
var abData = null;
var creatorsData = [];
var soulContent = '';
var researchData = null;
var heartbeatData = null;
var activeTab = 'tweets';
var statusPoll = null;

document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    var mainEl = document.getElementById('main');
    if (activeTab === 'ab' || activeTab === 'research') {
      mainEl.classList.remove('narrow');
    } else {
      mainEl.classList.add('narrow');
    }
    render();
  });
});

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function mdToHtml(md) {
  var lines = md.split('\\n');
  var html = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.match(/^### /)) { html.push('<h3>' + inline(line.slice(4)) + '</h3>'); }
    else if (line.match(/^## /)) { html.push('<h2>' + inline(line.slice(3)) + '</h2>'); }
    else if (line.match(/^# /)) { html.push('<h1>' + inline(line.slice(2)) + '</h1>'); }
    else if (line === '---') { html.push('<hr>'); }
    else if (line.match(/^> /)) { html.push('<blockquote>' + inline(line.slice(2)) + '</blockquote>'); }
    else if (line.match(/^- /)) { html.push('<li>' + inline(line.slice(2)) + '</li>'); }
    else if (line.match(/^\\d+\\. /)) { html.push('<li>' + inline(line.replace(/^\\d+\\.\\s/, '')) + '</li>'); }
    else if (line.trim() === '') { html.push(''); }
    else { html.push('<p>' + inline(line) + '</p>'); }
  }
  return html.join('\\n');
}

function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  s = s.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
  s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
  s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
  return s;
}

function sendFeedback(type, contentType, original, edited) {
  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: type, contentType: contentType, original: original, edited: edited })
  });
}

// ---- Content tabs ----

function copyContent(idx) {
  var item = data[activeTab][idx];
  navigator.clipboard.writeText(item.content).then(function() {
    sendFeedback('copy', activeTab, item.content);
    var btn = document.getElementById('copy-' + idx);
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy raw'; }, 1500);
  });
}

function copyAbText(groupIdx, type) {
  if (!abData || !abData.groups[groupIdx]) return;
  var g = abData.groups[groupIdx];
  var text = type === 'original' ? g.original : type === 'a' ? g.variationA : g.variationB;
  navigator.clipboard.writeText(text).then(function() {
    sendFeedback('copy', 'ab-' + type, text);
    var btn = document.getElementById('ab-copy-' + groupIdx + '-' + type);
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
  });
}

function toggleCard(idx) {
  var card = document.getElementById('card-' + idx);
  card.classList.toggle('open');
}

// ---- Tweet-level copy & edit ----

function parseTweets(content) {
  return content.split('---').map(function(t) { return t.trim(); }).filter(function(t) {
    return t.length > 0 && !t.startsWith('# Generated');
  });
}

function copyTweet(cardIdx, tweetIdx) {
  var item = data[activeTab][cardIdx];
  var tweets = parseTweets(item.content);
  var text = tweets[tweetIdx] || '';
  navigator.clipboard.writeText(text).then(function() {
    sendFeedback('copy', 'tweet', text);
    var btn = document.getElementById('tcopy-' + cardIdx + '-' + tweetIdx);
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
  });
}

function editTweet(cardIdx, tweetIdx) {
  var item = data[activeTab][cardIdx];
  var tweets = parseTweets(item.content);
  var text = tweets[tweetIdx] || '';
  var container = document.getElementById('tweet-' + cardIdx + '-' + tweetIdx);
  var textEl = container.querySelector('.tweet-text');
  var actionsEl = container.querySelector('.tweet-actions');
  textEl.style.display = 'none';
  var ta = document.createElement('textarea');
  ta.className = 'tweet-edit-area';
  ta.value = text;
  ta.id = 'tedit-' + cardIdx + '-' + tweetIdx;
  container.insertBefore(ta, actionsEl);
  actionsEl.innerHTML = '<button class="copy-btn" onclick="saveEdit(' + cardIdx + ',' + tweetIdx + ')">Save</button><button class="edit-btn" onclick="cancelEdit(' + cardIdx + ',' + tweetIdx + ')">Cancel</button>';
}

function saveEdit(cardIdx, tweetIdx) {
  var item = data[activeTab][cardIdx];
  var tweets = parseTweets(item.content);
  var original = tweets[tweetIdx] || '';
  var ta = document.getElementById('tedit-' + cardIdx + '-' + tweetIdx);
  var edited = ta.value;
  sendFeedback('edit', 'tweet', original, edited);
  var container = document.getElementById('tweet-' + cardIdx + '-' + tweetIdx);
  container.querySelector('.tweet-text').textContent = edited;
  container.querySelector('.tweet-text').style.display = '';
  ta.remove();
  container.querySelector('.tweet-actions').innerHTML =
    '<button class="copy-btn" id="tcopy-' + cardIdx + '-' + tweetIdx + '" onclick="copyTweet(' + cardIdx + ',' + tweetIdx + ')">Copy</button><button class="edit-btn" onclick="editTweet(' + cardIdx + ',' + tweetIdx + ')">Edit</button>';
}

function cancelEdit(cardIdx, tweetIdx) {
  var container = document.getElementById('tweet-' + cardIdx + '-' + tweetIdx);
  container.querySelector('.tweet-text').style.display = '';
  var ta = document.getElementById('tedit-' + cardIdx + '-' + tweetIdx);
  if (ta) ta.remove();
  container.querySelector('.tweet-actions').innerHTML =
    '<button class="copy-btn" id="tcopy-' + cardIdx + '-' + tweetIdx + '" onclick="copyTweet(' + cardIdx + ',' + tweetIdx + ')">Copy</button><button class="edit-btn" onclick="editTweet(' + cardIdx + ',' + tweetIdx + ')">Edit</button>';
}

// ---- Research helpers ----

function copyXTweet(text) {
  navigator.clipboard.writeText(text).then(function() {
    sendFeedback('copy', 'x-research', text);
  });
}

function followXThread(tweetId) {
  var btn = document.getElementById('thread-' + tweetId);
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  fetch('/api/research/thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tweetId: tweetId })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.tweets || d.tweets.length === 0) {
      if (btn) { btn.textContent = 'No thread'; setTimeout(function() { btn.textContent = 'Thread'; btn.disabled = false; }, 2000); }
      return;
    }
    var container = document.getElementById('thread-container-' + tweetId);
    if (!container) return;
    var html = '<div style="border-left:2px solid #333;margin:8px 0 0 12px;padding-left:12px;">';
    for (var i = 0; i < d.tweets.length; i++) {
      var t = d.tweets[i];
      html += '<div class="x-tweet" style="margin-bottom:6px;padding:10px;">';
      html += '<div class="x-tweet-header"><span class="x-tweet-user">@' + escapeHtml(t.username) + '</span><span class="x-tweet-time">' + escapeHtml(t.timeAgo) + '</span></div>';
      html += '<div class="x-tweet-body">' + escapeHtml(t.text) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    if (btn) { btn.textContent = 'Thread'; btn.disabled = false; }
  });
}

// ---- Render functions ----

function renderTweets() {
  var items = data.tweets || [];
  var el = document.getElementById('main');
  if (items.length === 0) { el.innerHTML = '<div class="empty"><p>No tweets yet. Click Generate or run the pipeline.</p></div>'; return; }
  var cards = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var tweets = parseTweets(item.content);
    var openClass = i === 0 ? 'card open' : 'card';
    var tweetBlocks = '';
    for (var j = 0; j < tweets.length; j++) {
      tweetBlocks += '<div class="tweet-block" id="tweet-' + i + '-' + j + '"><div class="tweet-text">' + escapeHtml(tweets[j]) + '</div><div class="tweet-actions"><button class="copy-btn" id="tcopy-' + i + '-' + j + '" onclick="copyTweet(' + i + ',' + j + ')">Copy</button><button class="edit-btn" onclick="editTweet(' + i + ',' + j + ')">Edit</button></div></div>';
    }
    cards.push('<div class="' + openClass + '" id="card-' + i + '"><div class="card-header" onclick="toggleCard(' + i + ')"><span class="card-title">' + escapeHtml(item.name) + ' (' + tweets.length + ' tweets)</span><span class="card-toggle">&#9662;</span></div><div class="card-body"><div style="text-align:right;margin-bottom:12px"><button class="copy-btn" id="copy-' + i + '" onclick="copyContent(' + i + ')">Copy all raw</button></div>' + tweetBlocks + '</div></div>');
  }
  el.innerHTML = cards.join('');
}

function renderContent() {
  var items = data[activeTab] || [];
  var el = document.getElementById('main');
  if (items.length === 0) { el.innerHTML = '<div class="empty"><p>No content yet. Click Generate or run the pipeline.</p></div>'; return; }
  var cards = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var openClass = i === 0 ? 'card open' : 'card';
    cards.push('<div class="' + openClass + '" id="card-' + i + '"><div class="card-header" onclick="toggleCard(' + i + ')"><span class="card-title">' + escapeHtml(item.name) + '</span><span class="card-toggle">&#9662;</span></div><div class="card-body"><div style="text-align:right;margin-bottom:12px"><button class="copy-btn" id="copy-' + i + '" onclick="copyContent(' + i + ')">Copy raw</button></div><div class="prose">' + mdToHtml(item.content) + '</div></div></div>');
  }
  el.innerHTML = cards.join('');
}

function renderAb() {
  var el = document.getElementById('main');
  if (!abData || !abData.groups || abData.groups.length === 0) { el.innerHTML = '<div class="empty"><p>No A/B variations yet. Click Generate with A/B checked.</p></div>'; return; }
  var html = '<h2 style="color:#fff;margin-bottom:8px;">A/B Tweet Variations</h2>';
  html += '<p style="color:#666;margin-bottom:24px;font-size:13px;">Generated: ' + escapeHtml(abData.generatedAt || '') + '</p>';
  for (var i = 0; i < abData.groups.length; i++) {
    var g = abData.groups[i];
    html += '<div class="ab-number">Tweet ' + (i + 1) + '</div><div class="ab-group">';
    html += '<div class="ab-col original"><h4>Original</h4><p>' + escapeHtml(g.original) + '</p><button class="ab-copy" id="ab-copy-' + i + '-original" onclick="copyAbText(' + i + ',\\'original\\')">Copy</button></div>';
    html += '<div class="ab-col var-a"><h4>Variation A</h4><p>' + escapeHtml(g.variationA) + '</p><button class="ab-copy" id="ab-copy-' + i + '-a" onclick="copyAbText(' + i + ',\\'a\\')">Copy</button></div>';
    html += '<div class="ab-col var-b"><h4>Variation B</h4><p>' + escapeHtml(g.variationB) + '</p><button class="ab-copy" id="ab-copy-' + i + '-b" onclick="copyAbText(' + i + ',\\'b\\')">Copy</button></div>';
    html += '</div>';
  }
  el.innerHTML = html;
}

function renderCreators() {
  var el = document.getElementById('main');
  var html = '<h2 style="color:#fff;margin-bottom:16px;">Creators</h2>';
  html += '<div class="add-form"><input class="add-input" id="add-handle" placeholder="@handle" onkeydown="if(event.key===\\'Enter\\')addCreator()"><button class="add-btn" onclick="addCreator()">Follow</button></div>';
  html += '<div class="card"><ul class="creator-list">';
  if (creatorsData.length === 0) {
    html += '<li style="color:#555;justify-content:center;">No creators. Add one above.</li>';
  } else {
    for (var i = 0; i < creatorsData.length; i++) {
      html += '<li><span class="creator-handle">@' + escapeHtml(creatorsData[i]) + '</span><button class="remove-btn" onclick="removeCreator(\\'' + escapeHtml(creatorsData[i]) + '\\')">Remove</button></li>';
    }
  }
  html += '</ul></div>';
  el.innerHTML = html;
}

function renderSoul() {
  var el = document.getElementById('main');
  var html = '<h2 style="color:#fff;margin-bottom:16px;">Soul — Living Style Guide</h2>';
  html += '<p style="color:#666;margin-bottom:16px;font-size:13px;">This file shapes how all content is generated. Edit it to refine your voice.</p>';
  html += '<textarea class="soul-editor" id="soul-textarea">' + escapeHtml(soulContent) + '</textarea>';
  html += '<div class="soul-actions"><button class="save-btn" id="soul-save" onclick="saveSoulContent()">Save</button><button class="learn-btn" onclick="runLearn()">Learn from Feedback</button></div>';
  el.innerHTML = html;
}

function renderXTweet(t) {
  var html = '<div class="x-tweet">';
  html += '<div class="x-tweet-header"><span class="x-tweet-user">@' + escapeHtml(t.username) + '</span><span class="x-tweet-time">' + escapeHtml(t.timeAgo) + '</span></div>';
  html += '<div class="x-tweet-body">' + escapeHtml(t.text) + '</div>';
  html += '<div class="x-tweet-metrics">';
  html += '<span>' + t.likes + ' likes</span>';
  html += '<span>' + t.retweets + ' RTs</span>';
  html += '<span>' + t.replies + ' replies</span>';
  if (t.impressions) html += '<span>' + t.impressions.toLocaleString() + ' views</span>';
  html += '<button class="thread-btn" id="thread-' + t.id + '" onclick="followXThread(\\'' + t.id + '\\')">Thread</button>';
  html += '<button class="thread-btn" onclick="copyXTweet(\\'' + escapeHtml(t.text).replace(/'/g, "\\\\'") + '\\')">Copy</button>';
  html += '<a class="x-tweet-link" href="' + escapeHtml(t.tweetUrl) + '" target="_blank">View on X</a>';
  html += '</div>';
  html += '<div id="thread-container-' + t.id + '"></div>';
  html += '</div>';
  return html;
}

function renderResearch() {
  var el = document.getElementById('main');
  var html = '<h2 style="color:#fff;margin-bottom:16px;">X Research</h2>';
  html += '<p style="color:#666;margin-bottom:16px;font-size:13px;">Search X via API with multi-angle query decomposition. Powered by Claude + X API v2.</p>';
  html += '<div class="research-form"><input class="research-input" id="research-query" placeholder="What are people saying about content clipping?" onkeydown="if(event.key===\\'Enter\\')doResearch()"><button class="research-btn" id="research-go" onclick="doResearch()">Research</button></div>';
  html += '<div class="research-opts"><label><input type="checkbox" id="research-quick"> Quick mode</label><label>Min likes: <input type="number" id="research-min-likes" value="5" min="0"></label></div>';

  if (researchData) {
    html += '<div class="research-cost">Topic: "' + escapeHtml(researchData.topic) + '" | ' + researchData.totalTweets + ' tweets | Est. cost: $' + researchData.totalCost.toFixed(3) + ' | ' + escapeHtml(researchData.timestamp) + '</div>';
    for (var q = 0; q < researchData.queries.length; q++) {
      var section = researchData.queries[q];
      html += '<div class="query-section">';
      html += '<div class="query-label">' + escapeHtml(section.query) + ' (' + section.count + ')</div>';
      for (var t = 0; t < section.tweets.length; t++) {
        html += renderXTweet(section.tweets[t]);
      }
      if (section.tweets.length === 0) html += '<p style="color:#555;font-size:13px;padding:8px 0;">No results for this query.</p>';
      html += '</div>';
    }
  } else {
    html += '<div class="empty" style="padding:40px;"><p>Enter a topic above to start researching.</p></div>';
  }

  el.innerHTML = html;
}

function renderHeartbeat() {
  var el = document.getElementById('main');
  var html = '<h2 style="color:#fff;margin-bottom:8px;">Heartbeat — Autonomous Scheduling</h2>';
  html += '<p style="color:#666;margin-bottom:20px;font-size:13px;">Time-gated tasks that run automatically. Check which tasks are due and trigger them.</p>';

  if (heartbeatData && heartbeatData.tasks) {
    if (heartbeatData.lastCheck) {
      html += '<p style="color:#555;margin-bottom:16px;font-size:12px;">Last heartbeat check: ' + escapeHtml(new Date(heartbeatData.lastCheck).toLocaleString()) + '</p>';
    }
    for (var i = 0; i < heartbeatData.tasks.length; i++) {
      var t = heartbeatData.tasks[i];
      html += '<div class="hb-task">';
      html += '<div><div class="hb-name">' + escapeHtml(t.name) + '</div>';
      html += '<div class="hb-detail">Window: ' + escapeHtml(t.nextWindow) + ' | Every ' + t.intervalHours + 'h | Last: ' + (t.lastRun ? escapeHtml(new Date(t.lastRun).toLocaleString()) : 'never') + '</div></div>';
      html += t.isDue ? '<span class="hb-due">DUE</span>' : '<span class="hb-ok">OK</span>';
      html += '</div>';
    }
    html += '<button class="hb-run-btn" onclick="runHeartbeat()">Run Due Tasks</button>';
  } else {
    html += '<div class="empty" style="padding:40px;"><p>Loading heartbeat status...</p></div>';
  }

  el.innerHTML = html;
}

function render() {
  if (activeTab === 'tweets') { renderTweets(); return; }
  if (activeTab === 'ab') { renderAb(); return; }
  if (activeTab === 'creators') { renderCreators(); return; }
  if (activeTab === 'soul') { renderSoul(); return; }
  if (activeTab === 'research') { renderResearch(); return; }
  if (activeTab === 'heartbeat') { renderHeartbeat(); return; }
  renderContent();
}

// ---- API calls ----

function runCmd(name) {
  var body = {};
  if ((name === 'generate' || name === 'daily') && document.getElementById('ab-flag').checked) {
    body.ab = true;
  }
  var btn = document.getElementById('btn-' + name);
  btn.classList.add('running');
  btn.disabled = true;
  fetch('/api/run/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) { return r.json(); }).then(function() {
    startStatusPoll();
  }).catch(function() {
    btn.classList.remove('running');
    btn.disabled = false;
  });
}

function startStatusPoll() {
  if (statusPoll) return;
  statusPoll = setInterval(pollStatus, 2000);
  pollStatus();
}

function pollStatus() {
  fetch('/api/status').then(function(r) { return r.json(); }).then(function(s) {
    var parts = [];
    var anyRunning = false;
    var names = ['scrape','trends','generate','daily','learn','research'];
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var st = s[n];
      if (!st || st.state === 'idle') continue;
      var cls = st.state;
      var label = n + ': ' + st.state;
      if (st.state === 'error') label += ' — ' + (st.error || '').slice(0, 80);
      parts.push('<span class="' + cls + '">' + escapeHtml(label) + '</span>');
      var btn = document.getElementById('btn-' + n);
      if (btn) {
        if (st.state === 'running') { btn.classList.add('running'); btn.disabled = true; anyRunning = true; }
        else { btn.classList.remove('running'); btn.disabled = false; }
      }
      if (st.state === 'running') anyRunning = true;
    }
    document.getElementById('status-bar').innerHTML = parts.join(' &nbsp;|&nbsp; ');
    if (!anyRunning && statusPoll) {
      clearInterval(statusPoll);
      statusPoll = null;
      loadAll();
    }
  });
}

function addCreator() {
  var input = document.getElementById('add-handle');
  var handle = input.value.trim();
  if (!handle) return;
  fetch('/api/creators/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: handle }) }).then(function() { input.value = ''; loadCreators(); });
}

function removeCreator(handle) {
  fetch('/api/creators/unfollow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: handle }) }).then(function() { loadCreators(); });
}

function saveSoulContent() {
  var ta = document.getElementById('soul-textarea');
  var btn = document.getElementById('soul-save');
  fetch('/api/soul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: ta.value }) }).then(function() {
    soulContent = ta.value;
    btn.textContent = 'Saved!';
    setTimeout(function() { btn.textContent = 'Save'; }, 1500);
  });
}

function runLearn() {
  fetch('/api/run/learn', { method: 'POST' }).then(function() { startStatusPoll(); setTimeout(function() { loadSoul(); }, 3000); });
}

function doResearch() {
  var query = document.getElementById('research-query').value.trim();
  if (!query) return;
  var quick = document.getElementById('research-quick').checked;
  var minLikes = parseInt(document.getElementById('research-min-likes').value) || 0;
  var btn = document.getElementById('research-go');
  btn.disabled = true;
  btn.textContent = 'Researching...';

  fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query, quick: quick, minLikes: minLikes })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.result) {
      researchData = d.result;
      document.getElementById('count-research').textContent = d.result.totalTweets;
    }
    btn.disabled = false;
    btn.textContent = 'Research';
    render();
  }).catch(function() {
    btn.disabled = false;
    btn.textContent = 'Research';
    startStatusPoll();
  });
}

function runHeartbeat() {
  fetch('/api/heartbeat/run', { method: 'POST' }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ran && d.ran.length > 0) { startStatusPoll(); }
    setTimeout(loadHeartbeat, 2000);
  });
}

function loadCreators() {
  fetch('/api/creators').then(function(r) { return r.json(); }).then(function(list) { creatorsData = list; if (activeTab === 'creators') render(); });
}

function loadSoul() {
  fetch('/api/soul').then(function(r) { return r.json(); }).then(function(d) { soulContent = d.content || ''; if (activeTab === 'soul') render(); });
}

function loadHeartbeat() {
  fetch('/api/heartbeat/status').then(function(r) { return r.json(); }).then(function(d) { heartbeatData = d; if (activeTab === 'heartbeat') render(); });
}

function loadResearch() {
  fetch('/api/research/latest').then(function(r) { return r.json(); }).then(function(d) {
    if (d && d.totalTweets != null) {
      researchData = d;
      document.getElementById('count-research').textContent = d.totalTweets;
    }
  }).catch(function() {});
}

function loadAll() {
  fetch('/api/content').then(function(res) { return res.json(); }).then(function(json) {
    data = json;
    document.getElementById('count-tweets').textContent = data.tweets.length;
    document.getElementById('count-blogs').textContent = data.blogs.length;
    document.getElementById('count-reels').textContent = data.reels.length;
    document.getElementById('lastRun').textContent = 'Last refresh: ' + new Date().toLocaleTimeString();
    render();
  });
  fetch('/api/ab-variations').then(function(res) { return res.json(); }).then(function(json) {
    abData = json;
    var count = (json && json.groups) ? json.groups.length : 0;
    document.getElementById('count-ab').textContent = count;
    if (activeTab === 'ab') render();
  }).catch(function() { abData = null; document.getElementById('count-ab').textContent = '0'; });
  loadCreators();
  loadSoul();
  loadHeartbeat();
  loadResearch();
  pollStatus();
}

loadAll();
</script>
</body>
</html>`;
}

// ---- Server ----

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method || "GET";

  try {
    // ---- Content APIs ----
    if (url === "/api/content" && method === "GET") {
      const [tweets, blogs, reels] = await Promise.all([
        getFiles("tweets"),
        getFiles("blogs"),
        getFiles("reels"),
      ]);
      return json(res, { tweets, blogs, reels });
    }

    if (url === "/api/ab-variations" && method === "GET") {
      const data = await loadLatestAbVariations();
      return json(res, data || { generatedAt: null, groups: [] });
    }

    // ---- Soul APIs ----
    if (url === "/api/soul" && method === "GET") {
      const content = await loadSoul();
      return json(res, { content });
    }

    if (url === "/api/soul" && method === "POST") {
      const body = await readBody(req);
      if (typeof body.content === "string") {
        await saveSoul(body.content);
      }
      return json(res, { ok: true });
    }

    // ---- Feedback API ----
    if (url === "/api/feedback" && method === "POST") {
      const body = await readBody(req);
      await logFeedback({
        type: body.type || "copy",
        contentType: body.contentType || "unknown",
        original: body.original || "",
        edited: body.edited,
        timestamp: new Date().toISOString(),
      });
      return json(res, { ok: true });
    }

    // ---- Creator APIs ----
    if (url === "/api/creators" && method === "GET") {
      const creators = await loadCreators();
      return json(res, creators);
    }

    if (url === "/api/creators/follow" && method === "POST") {
      const body = await readBody(req);
      if (body.handle) await followCreator(body.handle);
      return json(res, { ok: true });
    }

    if (url === "/api/creators/unfollow" && method === "POST") {
      const body = await readBody(req);
      if (body.handle) await unfollowCreator(body.handle);
      return json(res, { ok: true });
    }

    // ---- Research APIs ----
    if (url === "/api/research" && method === "POST") {
      const body = await readBody(req);
      const query = body.query || "";
      if (!query) return json(res, { error: "query required" }, 400);

      // Run research asynchronously but also track via command status
      try {
        statuses.research = { state: "running", startedAt: new Date().toISOString() };
        const result = await runResearch(query, {
          quick: body.quick || false,
          minLikes: body.minLikes || 0,
        });
        latestResearch = result;
        statuses.research = { state: "complete", startedAt: statuses.research.startedAt, completedAt: new Date().toISOString() };
        return json(res, { ok: true, result });
      } catch (e: any) {
        statuses.research = { state: "error", startedAt: statuses.research?.startedAt, completedAt: new Date().toISOString(), error: e.message };
        return json(res, { error: e.message }, 500);
      }
    }

    if (url === "/api/research/latest" && method === "GET") {
      return json(res, latestResearch || {});
    }

    if (url === "/api/research/thread" && method === "POST") {
      const body = await readBody(req);
      if (!body.tweetId) return json(res, { error: "tweetId required" }, 400);
      try {
        const result = await followThread(body.tweetId);
        return json(res, result);
      } catch (e: any) {
        return json(res, { error: e.message }, 500);
      }
    }

    // ---- Heartbeat APIs ----
    if (url === "/api/heartbeat/status" && method === "GET") {
      const status = await getHeartbeatStatus();
      return json(res, status);
    }

    if (url === "/api/heartbeat/run" && method === "POST") {
      const { readyTasks } = await heartbeatCheck();
      const ran: string[] = [];
      for (const task of readyTasks) {
        try {
          switch (task.name) {
            case "daily":
              runCommand("daily", async () => {
                const creators = await loadCreators();
                await scrapeCreators(creators);
                try { await scrapeTrends(); } catch {}
                const scraped = await loadLatestScrapedData();
                await generateTweets(scraped, { abTest: false });
                await generateBlog(scraped);
                await generateReels(scraped);
                try { await runLearnPass(); } catch {}
              }).catch((e) => log.error(`Heartbeat daily failed: ${e.message}`));
              ran.push("daily");
              break;
            case "trends":
              runCommand("trends", async () => {
                await scrapeTrends();
              }).catch((e) => log.error(`Heartbeat trends failed: ${e.message}`));
              ran.push("trends");
              break;
            case "learn":
              runCommand("learn", async () => {
                await runLearnPass();
              }).catch((e) => log.error(`Heartbeat learn failed: ${e.message}`));
              ran.push("learn");
              break;
          }
          await markTaskComplete(task.name);
        } catch (e: any) {
          log.error(`Heartbeat task ${task.name} failed: ${e.message}`);
        }
      }
      return json(res, { ok: true, ran, total: readyTasks.length });
    }

    // ---- Command APIs ----
    if (url === "/api/status" && method === "GET") {
      return json(res, statuses);
    }

    if (url === "/api/run/scrape" && method === "POST") {
      runCommand("scrape", async () => {
        const creators = await loadCreators();
        log.info(`Scraping ${creators.length} creator(s)...`);
        await scrapeCreators(creators);
        log.success("Scrape complete");
      }).catch((e) => log.error(`Scrape failed: ${e.message}`));
      return json(res, { ok: true, status: "started" });
    }

    if (url === "/api/run/trends" && method === "POST") {
      runCommand("trends", async () => {
        await scrapeTrends();
      }).catch((e) => log.error(`Trends failed: ${e.message}`));
      return json(res, { ok: true, status: "started" });
    }

    if (url === "/api/run/generate" && method === "POST") {
      const body = await readBody(req);
      const ab = !!body.ab;
      runCommand("generate", async () => {
        const scraped = await loadLatestScrapedData();
        await generateTweets(scraped, { abTest: ab });
        await generateBlog(scraped);
        await generateReels(scraped);
        log.success("All content generated");
        try { await runLearnPass(); } catch (e: any) {
          log.warn(`Auto-learn skipped: ${e.message}`);
        }
      }).catch((e) => log.error(`Generate failed: ${e.message}`));
      return json(res, { ok: true, status: "started" });
    }

    if (url === "/api/run/daily" && method === "POST") {
      const body = await readBody(req);
      const ab = !!body.ab;
      runCommand("daily", async () => {
        const creators = await loadCreators();
        log.info(`Scraping ${creators.length} creator(s)...`);
        await scrapeCreators(creators);
        try { await scrapeTrends(); } catch (e: any) {
          log.warn(`Trends scrape failed: ${e.message}`);
        }
        const scraped = await loadLatestScrapedData();
        await generateTweets(scraped, { abTest: ab });
        await generateBlog(scraped);
        await generateReels(scraped);
        log.success("Daily pipeline complete");
        try { await runLearnPass(); } catch (e: any) {
          log.warn(`Auto-learn skipped: ${e.message}`);
        }
      }).catch((e) => log.error(`Daily failed: ${e.message}`));
      return json(res, { ok: true, status: "started" });
    }

    if (url === "/api/run/learn" && method === "POST") {
      runCommand("learn", async () => {
        await runLearnPass();
      }).catch((e) => log.error(`Learn failed: ${e.message}`));
      return json(res, { ok: true, status: "started" });
    }

    // ---- Default: serve dashboard HTML ----
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHtml());
  } catch (e: any) {
    log.error(`Server error: ${e.message}`);
    json(res, { error: e.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Viral Content Engine UI`);
  console.log(`  \u2192 http://localhost:${PORT}\n`);
});
