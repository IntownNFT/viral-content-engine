import http from "http";
import fs from "fs/promises";
import path from "path";
import { loadConfig, getDataRoot } from "./utils/config.js";

loadConfig();

const OUTPUT = path.join(getDataRoot(), "output");
const PORT = 3333;

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
  .header { background: #111; border-bottom: 1px solid #222; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 20px; font-weight: 600; color: #fff; }
  .header span { color: #666; font-size: 14px; }
  .tabs { display: flex; gap: 0; background: #111; border-bottom: 1px solid #222; padding: 0 32px; }
  .tab { padding: 14px 24px; cursor: pointer; color: #888; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: all 0.2s; }
  .tab:hover { color: #ccc; }
  .tab.active { color: #00C853; border-bottom-color: #00C853; }
  .count { background: #1a1a1a; color: #888; font-size: 11px; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }
  .tab.active .count { background: #00C85322; color: #00C853; }
  .main { max-width: 800px; margin: 0 auto; padding: 32px; }
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
  .refresh { background: none; border: 1px solid #333; color: #888; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .refresh:hover { border-color: #00C853; color: #00C853; }
</style>
</head>
<body>
<div class="header">
  <h1>Viral Content Engine</h1>
  <span id="lastRun"></span>
  <div style="flex:1"></div>
  <button class="refresh" onclick="loadAll()">Refresh</button>
</div>
<div class="tabs">
  <div class="tab active" data-tab="tweets">Tweets <span class="count" id="count-tweets">0</span></div>
  <div class="tab" data-tab="blogs">Blogs <span class="count" id="count-blogs">0</span></div>
  <div class="tab" data-tab="reels">Reels <span class="count" id="count-reels">0</span></div>
</div>
<div class="main" id="main"></div>
<script>
var data = { tweets: [], blogs: [], reels: [] };
var activeTab = 'tweets';

document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
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

function copyContent(idx) {
  var item = data[activeTab][idx];
  navigator.clipboard.writeText(item.content).then(function() {
    var btn = document.getElementById('copy-' + idx);
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy raw'; }, 1500);
  });
}

function toggleCard(idx) {
  var card = document.getElementById('card-' + idx);
  card.classList.toggle('open');
}

function render() {
  var items = data[activeTab] || [];
  var el = document.getElementById('main');
  if (items.length === 0) {
    el.innerHTML = '<div class="empty"><p>No content yet. Run npm run generate</p></div>';
    return;
  }
  var cards = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var openClass = i === 0 ? 'card open' : 'card';
    cards.push(
      '<div class="' + openClass + '" id="card-' + i + '">' +
        '<div class="card-header" onclick="toggleCard(' + i + ')">' +
          '<span class="card-title">' + escapeHtml(item.name) + '</span>' +
          '<span class="card-toggle">&#9662;</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div style="text-align:right;margin-bottom:12px">' +
            '<button class="copy-btn" id="copy-' + i + '" onclick="copyContent(' + i + ')">Copy raw</button>' +
          '</div>' +
          '<div class="prose">' + mdToHtml(item.content) + '</div>' +
        '</div>' +
      '</div>'
    );
  }
  el.innerHTML = cards.join('');
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
}

loadAll();
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/content") {
    const [tweets, blogs, reels] = await Promise.all([
      getFiles("tweets"),
      getFiles("blogs"),
      getFiles("reels"),
    ]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ tweets, blogs, reels }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(buildHtml());
});

server.listen(PORT, () => {
  console.log(`\n  Viral Content Engine UI`);
  console.log(`  → http://localhost:${PORT}\n`);
});
