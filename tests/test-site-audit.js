// tests/test-site-audit.js
// 站点全量静态审计（SEO 元信息 / FAQ 逐字一致性 / 内链矩阵 / 路由映射）TDD
//   依据「欧宝坦克大战网站 - 完整开发指令.md」§5.1~5.3 与 site_info_pages/tasks.md 9.4 / 9.5 / 10.4 / 10.6
// 运行: node tests/test-site-audit.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://fot.us.kg';
const SITE_HOST = 'fot.us.kg';

const PAGE_FILE = {
  '/': 'index.html',
  '/play': 'play.html',
  '/tank-battle-guide': 'tank-battle-guide.html',
  '/classic-tank-games': 'classic-tank-games.html',
  '/2-player-tank-game': '2-player-tank-game.html',
  '/about': 'about.html',
  '/privacy': 'privacy.html'
};
const ROUTE_SET = Object.keys(PAGE_FILE);
const INFO = ROUTE_SET.filter(r => r !== '/play'); // 可索引信息页（不含 noindex 游戏页）

// 各信息页预期 FAQ 数量（tasks 9.4 / 指令 §5.2；about/privacy 无 FAQ）
const FAQ_EXPECT = { '/': 5, '/tank-battle-guide': 6, '/classic-tank-games': 5, '/2-player-tank-game': 5 };

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; }
}

const results = [];
function test(id, name, fn) {
  try {
    const r = fn();
    const pass = r === true || r === undefined;
    results.push({ id, name, pass, detail: pass ? '' : String(r) });
  } catch (e) {
    results.push({ id, name, pass: false, detail: '[异常] ' + e.name + ': ' + e.message });
  }
}

function count(html, re) { return (html.match(re) || []).length; }
function nameMeta(html, name) {
  const m = html.match(new RegExp('<meta\\s+name="' + name + '"[^>]*content="([^"]*)"', 'i'));
  return m ? m[1] : null;
}
function propMeta(html, prop) {
  const m = html.match(new RegExp('<meta\\s+property="' + prop + '"[^>]*content="([^"]*)"', 'i'));
  return m ? m[1] : null;
}
function htmlLang(html) { const m = html.match(/<html\s+lang="([^"]+)"/i); return m ? m[1] : null; }
function canonicalOf(html) {
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return m ? m[1] : null;
}
function hasMeta(name, html) { return nameMeta(html, name) !== null; }

function ldBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1].trim())); }
    catch (e) { throw new Error('JSON-LD 解析失败: ' + e.message); }
  }
  return out;
}
function walkFAQNames(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walkFAQNames(n, out)); return; }
  const t = node['@type'];
  const ts = Array.isArray(t) ? t : (t ? [t] : []);
  if (ts.indexOf('FAQPage') >= 0) {
    const me = Array.isArray(node.mainEntity) ? node.mainEntity : (node.mainEntity ? [node.mainEntity] : []);
    for (const q of me) if (q && typeof q.name === 'string') out.push(q.name.trim());
  }
  for (const k of Object.keys(node)) {
    if (k === '@context') continue;
    walkFAQNames(node[k], out);
  }
}

function faqItems(html) {
  // 返回 [{ q, body }]
  const out = [];
  const re = /<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(html))) out.push({ q: m[1].trim(), body: m[2] });
  return out;
}
function bodyAnswerText(body) {
  const m = body.match(/<p>([\s\S]*?)<\/p>/);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function anchorsOf(html) {
  const out = [];
  const re = /<a\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function attrOf(tag, name) {
  const m = tag.match(new RegExp(name + '="([^"]*)"', 'i'));
  return m ? m[1] : null;
}
function classifyLink(href) {
  if (/^mailto:/i.test(href)) return { type: 'mail' };
  let h = href;
  if (/^https?:\/\//i.test(h)) {
    let u;
    try { u = new URL(h); } catch (e) { return { type: 'ext', raw: h }; }
    if (u.host !== SITE_HOST) return { type: 'ext', raw: h, host: u.host };
    h = u.pathname;
  }
  h = h.split('#')[0];
  if (h.startsWith('/')) {
    const p = h.length > 1 ? h.replace(/\/+$/, '') : '/';
    return { type: 'int', p };
  }
  return { type: 'rel', raw: href };
}

const pageHtml = {};
for (const [route, file] of Object.entries(PAGE_FILE)) pageHtml[route] = read(file);

// ============ A. 逐页元信息（§5.1，6 个信息页） ============
test('A1-titles-unique', '6 个信息页 title 全站唯一且非空', () => {
  const titles = INFO.map(r => {
    const m = pageHtml[r].match(/<title>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : '';
  });
  if (titles.some(t => !t)) return '存在空 title';
  if (new Set(titles).size !== INFO.length) return 'title 存在重复（全站须唯一）';
  return true;
});

test('A2-title-length', 'title ≤60 字符（§5.1）', () => {
  for (const r of INFO) {
    const m = pageHtml[r].match(/<title>([\s\S]*?)<\/title>/i);
    const len = m ? [...m[1].trim()].length : 0;
    if (len > 60) return r + ' title 长度 ' + len + ' 超过 60';
  }
  return true;
});

test('A3-description', '6 个信息页均有 description 且 ≤160 字符（§5.1）', () => {
  for (const r of INFO) {
    const d = nameMeta(pageHtml[r], 'description');
    if (!d) return r + ' 缺少 meta description';
    if ([...d].length > 160) return r + ' description 长度 ' + [...d].length + ' 超过 160';
  }
  return true;
});

test('A4-h1-unique', '每个信息页恰好 1 个 H1（§5.1）', () => {
  for (const r of INFO) {
    const n = count(pageHtml[r], /<h1[\s>]/gi);
    if (n !== 1) return r + ' H1 数量为 ' + n;
  }
  return true;
});

test('A5-canonical', 'canonical 指向自身美观路径', () => {
  for (const r of INFO) {
    const c = canonicalOf(pageHtml[r]);
    if (c !== SITE + r) return r + ' canonical=' + c + '，期望 ' + SITE + r;
  }
  const pc = canonicalOf(pageHtml['/play']);
  if (pc !== SITE + '/play') return 'play canonical=' + pc;
  return true;
});

test('A6-og-url', 'og:url 与 canonical 一致且 OG 标签齐备', () => {
  for (const r of INFO) {
    const h = pageHtml[r];
    const c = canonicalOf(h);
    if (propMeta(h, 'og:url') !== c) return r + ' og:url 与 canonical 不一致';
    for (const p of ['og:title', 'og:description', 'og:image']) {
      if (!propMeta(h, p)) return r + ' 缺少 ' + p;
    }
    if (!propMeta(h, 'og:type')) return r + ' 缺少 og:type';
  }
  return true;
});

test('A7-twitter', 'Twitter Card 标签齐备（§5.1）', () => {
  for (const r of INFO) {
    const h = pageHtml[r];
    if (!/twitter:card" content="summary_large_image"/i.test(h)) return r + ' twitter:card 非 summary_large_image';
    for (const n of ['twitter:title', 'twitter:description', 'twitter:image']) {
      if (!nameMeta(h, n)) return r + ' 缺少 ' + n;
    }
  }
  return true;
});

test('A8-doc-basics', 'html lang=zh-CN，charset/viewport/theme-color 齐备', () => {
  for (const r of INFO) {
    const h = pageHtml[r];
    if (htmlLang(h) !== 'zh-CN') return r + ' html lang 不为 zh-CN';
    if (!/<meta charset="UTF-8"/i.test(h)) return r + ' 缺少 charset';
    if (!/<meta name="viewport"[^>]*width=device-width/i.test(h)) return r + ' 缺少响应式 viewport';
    if (!nameMeta(h, 'theme-color')) return r + ' 缺少 theme-color';
  }
  return true;
});

test('A9-shared-layer', '信息页复用 css/site.css + js/site.js，且零游戏脚本', () => {
  for (const r of INFO) {
    const h = pageHtml[r];
    if (!h.includes('css/site.css')) return r + ' 未引入 css/site.css';
    if (!h.includes('js/site.js')) return r + ' 未引入 js/site.js';
    if (/<script[^>]+src="js\/(utils|game|main)\.js"/.test(h)) return r + ' 不得加载游戏脚本';
  }
  return true;
});

// ============ B. FAQ 一致性（§5.2 / tasks 9.4） ============
for (const [route, expectN] of Object.entries(FAQ_EXPECT)) {
  test('B-faq-' + (route === '/' ? 'root' : route.slice(1)), 'FAQ ' + route + ' 应为 ' + expectN + ' 条且 <summary> 与 JSON-LD 逐字一致', () => {
    const h = pageHtml[route];
    const items = faqItems(h);
    if (items.length !== expectN) return '可见 FAQ 为 ' + items.length + ' 条，期望 ' + expectN;
    const names = [];
    walkFAQNames(ldBlocks(h), names);
    if (names.length !== expectN) return 'FAQPage JSON-LD 为 ' + names.length + ' 条，期望 ' + expectN;
    for (let i = 0; i < expectN; i++) {
      if (items[i].q !== names[i]) return '第 ' + (i + 1) + ' 条 <summary>「' + items[i].q + '」≠ JSON-LD name「' + names[i] + '」';
      if (!bodyAnswerText(items[i].body)) return '第 ' + (i + 1) + ' 条 FAQ 答案为空';
    }
    return true;
  });
}

test('B-faq-none', 'about/privacy 无 FAQ 与 FAQPage JSON-LD', () => {
  for (const r of ['/about', '/privacy']) {
    const h = pageHtml[r];
    if (faqItems(h).length !== 0) return r + ' 不应包含 faq-item';
    const names = [];
    walkFAQNames(ldBlocks(h), names);
    if (names.length !== 0) return r + ' 不应输出 FAQPage JSON-LD';
  }
  return true;
});

// ============ C. 链接契约（tasks 9.5 / 10.6） ============
test('C1-internal-links', '全部站内 <a> 链接须为已知路由，无相对/未知路径', () => {
  for (const r of ROUTE_SET) {
    for (const tag of anchorsOf(pageHtml[r])) {
      const href = attrOf(tag, 'href');
      if (!href || href === '#') continue;
      const k = classifyLink(href);
      if (k.type === 'int' && ROUTE_SET.indexOf(k.p) < 0) return r + ' 存在未知站内链接: ' + href;
      if (k.type === 'rel') return r + ' 禁止相对链接: ' + href;
    }
  }
  return true;
});

test('C2-external-links', '外链仅允许盘点页 7 个，且 target=_blank + rel=noopener nofollow', () => {
  const externalByPage = {};
  for (const r of ROUTE_SET) {
    const exts = [];
    for (const tag of anchorsOf(pageHtml[r])) {
      const href = attrOf(tag, 'href');
      if (!href) continue;
      const k = classifyLink(href);
      if (k.type === 'ext') exts.push({ tag, href: k.raw });
    }
    externalByPage[r] = exts;
    if (r !== '/classic-tank-games' && exts.length > 0) return r + ' 不应包含外链: ' + exts[0].href;
  }
  const classic = externalByPage['/classic-tank-games'];
  if (classic.length !== 7) return '盘点页外链应为 7 个，实际 ' + classic.length;
  for (const { tag, href } of classic) {
    if (!/^https:\/\//i.test(href)) return '盘点页外链必须为 HTTPS: ' + href;
    const target = attrOf(tag, 'target');
    const rel = attrOf(tag, 'rel') || '';
    if (target !== '_blank') return '外链缺 target=_blank: ' + href;
    if (!/\bnoopener\b/.test(rel) || !/\bnofollow\b/.test(rel)) return '外链 rel 缺 noopener/nofollow: ' + href;
  }
  return true;
});

test('C3-strong-connectivity', '6 个信息页内链强连通（双向闭环）', () => {
  const graph = {};
  for (const r of INFO) {
    graph[r] = new Set();
    for (const tag of anchorsOf(pageHtml[r])) {
      const href = attrOf(tag, 'href');
      if (!href) continue;
      const k = classifyLink(href);
      if (k.type === 'int' && INFO.indexOf(k.p) >= 0) graph[r].add(k.p);
    }
  }
  for (const start of INFO) {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      for (const nx of graph[cur] || []) {
        if (!seen.has(nx)) { seen.add(nx); queue.push(nx); }
      }
    }
    if (seen.size !== INFO.length) {
      const miss = INFO.filter(r => !seen.has(r)).join(',');
      return '从 ' + start + ' 出发不可达: ' + miss;
    }
  }
  return true;
});

test('C4-cta-play', '每个信息页均可达 /play（CTA/导航）', () => {
  for (const r of INFO) {
    let ok = false;
    for (const tag of anchorsOf(pageHtml[r])) {
      const href = attrOf(tag, 'href');
      if (!href) continue;
      const k = classifyLink(href);
      if (k.type === 'int' && k.p === '/play') ok = true;
    }
    if (!ok) return r + ' 缺少指向 /play 的链接';
  }
  return true;
});

// ============ D. 游戏页 play.html（§4.2） ============
test('D1-back-home', 'play.html 头部包含返回首页小型导航', () => {
  const h = pageHtml['/play'];
  if (!/<a href="\/"[^>]*class="back-home"/.test(h)) return '未找到 <a href="/" class="back-home">';
  const css = read('css/style.css') || '';
  if (!css.includes('.back-home')) return 'css/style.css 未定义 .back-home 样式';
  return true;
});

test('D2-game-isolation', 'play.html 保持游戏层隔离（22 模块 + style.css，无 site 层）', () => {
  const h = pageHtml['/play'];
  if (!/<canvas id="game"><\/canvas>/.test(h)) return '缺少 <canvas id="game">';
  if (!h.includes('css/style.css')) return '未引入 css/style.css';
  const modules = count(h, /<script[^>]+src="js\/[^"]+\.js"/gi);
  if (modules !== 22) return '游戏模块应为 22 个，实际 ' + modules;
  if (h.includes('js/site.js') || h.includes('css/site.css')) return '游戏页不应引入 site 层';
  return true;
});

test('D3-game-meta', 'play.html VideoGame JSON-LD 与 canonical/og 齐备', () => {
  const h = pageHtml['/play'];
  const types = [];
  for (const b of ldBlocks(h)) walkType(b, types);
  if (types.indexOf('VideoGame') < 0) return '缺少 VideoGame JSON-LD';
  if (propMeta(h, 'og:url') !== SITE + '/play') return 'og:url 未指向 /play';
  if (!nameMeta(h, 'description')) return '缺少 description';
  return true;
});
function walkType(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walkType(n, out)); return; }
  const t = node['@type'];
  if (t) (Array.isArray(t) ? t : [t]).forEach(x => out.push(x));
  for (const k of Object.keys(node)) if (k !== '@context') walkType(node[k], out);
}

// ============ E. sitemap 与页面映射（§5.3） ============
test('E1-sitemap-pages', 'sitemap 每个 loc 对应文件存在且 canonical 与 loc 一致', () => {
  const xml = read('sitemap.xml');
  if (xml === null) return 'sitemap.xml 不存在';
  const locs = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.replace(/<\/?loc>/g, '').trim());
  for (const loc of locs) {
    const p = new URL(loc).pathname;
    const route = p.length > 1 ? p.replace(/\/$/, '') : p;
    const file = PAGE_FILE[route];
    if (!file) return 'sitemap 含未定义路由: ' + loc;
    const h = read(file);
    if (h === null) return 'sitemap 页面文件缺失: ' + file;
    if (canonicalOf(h) !== loc) return file + ' canonical=' + canonicalOf(h) + ' ≠ sitemap loc=' + loc;
  }
  return true;
});

let pass = 0, fail = 0;
for (const r of results) {
  if (r.pass) { pass++; console.log('  ✓ ' + r.id + ' ' + r.name); }
  else { fail++; console.log('  ✗ [FAIL] ' + r.id + ' ' + r.name + (r.detail ? '  →  ' + r.detail : '')); }
}
console.log('\n' + '='.repeat(50));
console.log('[站点全量审计 TDD] 通过: ' + pass + ' / 失败: ' + fail);
console.log('='.repeat(50));
process.exit(fail > 0 ? 1 : 0);
