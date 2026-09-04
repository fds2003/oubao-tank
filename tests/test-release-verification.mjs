/**
 * 欧宝坦克大战 — 上线前实测（多浏览器 × 多分辨率 × 10AI 帧率 × 多局内存趋势）
 * 运行：node tests/test-release-verification.mjs [--all]
 *   --all       尝试全部引擎 chromium+firefox+webkit（未安装的引擎自动 SKIP）
 *   默认只跑 chromium（channel=chrome，系统 Chrome）
 *
 * 局限说明：headless + 软件渲染下 FPS 仅作基准，不代表真机 GPU 表现；
 * 但可稳定暴露「卡顿 / 帧耗爆表 / 多局内存不回收 / 分辨率适配崩溃」类问题。
 */
import { chromium, firefox, webkit } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'test-screenshots', 'release-verification');
const REPORT_FILE = path.join(ROOT, 'tests', 'release-verification-results.md');
const PORT = Number(process.env.TEST_PORT) || 8867;
const WANT_ALL = process.argv.includes('--all');

fs.mkdirSync(SHOT_DIR, { recursive: true });

// ============ 1. 静态服务器（与 test-browser-node 同款） ============
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};
// 路径别名（与 server.js / vercel.json 一致）
const ALIAS = {
  '/play': '/play.html',
  '/about': '/about.html',
  '/privacy': '/privacy.html',
  '/tank-battle-guide': '/tank-battle-guide.html',
  '/2-player-tank-game': '/2-player-tank-game.html',
  '/classic-tank-games': '/classic-tank-games.html',
};
const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); res.end('Bad request'); return; }
  if (urlPath === '/') urlPath = '/index.html';
  else if (ALIAS[urlPath]) urlPath = ALIAS[urlPath];
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log('[SRV] 本地服务器 http://127.0.0.1:' + PORT);

// ============ 2. 配置 ============
const VIEWPORTS = [
  { name: '1280x720 (低配 16:9)', w: 1280, h: 720 },
  { name: '1280x1024 (5:4 letterbox)', w: 1280, h: 1024 },
  { name: '1920x1080 (1080p)', w: 1920, h: 1080 },
  { name: '2560x1440 (1440p)', w: 2560, h: 1440 },
  { name: '3840x2160 (4K)', w: 3840, h: 2160 },
];
const ENGINE_DEFS = [
  { id: 'chromium', label: 'Chromium(chrome)' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'webkit', label: 'WebKit' },
];

const results = [];       // 每 engine×viewport 一条
const memRounds = [];     // 内存趋势（仅 chromium 1920x1080）
const allErrors = [];     // 收集到的运行时错误样本

/**
 * 注意：此前的实测发现 headless Chrome 加 --disable-gpu --disable-software-rasterizer
 * 会导致合成器不产出 BeginFrame → requestAnimationFrame 停摆 → 游戏 state 永不推进。
 * 因此 Chromium 只保留 --mute-audio，交由浏览器自行选择渲染后端。
 */
function engineLaunch(id) {
  const base = {
    headless: true,
    args: ['--mute-audio'],
  };
  if (id === 'chromium') {
    return chromium.launch({ ...base, channel: 'chrome', args: [...base.args, '--no-sandbox', '--disable-dev-shm-usage'] });
  }
  if (id === 'firefox') return firefox.launch(base);
  return webkit.launch(base);
}

// rAF 计数钩子：统计真实渲染帧率
const RAF_PATCH = `(()=>{window.__rafCount=0;const o=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=function(cb){window.__rafCount++;return o(cb);};})();`;

const summary = { engines_skipped: [], engines_failed: [], combos_run: 0, combos_pass: 0, combos_fail: 0 };

/** 200ms 轮询等待游戏状态 */
async function waitState(page, target, timeoutMs = 12000) {
  const t0 = Date.now();
  let s;
  do {
    s = await page.evaluate(() => window.__game?.state ?? 'none');
    if (s === target) return s;
    await page.waitForTimeout(200);
  } while (Date.now() - t0 < timeoutMs);
  throw new Error(`等待 state=${target} 超时(${timeoutMs}ms)，当前 state=${s}`);
}

async function openGamePage(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await ctx.addInitScript(RAF_PATCH);
  page.on('console', m => { if (m.type() === 'error') allErrors.push(`[${vp.name}] console: ${m.text()}`); });
  page.on('pageerror', e => allErrors.push(`[${vp.name}] pageerror: ${e.message}`));
  const url = 'http://127.0.0.1:' + PORT + '/play'; // 游戏在 /play（index.html 为 SEO 落地页，不加载游戏）
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForFunction(() => !!window.__game, undefined, { timeout: 10000 });
  // 跳过新手教程（避免拦截按键/提示层干扰）
  await page.evaluate(() => { window.__game.tutorial.skip(); });
  await page.waitForTimeout(200);
  return { ctx, page };
}

/**
 * 启动 10 AI 单人局并等待进入 play。
 * 采用与 test-browser-node.mjs 相同的已验证方式：菜单态改 aiCount →
 * 真实 Enter 触发 startMatch（游戏自身路径）→ 轮询 play。
 */
async function startBattle10AI(page) {
  // rAF 门：headless 配置不当会令渲染循环停摆，1s 0 帧则立即失败并给出诊断
  const raf0 = await page.evaluate(() => window.__rafCount);
  await page.waitForTimeout(1000);
  const raf1 = await page.evaluate(() => window.__rafCount);
  const rafPerSec = raf1 - raf0;
  if (rafPerSec <= 0) {
    const err = new Error('渲染循环停摆：1s 内 0 帧（rAF 未驱动，headless 环境问题，非游戏缺陷）');
    err.rafStalled = true;
    throw err;
  }
  // 先确认处于菜单（新页面默认即为 menu）
  const cur = await page.evaluate(() => window.__game.state);
  if (cur !== 'menu') {
    await page.keyboard.press('Escape');
    await waitState(page, 'menu');
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.aiCount = 10; g.aiDifficulty = 1; g.gameMode = 0;
  });
  await page.keyboard.press('Enter'); // 走真实菜单 startMatch 路径
  await waitState(page, 'play');
  await page.waitForTimeout(600); // 稳定帧
  const st = await page.evaluate(() => {
    const g = window.__game;
    return { tanks: g.tanks.length, alive: g.tanks.filter(t => t.alive).length, aiCount: g.aiCount };
  });
  if (st.tanks !== 11) throw new Error('10AI 局坦克数=' + st.tanks + '，期望 11');
  return { ...st, rafPerSec };
}

/** 分段采样 FPS（8×500ms），返回 {avg,min,stalls} */
async function sampleFPS(page, secs = 4) {
  const snap = () => page.evaluate(() => window.__rafCount);
  const a0 = await snap();
  await page.waitForTimeout(100);
  const segs = [];
  let prev = await snap();
  const n = Math.max(4, Math.round(secs / 0.5));
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(500);
    const cur = await snap();
    segs.push((cur - prev) / 0.5);
    prev = cur;
  }
  const drops = segs.filter(s => s < 30).length;
  const sorted = [...segs].sort((x, y) => x - y);
  return {
    avg: +(segs.reduce((x, y) => x + y, 0) / segs.length).toFixed(1),
    min: +sorted[0].toFixed(1),
    p25: +sorted[Math.floor(sorted.length * 0.25)].toFixed(1),
    stalls_under30: drops,
    total_frames: prev - a0,
  };
}

/** 最小堆采样（3 次取最低，规避 GC 抖动）。优先 page.metrics，回退 performance.memory */
async function heapMin(page) {
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    let viaMetrics = null;
    try {
      const m = await page.metrics();
      if (m && m.JSHeapUsedSize) viaMetrics = m.JSHeapUsedSize;
    } catch { /* 引擎不支持 */ }
    let viaPerf = null;
    try {
      viaPerf = await page.evaluate(() => (window.performance?.memory?.usedJSHeapSize) || 0);
    } catch { /* 引擎不支持 */ }
    const v = viaMetrics || viaPerf || 0;
    if (v) best = Math.min(best, v);
    await page.waitForTimeout(150);
  }
  return best === Infinity ? 0 : best;
}

function mb(v) { return v ? (v / 1048576).toFixed(1) + ' MB' : 'n/a'; }

// ============ 3. 内存趋势：连续 6 局 startMatch，观察堆与对象数组 ============
async function memoryTrend(page, engineId) {
  if (engineId !== 'chromium') return { note: '仅 Chromium 支持 page.metrics，跳过堆采样' };
  const rows = [];
  let prevObjs = null;
  for (let r = 1; r <= 6; r++) {
    await page.evaluate(() => {
      const g = window.__game;
      g.startMatch(g.mapIdx || 0);
      g.cd = 0.06;
    });
    await page.waitForTimeout(700); // 真实推进 ~40 帧
    const heap = await heapMin(page);
    const objs = await page.evaluate(() => {
      const g = window.__game;
      return {
        tanks: g.tanks.length,
        bullets: g.bullets.length,
        powerups: g.powerups.length,
        mines: g.mines.length,
        trackMarks: (g.trackMarks || []).length,
        comboNotify: g.comboNotify.length,
        state: g.state,
      };
    });
    rows.push({ round: r, heap, ...objs });
    prevObjs = objs;
  }
  const first = rows[0].heap, last = rows[rows.length - 1].heap;
  const delta = last - first;
  const pct = first ? (delta / first * 100).toFixed(1) : 0;
  memRounds.push(...rows);
  return {
    heap_first: first, heap_last: last, heap_delta: delta, heap_pct: pct,
    leak: delta > 4 * 1048576 && pct > 15, // 阈值：>4MB 且 >15%
    rows,
  };
}

// ============ 4. 引擎矩阵 ============
async function runEngine(eng) {
  console.log(`\n===== 引擎 ${eng.label} =====`);
  let browser;
  try {
    browser = await engineLaunch(eng.id);
  } catch (e) {
    summary.engines_skipped.push({ id: eng.id, reason: e.message.split('\n')[0] });
    console.log(`[SKIP] ${eng.label} 不可用: ${e.message.split('\n')[0]}`);
    return;
  }
  console.log(`[INFO] ${eng.label} 版本: ${await browser.version()}`);
  for (const vp of VIEWPORTS) {
    const row = { engine: eng.id, engineLabel: eng.label, viewport: vp.name, w: vp.w, h: vp.h, status: 'FAIL' };
    let page;
    try {
      const opened = await openGamePage(browser, vp);
      page = opened.page;
      // 菜单冒烟（渲染 0.5s 无异常）
      await page.waitForTimeout(500);
      // 10 AI 实战 + FPS
      const st = await startBattle10AI(page);
      await page.screenshot({ path: path.join(SHOT_DIR, `${eng.id}_${vp.w}x${vp.h}_battle10.png`) }).catch(() => {});
      const fps = await sampleFPS(page, 4);
      row.fps = fps; row.start = st;
      // 内存趋势：仅对 chromium 的 1080p 组合执行一次
      if (eng.id === 'chromium' && vp.w === 1920 && vp.h === 1080) {
        const mem = await memoryTrend(page, eng.id);
        row.memory = mem;
      }
      row.status = 'PASS';
      summary.combos_pass++;
    } catch (e) {
      row.status = 'FAIL';
      row.error = e.message;
      summary.combos_fail++;
      console.log(`[FAIL] ${eng.label} @ ${vp.name}: ${e.message}`);
    } finally {
      if (page) { const c = page.context(); try { await c.close(); } catch {} }
    }
    results.push(row);
    summary.combos_run++;
    console.log(`[RES] ${eng.label} ${vp.name}: ${row.status}` + (row.fps ? ` fps avg=${row.fps.avg} min=${row.fps.min}` : '') + (row.memory ? ` | heap ${mb(row.memory.heap_first)} → ${mb(row.memory.heap_last)} (${row.memory.heap_pct}%)` : ''));
  }
  try { await browser.close(); } catch {}
}

const wantEngines = WANT_ALL ? ENGINE_DEFS : ENGINE_DEFS.filter(e => e.id === 'chromium');
console.log(`[CFG] 引擎=${wantEngines.map(e => e.id).join(',')} 分辨率=${VIEWPORTS.length} 种`);
for (const eng of wantEngines) await runEngine(eng);

// ============ 5. 汇总 ============
const env = {
  os: `${os.platform()} ${os.release()}`,
  node: process.version,
  playwright: '^1.62.1',
  date: new Date().toISOString(),
};
const md = [];
md.push('# 上线前实测报告 — 欧宝坦克大战');
md.push('');
md.push(`> 日期：${env.date} ｜ OS：${env.os} ｜ Node：${env.node}`);
md.push('> 方式：Playwright headless（软件渲染）。FPS 为基准值，真机 GPU 通常更高。');
md.push('');
md.push('## 引擎可用性');
for (const s of summary.engines_skipped) md.push(`- ⚠️ ${s.id} 不可用: ${s.reason}`);
if (!summary.engines_skipped.length) md.push('- 全部引擎可用');
md.push('');
md.push('## 矩阵结果（10 AI 实战 4s 采样）');
md.push('| 引擎 | 分辨率 | 状态 | 平均 FPS | 最低 FPS | P25 FPS | <30fps段数 |');
md.push('|---|---|---|---|---|---|---|');
for (const r of results) {
  md.push(`| ${r.engineLabel} | ${r.viewport} | ${r.status} | ${r.fps ? r.fps.avg : '-'} | ${r.fps ? r.fps.min : '-'} | ${r.fps ? r.fps.p25 : '-'} | ${r.fps ? r.fps.stalls_under30 : '-'} |`);
}
md.push('');
const fails = results.filter(r => r.status === 'FAIL');
if (fails.length) {
  md.push('## 失败详情');
  for (const r of fails) md.push(`- ${r.engineLabel} @ ${r.viewport}: ${r.error}`);
  md.push('');
}
md.push('## 多局内存趋势（Chromium 1080p，连续 6 局 startMatch）');
if (memRounds.length) {
  md.push('| 局 | JSHeapUsedSize | tanks | bullets | trackMarks | state |');
  md.push('|---|---|---|---|---|---|');
  for (const rr of memRounds) md.push(`| ${rr.round} | ${mb(rr.heap)} | ${rr.tanks} | ${rr.bullets} | ${rr.trackMarks} | ${rr.state} |`);
} else {
  md.push('（无数据）');
}
md.push('');
if (allErrors.length) {
  md.push('## 运行时错误样本（前 20 条）');
  md.push('```');
  for (const e of allErrors.slice(0, 20)) md.push(e);
  md.push('```');
  md.push('');
} else {
  md.push('## 运行时错误：无 ✅');
  md.push('');
}
md.push(`## 总结`);
md.push(`- 矩阵执行：${summary.combos_run} ｜ 通过 ${summary.combos_pass} ｜ 失败 ${summary.combos_fail}`);
md.push(`- 运行时错误总数：${allErrors.length}`);
md.push(`- 引擎跳过：${summary.engines_skipped.length}（${summary.engines_skipped.map(s => s.id).join(', ') || '无'}）`);
fs.writeFileSync(REPORT_FILE, md.join('\n'), 'utf8');
console.log('\n[REPORT] ' + path.relative(ROOT, REPORT_FILE));

// 控制台最终摘要
console.log('='.repeat(60));
console.log(`组合 ${summary.combos_run} | 通过 ${summary.combos_pass} | 失败 ${summary.combos_fail} | 运行时错误 ${allErrors.length}`);
for (const s of summary.engines_skipped) console.log(`引擎不可用: ${s.id} → ${s.reason}`);
console.log('='.repeat(60));

server.close();
process.exit(summary.combos_fail > 0 ? 1 : 0);
