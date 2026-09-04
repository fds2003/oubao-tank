// tests/test-http-routes.js
// 本地服务路由可达性 TDD：依据「欧宝坦克大战网站 - 完整开发指令.md」
//   §3 站点路由 + §7 验收「路由与可达性：6 个页面美观路径均返回 200，无 404 死链」
// 运行: node tests/test-http-routes.js
// 说明: 自动以随机端口拉起 server.js（PORT 环境变量），实测后关闭，不留驻进程
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 20000 + Math.floor(Math.random() * 20000);

// 期望 200 的路径 → 期望 Content-Type 前缀
const ROUTES = {
  '/': 'text/html',
  '/play': 'text/html',
  '/tank-battle-guide': 'text/html',
  '/classic-tank-games': 'text/html',
  '/2-player-tank-game': 'text/html',
  '/about': 'text/html',
  '/privacy': 'text/html',
  '/sitemap.xml': 'application/xml',
  '/robots.txt': 'text/plain',
  '/css/site.css': 'text/css',
  '/js/site.js': 'text/javascript',
  '/js/game.js': 'text/javascript',
  '/og.jpg': 'image/jpeg'
};

const results = []; // { id, name, pass, detail }

function fetchPath(p) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: p, timeout: 5000 }, res => {
      res.resume();
      resolve({ status: res.statusCode, type: res.headers['content-type'] || '' });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout: ' + p)); });
  });
}

function waitForServer(proc, triesLeft = 50) {
  return new Promise((resolve, reject) => {
    if (proc.exitCode !== null) return reject(new Error('server.js 提前退出，exit=' + proc.exitCode));
    const req = http.get({ host: '127.0.0.1', port: PORT, path: '/', timeout: 800 }, res => {
      res.resume();
      resolve();
    });
    req.on('error', () => {
      setTimeout(() => {
        if (triesLeft <= 0) return reject(new Error('等待 server.js 启动超时'));
        waitForServer(proc, triesLeft - 1).then(resolve, reject);
      }, 120);
    });
  });
}

async function main() {
  const proc = spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  try {
    await waitForServer(proc);

    for (const [p, expectedType] of Object.entries(ROUTES)) {
      const id = 'route-' + (p === '/' ? 'root' : p.slice(1).replace(/\//g, '_'));
      const name = p + ' 应返回 200' + (expectedType ? '（' + expectedType + '）' : '');
      try {
        const res = await fetchPath(p);
        if (res.status !== 200) {
          results.push({ id, name, pass: false, detail: '状态码 ' + res.status + '（期望 200）' });
        } else if (res.type && !res.type.startsWith(expectedType)) {
          results.push({ id, name, pass: false, detail: 'Content-Type 为 ' + res.type + '，期望 ' + expectedType + ' 前缀' });
        } else {
          results.push({ id, name, pass: true, detail: '' });
        }
      } catch (e) {
        results.push({ id, name, pass: false, detail: '[异常] ' + e.message });
      }
    }
  } finally {
    proc.kill();
  }

  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.pass) { pass++; console.log('  ✓ ' + r.id + ' ' + r.name); }
    else { fail++; console.log('  ✗ [FAIL] ' + r.id + ' ' + r.name + (r.detail ? '  →  ' + r.detail : '')); }
  }
  console.log('\n' + '='.repeat(50));
  console.log('[HTTP 路由 TDD] 通过: ' + pass + ' / 失败: ' + fail);
  console.log('='.repeat(50));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[HTTP 路由 TDD] 无法启动本地服务器: ' + err.message);
  process.exit(1);
});
