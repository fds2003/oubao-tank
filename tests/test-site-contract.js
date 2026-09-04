// tests/test-site-contract.js
// 站点 SEO / 路由契约 TDD：依据「欧宝坦克大战网站 - 完整开发指令.md」
//   §4.2 游戏页 robots: noindex, nofollow
//   §4.7 隐私政策页（title / H1 唯一 / canonical / 内容规范 5 项）
//   §5.3 sitemap.xml 收录 6 页并排除 /play；robots.txt 声明 Disallow: /play 与 Sitemap
//   §6.1~6.2 vercel.json 与 server.js 别名一致且含 /privacy
// 运行: node tests/test-site-contract.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://fot.us.kg';
const STATIC_PAGES = [
  '/', '/tank-battle-guide', '/classic-tank-games',
  '/2-player-tank-game', '/about', '/privacy'
];

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

// ============ S1: 游戏页 noindex（指令 §4.2） ============
test('S1-play-noindex', 'play.html 应声明 robots noindex, nofollow', () => {
  const html = read('play.html');
  if (html === null) return 'play.html 不存在';
  const m = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  if (!m) return '未找到 robots meta 声明';
  if (!/noindex/i.test(m[1])) return 'robots 缺少 noindex: ' + m[1];
  if (!/nofollow/i.test(m[1])) return 'robots 缺少 nofollow: ' + m[1];
  return true;
});

// ============ S2: 隐私政策页存在与元信息（指令 §4.7） ============
test('S2-privacy-meta', 'privacy.html 应存在且 title/H1/canonical 合规', () => {
  const html = read('privacy.html');
  if (html === null) return 'privacy.html 不存在';
  if (!/<title>隐私政策 \| 欧宝坦克大战<\/title>/.test(html)) return 'title 不为「隐私政策 | 欧宝坦克大战」';
  const h1s = html.match(/<h1[\s>][\s\S]*?<\/h1>/g) || [];
  if (h1s.length !== 1) return 'H1 应恰好 1 个，实际 ' + h1s.length;
  if (!/隐私政策/.test(h1s[0])) return 'H1 文本未包含「隐私政策」';
  if (!html.includes('<link rel="canonical" href="' + SITE + '/privacy">')) return 'canonical 未指向 ' + SITE + '/privacy';
  return true;
});

// ============ S3: 隐私政策页复用共享基础设施（tasks 1.5 隔离原则） ============
test('S3-privacy-shared', 'privacy.html 应复用 css/site.css 与 js/site.js', () => {
  const html = read('privacy.html');
  if (html === null) return 'privacy.html 不存在';
  if (!html.includes('css/site.css')) return '未引入 css/site.css';
  if (!html.includes('js/site.js')) return '未引入 js/site.js';
  if (/<script[^>]+src="js\/(utils|game|main)\.js"/.test(html)) return '隐私页不得加载游戏脚本';
  return true;
});

// ============ S4: 隐私政策内容规范 5 项（指令 §4.7） ============
test('S4-privacy-content', 'privacy.html 应覆盖信息收集/数据用途/Cookie/儿童隐私/联系邮箱', () => {
  const html = read('privacy.html');
  if (html === null) return 'privacy.html 不存在';
  const need = [
    [/localStorage|本地存储|浏览器本地/i, '未声明本地浏览器存储（LocalStorage）'],
    [/用途|用于/, '未说明数据用途'],
    [/cookie/i, '未包含 Cookie 使用声明'],
    [/儿童|未成年人|未满/, '未包含儿童隐私合规声明'],
    [/feedback@fot\.us\.kg/, '未包含联系邮箱 feedback@fot.us.kg']
  ];
  for (const [re, msg] of need) if (!re.test(html)) return msg;
  if (!html.includes('mailto:feedback@fot.us.kg')) return '联系邮箱应为 mailto 链接';
  return true;
});

// ============ S5: sitemap.xml 契约（指令 §5.3） ============
test('S5-sitemap', 'sitemap.xml 应合法且收录 6 页、排除 /play', () => {
  const xml = read('sitemap.xml');
  if (xml === null) return 'sitemap.xml 不存在';
  if (!/<\?xml version="1\.0" encoding="UTF-8"\?>/.test(xml)) return '缺少 XML 声明';
  if (!/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml)) return 'urlset 命名空间不正确';
  const locs = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.replace(/<\/?loc>/g, '').trim());
  const uniq = [...new Set(locs)];
  if (uniq.length !== STATIC_PAGES.length) return 'sitemap 应收录 ' + STATIC_PAGES.length + ' 条 URL，实际 ' + uniq.length;
  for (const loc of uniq) if (!loc.startsWith(SITE)) return 'URL 域名不一致: ' + loc;
  const paths = uniq.map(u => { const p = new URL(u).pathname; return p.length > 1 ? p.replace(/\/$/, '') : p; });
  for (const p of STATIC_PAGES) if (!paths.includes(p)) return 'sitemap 缺少页面: ' + p;
  if (uniq.includes(SITE + '/play')) return 'sitemap 不应收录 /play';
  return true;
});

// ============ S6: robots.txt 契约（指令 §5.3） ============
test('S6-robots', 'robots.txt 应允许抓取、Disallow /play 并声明 sitemap', () => {
  const txt = read('robots.txt');
  if (txt === null) return 'robots.txt 不存在';
  if (!/User-agent:\s*\*/i.test(txt)) return '缺少 User-agent: * 声明';
  if (!/Disallow:\s*\/play/i.test(txt)) return '未声明 Disallow: /play';
  if (!new RegExp('Sitemap:\\s*' + SITE.replace(/[.]/g, '\\.') + '/sitemap\\.xml', 'i').test(txt)) {
    return '未声明 Sitemap: ' + SITE + '/sitemap.xml';
  }
  return true;
});

// ============ S7: vercel.json rewrites（指令 §6.1） ============
test('S7-vercel-rewrites', 'vercel.json rewrites 应含 6 条且覆盖 /privacy', () => {
  const raw = read('vercel.json');
  if (raw === null) return 'vercel.json 不存在';
  const cfg = JSON.parse(raw);
  const rw = cfg.rewrites || [];
  if (rw.length !== 6) return 'rewrites 应为 6 条，实际 ' + rw.length;
  const map = {};
  for (const r of rw) map[r.source] = r.destination;
  const norm = d => String(d).replace(/^\//, ''); // 指令 §6.1 示例 destination 形如 '/x.html'，与 server.js 相对路径语义等价
  for (const p of STATIC_PAGES) {
    if (p === '/') continue;
    if (!map[p]) return 'rewrites 缺少 ' + p;
    if (norm(map[p]) !== p.slice(1) + '.html') return p + ' 重写目标应为 ' + p.slice(1) + '.html';
  }
  if (!map['/play']) return 'rewrites 缺少 /play';
  return true;
});

// ============ S8: server.js 别名（指令 §6.2） ============
test('S8-server-aliases', 'server.js aliases 应含 6 条且覆盖 /privacy', () => {
  const src = read('server.js');
  if (src === null) return 'server.js 不存在';
  const m = src.match(/const aliases = \{([\s\S]*?)\};/);
  if (!m) return 'server.js 未找到 aliases 映射表';
  const alias = {};
  for (const kv of m[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) alias[kv[1]] = kv[2];
  const keys = Object.keys(alias);
  if (keys.length !== 6) return 'aliases 应为 6 条，实际 ' + keys.length;
  for (const p of STATIC_PAGES) {
    if (p === '/') continue;
    if (!alias[p]) return 'aliases 缺少 ' + p;
    if (alias[p] !== p.slice(1) + '.html') return p + ' 别名目标应为 ' + p.slice(1) + '.html';
  }
  if (!alias['/play']) return 'aliases 缺少 /play';
  return true;
});

// ============ S9: 三处路由配置一致性（tasks 8.4） ============
test('S9-route-consistency', 'vercel.json / server.js / sitemap.xml 路由集合应闭环一致', () => {
  const cfg = JSON.parse(read('vercel.json') || '{}');
  const rw = cfg.rewrites || [];
  const vercelMap = Object.fromEntries(rw.map(r => [r.source, r.destination]));

  const src = read('server.js') || '';
  const m = src.match(/const aliases = \{([\s\S]*?)\};/);
  if (!m) return 'server.js 未找到 aliases 映射表';
  const alias = {};
  for (const kv of m[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) alias[kv[1]] = kv[2];

  const norm = d => String(d).replace(/^\//, ''); // server.js 用相对路径、vercel.json 用绝对路径，语义等价
  for (const [p, dest] of Object.entries(alias)) {
    if (!vercelMap[p]) return p + ' 仅存在于 server.js，vercel.json 缺失（三处须同步）';
    if (norm(vercelMap[p]) !== norm(dest)) return p + ' 在 server.js(' + dest + ') 与 vercel.json(' + vercelMap[p] + ') 不一致';
  }
  for (const p of Object.keys(vercelMap)) {
    if (!alias[p]) return p + ' 仅存在于 vercel.json，server.js 缺失（三处须同步）';
  }

  const xml = read('sitemap.xml') || '';
  const locs = [...new Set((xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.replace(/<\/?loc>/g, '').trim()))];
  const sitemapPaths = locs.map(u => { const p = new URL(u).pathname; return p.length > 1 ? p.replace(/\/$/, '') : p; });
  for (const p of Object.keys(alias)) {
    if (p === '/play') continue;
    if (!sitemapPaths.includes(p)) return 'sitemap 未收录已配置路由: ' + p;
  }
  if (sitemapPaths.includes('/play')) return 'sitemap 不应收录 noindex 的 /play';
  return true;
});

let pass = 0, fail = 0;
for (const r of results) {
  if (r.pass) { pass++; console.log('  ✓ ' + r.id + ' ' + r.name); }
  else { fail++; console.log('  ✗ [FAIL] ' + r.id + ' ' + r.name + (r.detail ? '  →  ' + r.detail : '')); }
}
console.log('\n' + '='.repeat(50));
console.log('[站点契约 TDD] 通过: ' + pass + ' / 失败: ' + fail);
console.log('='.repeat(50));
process.exit(fail > 0 ? 1 : 0);
