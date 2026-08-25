/**
 * 欧宝坦克大战 — Node.js Playwright 浏览器自动化测试
 * 避免 Windows 沙箱限制：使用系统 Chrome + 设置 PLAYWRIGHT_BROWSERS_PATH
 * 运行：node tests/test-browser-node.mjs
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT, 'test-screenshots', 'node-playwright');
const BROWSER_LOG = path.join(ROOT, 'test-screenshots', 'node-browser-events.json');
const PORT = process.env.TEST_PORT || 8766;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ============= 1. 启动本地 HTTP 服务器 =============
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log('[SRV] HTTP 服务器启动: http://127.0.0.1:' + PORT);

// ============= 2. 事件收集 =============
const events = {
  console_errors: [],
  console_warnings: [],
  console_logs: [],
  page_errors: [],   // 未捕获异常
  failed_tests: [],
  passed_tests: [],
  action_log: [],
};

function log(msg) { console.log('[TST] ' + msg); }
function logAction(msg) { events.action_log.push(msg); console.log('[ACT] ' + msg); }

async function takeScreenshot(page, name) {
  const f = path.join(SCREENSHOT_DIR, name + '.png');
  try {
    await page.screenshot({ path: f });
    console.log('[IMG] ' + path.relative(ROOT, f));
  } catch (e) {
    console.log('[IMG-FAIL] ' + name + ': ' + e.message.split('\n')[0]);
  }
  return f;
}

async function expectNoError(testName, fn) {
  try {
    const r = await fn();
    events.passed_tests.push(testName);
    console.log('[✓PASS] ' + testName + (r ? ' -> ' + String(r) : ''));
    return { pass: true, value: r };
  } catch (e) {
    events.failed_tests.push({ name: testName, error: e.message });
    console.log('[✗FAIL] ' + testName + ': ' + e.message);
    return { pass: false, error: e.message };
  }
}

async function waitForState(page, target, timeoutMs = 12000) {
  const t0 = Date.now();
  let s;
  do {
    s = await getGameState(page);
    if (s.state === target) return s;
    await page.waitForTimeout(200);
  } while (Date.now() - t0 < timeoutMs);
  throw new Error('等待 state=' + target + ' 超时，当前 state=' + (s ? s.state : 'unknown'));
}

async function backToMenu(page) {
  for (let i = 0; i < 12; i++) {
    const s = await getGameState(page);
    if (s.state === 'menu') return s;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const s2 = await getGameState(page);
    if (s2.state === 'countdown' || s2.state === 'round') {
      // countdown/round 期间 Escape 可能无效：先让状态自然推进(倒计时结束/局结束)再按
      await page.waitForTimeout(3600);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
  }
  throw new Error('无法回到菜单，当前 state=' + (await getGameState(page)).state);
}

async function getGameState(page) {
  try {
    return await page.evaluate(() => {
      const g = window.__game || window.game;
      if (!g) return { error: 'no game instance' };
      return {
        state: g.state,
        gameMode: g.gameMode,
        mapIdx: g.mapIdx,
        aiDifficulty: g.aiDifficulty,
        aiCount: g.aiCount,
        tankCount: g.tanks?.length ?? 0,
        tanksAlive: g.tanks?.filter(t => t.alive).length ?? 0,
        scores: g.scores,
        roundNum: g.roundNum,
        bullets: g.bullets?.length ?? 0,
        trackMarksCount: g.trackMarks?.length ?? 0,
        hasBaseDefense: !!g.baseDefense,
        hasConvoyEscort: !!g.convoyEscort,
        ddBaseDifficulty: g.dynamicDifficulty?.baseDifficulty,
      };
    });
  } catch (e) { return { error: e.message }; }
}

async function getTankDetails(page) {
  try {
    return await page.evaluate(() => {
      const g = window.__game || window.game;
      if (!g || !g.tanks) return [];
      return g.tanks.map((t, i) => ({
        id: t.id, name: t.name, alive: t.alive,
        hp: t.hp, maxHp: t.maxHp, dirKey: t.dirKey,
        hasFace: 'face' in t,
        isPlayer: t.isPlayer,
        team: t.team,
      }));
    });
  } catch (e) { return [{ error: e.message }]; }
}

// ============= 3. 启动浏览器 =============
log('启动 Chromium (channel=chrome, 系统 Chrome)...');
let browser, page;
try {
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--mute-audio',
      '--disable-default-apps',
      '--disable-sync',
      '--hide-scrollbars',
    ],
  });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page = await ctx.newPage();

  // 捕获事件
  page.on('console', (msg) => {
    const type = msg.type();
    const text = `[${type}] ${msg.text()}`;
    if (type === 'error') { events.console_errors.push(text); console.log('[C-ERR] ' + text); }
    else if (type === 'warning') { events.console_warnings.push(text); console.log('[C-WARN] ' + text); }
    else events.console_logs.push(text);
  });
  page.on('pageerror', (err) => {
    const text = err.message + '\n  at ' + (err.stack || '').split('\n').slice(0, 3).join('\n  ');
    events.page_errors.push(text);
    console.log('[P-ERR] ' + err.message);
  });

  // 拦截 main.js：把 const game 改成 window.game 暴露实例
  await page.route('**/js/main.js', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    body = body.replace('const game=', 'window.game=');
    await route.fulfill({ response: resp, body });
  });

  const URL = 'http://127.0.0.1:' + PORT + '/index.html';
  logAction('navigate to ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);  // 等待 game.start()
  // 跳过新手教程：教程激活时会拦截 Enter 且消费按键，导致后续模式切换时序错位
  await page.evaluate(() => { window.game.tutorial.skip(); });
  await page.waitForTimeout(150);

  const state0 = await getGameState(page);
  log('初始 game 状态: state=' + state0.state + ' gameMode=' + state0.gameMode);
  await takeScreenshot(page, '01_menu_initial');

  // ================== 测试用例 ==================

  // ------- 菜单操作 -------
  await expectNoError('切换地图 → 按 3 次 →', async () => {
    for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); }
    await takeScreenshot(page, '02_menu_map_right3');
    const s = await getGameState(page);
    if (s.mapIdx !== 3) throw new Error('mapIdx=' + s.mapIdx + ' 期望 3');
    return 'mapIdx=3';
  });

  await expectNoError('切回地图 → 按 1 次 ←', async () => {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const s = await getGameState(page);
    if (s.mapIdx !== 2) throw new Error('mapIdx=' + s.mapIdx + ' 期望 2');
    return 'mapIdx=2';
  });

  await expectNoError('切换难度 (Q) aiDifficulty=1→2(hard)', async () => {
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(80);
    await takeScreenshot(page, '03_menu_aiDifficulty_hard');
    const s = await getGameState(page);
    if (s.aiDifficulty !== 2) throw new Error('aiDifficulty=' + s.aiDifficulty + ' 期望 2');
    return 'aiDifficulty=2 (hard)';
  });

  await expectNoError('调整AI数量 (X+2, Z-1)', async () => {
    await page.keyboard.press('KeyX'); await page.waitForTimeout(80);
    await page.keyboard.press('KeyX'); await page.waitForTimeout(80);
    await page.keyboard.press('KeyZ'); await page.waitForTimeout(80);
    await takeScreenshot(page, '04_menu_ai_count');
    const s = await getGameState(page);
    return 'aiCount=' + s.aiCount;
  });

  await expectNoError('切换车型 (V)', async () => {
    await page.keyboard.press('KeyV'); await page.waitForTimeout(100);
    await takeScreenshot(page, '05_menu_tank_class');
    return true;
  });

  // ------- P0-1: 排行榜崩溃测试 -------
  await expectNoError('[P0-1] 按 L 打开排行榜不会崩溃 (CX bug 验证)', async () => {
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(300);
    await takeScreenshot(page, '06_menu_leaderboard');
    // 检查 page_errors 是否有 CX
    const cxErr = events.page_errors.some(e => e.includes('CX is not defined'));
    await page.keyboard.press('KeyL');  // 尝试关闭
    await page.waitForTimeout(150);
    if (cxErr) throw new Error('已抛出 ReferenceError: CX is not defined (排行榜崩溃, 会中断 game.loop)');
    return '未抛 CX 错误';
  });

  // ------- 单人模式 -------
  await expectNoError('切换单人模式 (Digit1)', async () => {
    await page.keyboard.press('Digit1'); await page.waitForTimeout(150);
    const s = await getGameState(page);
    if (s.gameMode !== 0) throw new Error('gameMode=' + s.gameMode);
    return 'gameMode=0 (solo)';
  });

  await expectNoError('单人模式开始游戏 (Enter) + 倒计时结束进入 play', async () => {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    await takeScreenshot(page, '07_solo_countdown_3');
    await page.waitForTimeout(3500);
    await takeScreenshot(page, '08_solo_play_started');
    const s = await getGameState(page);
    if (s.state === 'menu') throw new Error('仍在 menu 状态，game.loop 可能被排行榜 bug 中断');
    if (s.tankCount < 2) throw new Error('坦克数量=' + s.tankCount + ' 期望至少 2');
    return 'state=' + s.state + ' tanks=' + s.tankCount;
  });

  await expectNoError('单人模式移动坦克 (按 W + D)', async () => {
    for (let i = 0; i < 15; i++) {
      await page.keyboard.down('KeyW'); await page.waitForTimeout(80);
      await page.keyboard.up('KeyW');
    }
    for (let i = 0; i < 15; i++) {
      await page.keyboard.down('KeyD'); await page.waitForTimeout(80);
      await page.keyboard.up('KeyD');
    }
    await takeScreenshot(page, '09_solo_moved');
    const tanks = await getTankDetails(page);
    const p1 = tanks.find(t => t.id === 0);
    return 'P1 hp=' + (p1?.hp ?? 'N/A') + '/' + (p1?.maxHp ?? 'N/A');
  });

  await expectNoError('单人模式开火 (F)', async () => {
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('KeyF'); await page.waitForTimeout(120);
    }
    await takeScreenshot(page, '10_solo_fired');
    const s = await getGameState(page);
    return 'bullets=' + s.bullets;
  });

  await expectNoError('暂停 (P) 继续 (P)', async () => {
    await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
    await takeScreenshot(page, '11_solo_paused');
    await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
    return true;
  });

  await expectNoError('单人模式运行 8 秒不崩溃（长时间运行 + low hp 触发战损视觉 draw）', async () => {
    // 让坦克低血量，验证 draw 不抛错误（包括 chance(dt*3) 的战损冒烟）
    await page.evaluate(() => {
      const g = window.__game || window.game;
      if (g?.tanks?.[0]) g.tanks[0].hp = 30; // 让血量低于 50% 触发战损视觉
    });
    await page.waitForTimeout(8000);
    await takeScreenshot(page, '12_solo_long_run_low_hp');
    const tanks = await getTankDetails(page);
    const p1 = tanks.find(t => t.id === 0);
    return 'P1 hasFace=' + p1?.hasFace + ' isPlayer=' + p1?.isPlayer + ' alive=' + p1?.alive;
  });

  // ------- P0-2: 基地保卫战开局崩溃 -------
  await expectNoError('[P0-2] 基地保卫战 (模式3) 开局不崩溃 (s1 未定义验证)', async () => {
    await backToMenu(page);
    await page.keyboard.press('Digit4'); await page.waitForTimeout(150);
    await takeScreenshot(page, '13_mode3_base');
    const errCountBefore = events.page_errors.length;
    await page.keyboard.press('Enter');
    const s = await waitForState(page, 'play', 20000);  // 真正进入 play（含倒计时）
    await takeScreenshot(page, '14_mode3_started');
    const s1err = events.page_errors.slice(errCountBefore).some(e => e.includes('s1 is not defined'));
    if (s1err) throw new Error('已抛出 ReferenceError: s1 is not defined (基地保卫战开局崩溃)');
    if (s.gameMode !== 3) throw new Error('gameMode=' + s.gameMode + ' 期望 3（模式切换未生效）');
    if (!s.hasBaseDefense) throw new Error('hasBaseDefense=false，基地未创建');
    return 'state=' + s.state + ' hasBaseDefense=' + s.hasBaseDefense;
  });

  // ------- 护送装甲车模式 -------
  await expectNoError('护送装甲车 (模式4) 可开局运行', async () => {
    await backToMenu(page);
    await page.keyboard.press('Digit5'); await page.waitForTimeout(150);
    await takeScreenshot(page, '15_mode4_convoy');
    await page.keyboard.press('Enter');
    const s = await waitForState(page, 'play', 20000);
    await takeScreenshot(page, '16_mode4_started');
    if (s.gameMode !== 4) throw new Error('gameMode=' + s.gameMode + ' 期望 4（模式切换未生效）');
    if (!s.hasConvoyEscort) throw new Error('hasConvoyEscort=false，护送车未创建');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '17_mode4_after_3s');
    const s2 = await getGameState(page);
    return 'convoy=on, tanks=' + s.tankCount + ' → 3s后 state=' + s2.state;
  });

  // ------- 双人对战 -------
  await expectNoError('[双人模式] 进入 play + 玩家互伤 (P1子弹命中P2)', async () => {
    // 用 evaluate 直接设置双人模式，避免键盘时序问题
    await page.evaluate(() => {
      const g = window.__game || window.game;
      g.gameMode = 1;
      g.startMatch(0);
    });
    await page.waitForTimeout(3500);
    await takeScreenshot(page, '18_mode2_doubles');
    const pre = await getGameState(page);
    if (pre.gameMode !== 1) throw new Error('切换双人失败 gameMode=' + pre.gameMode);
    await takeScreenshot(page, '19_doubles_started');
    // 用 evaluate 直接测试互伤逻辑
    const result = await page.evaluate(() => {
      const g = window.__game || window.game;
      const p1 = g.tanks[0], p2 = g.tanks[1];
      if (!p1 || !p2) return { error: 'tanks missing' };
      const hpBefore = p2.hp;
      p1.invuln = 0; p2.invuln = 0; p2.buff.shield = 0;
      p2.takeDamage(35, p1, g);
      return { hpBefore, hpAfter: p2.hp, p1Team: p1.team, p2Team: p2.team, p2IsPlayer: p2.isPlayer };
    });
    if (result.error) throw new Error(result.error);
    if (result.hpBefore === result.hpAfter) throw new Error('P2 HP 不变 (' + result.hpAfter + ')，双人模式可能无法互伤');
    if (result.p2IsPlayer === true) throw new Error('双人对战 P2 不应是玩家(isPlayer=true)，双方互为敌人');
    return 'P2 HP ' + result.hpBefore + ' → ' + result.hpAfter + '（成功互伤, P1 team=' + result.p1Team + ' P2 team=' + result.p2Team + ')';
  });

  // ------- 协作模式（阵营 bug 验证：P2 isPlayer 应为 true） -------
  await expectNoError('[P0-1] 协作模式 P2 isPlayer=true (阵营正确)', async () => {
    // 用 evaluate 直接设置协作模式，避免键盘时序问题
    await page.evaluate(() => {
      const g = window.__game || window.game;
      g.gameMode = 2;
      g.startMatch(0);
    });
    await page.waitForTimeout(3500);
    await takeScreenshot(page, '21_coop_started');
    const tanks = await getTankDetails(page);
    const p1 = tanks.find(t => t.id === 0);
    const p2 = tanks.find(t => t.id === 1);
    if (p2?.isPlayer === false) throw new Error('P2 isPlayer=false → 会被当作敌人导致阵营错乱: P1=' + p1?.isPlayer + ', P2=' + p2?.isPlayer);
    return 'P1.isPlayer=' + p1?.isPlayer + ', P2.isPlayer=' + p2?.isPlayer;
  });

  // ------- P0-3: slow buff HUD 崩溃 -------
  await expectNoError('[P0-3] 给玩家加 slow=1.5 后 draw 不崩溃 (slow HUD color bug)', async () => {
    await page.evaluate(() => {
      const g = window.__game || window.game;
      if (g?.tanks?.[0]) g.tanks[0].buff.slow = 1.5; // 模拟断履带 / EMP
    });
    await page.waitForTimeout(500);  // 让 draw 跑几帧
    await takeScreenshot(page, '22_slow_buff_draw');
    const drawErr = events.page_errors.some(e => e.includes("reading 'color'") || e.includes("Cannot read properties of undefined"));
    if (drawErr) throw new Error('slow buff draw 崩溃: Cannot read properties of undefined (reading color)');
    return true;
  });

  // ================== 收尾 ==================
  log('\n========== 浏览器自动化测试完成 ==========');
  log('通过用例: ' + events.passed_tests.length);
  log('失败用例: ' + events.failed_tests.length);
  log('捕获 page_errors: ' + events.page_errors.length);
  log('捕获 console_errors: ' + events.console_errors.length);
  log('捕获 console_warnings: ' + events.console_warnings.length);

  if (events.failed_tests.length > 0) {
    console.log('\n--- 失败用例详情 ---');
    for (const f of events.failed_tests) console.log('  ✗ ' + f.name + ': ' + f.error);
  }
  if (events.page_errors.length > 0) {
    console.log('\n--- 页面未捕获异常 ---');
    for (const e of events.page_errors) console.log('  ❗ ' + e.split('\n')[0]);
  }

} catch (e) {
  console.error('[FATAL] 测试流程异常:', e);
  events.failed_tests.push({ name: '__FATAL__', error: e.message });
} finally {
  // 保存事件
  fs.writeFileSync(BROWSER_LOG, JSON.stringify({
    passed: events.passed_tests,
    failed: events.failed_tests,
    page_errors: events.page_errors,
    console_errors: events.console_errors.slice(0, 100),
    console_warnings: events.console_warnings.slice(0, 50),
    action_log: events.action_log,
    summary: {
      passed_count: events.passed_tests.length,
      failed_count: events.failed_tests.length,
      page_errors_count: events.page_errors.length,
      console_errors_count: events.console_errors.length,
      console_warnings_count: events.console_warnings.length,
    },
  }, null, 2), 'utf8');
  console.log('\n[LOG] 浏览器日志已保存:', path.relative(ROOT, BROWSER_LOG));

  if (page) try { await page.close(); } catch {}
  if (browser) try { await browser.close(); } catch {}
  try { server.close(); } catch {}
  console.log('[FIN] 浏览器关闭, 服务器停止.');
}

process.exit(0);
