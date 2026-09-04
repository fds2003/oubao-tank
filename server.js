const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT) || 8080;

// 美观路径别名表：路径 → 静态文件（与 vercel.json rewrites 保持一致；任何路径变更须同步三处）
const aliases = {
  '/play': 'play.html',
  '/tank-battle-guide': 'tank-battle-guide.html',
  '/classic-tank-games': 'classic-tank-games.html',
  '/2-player-tank-game': '2-player-tank-game.html',
  '/about': 'about.html',
  '/privacy': 'privacy.html'
};

const mimes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let rel = '';
  if (url === '/') {
    rel = 'index.html';
  } else if (aliases[url]) {
    rel = aliases[url];
  } else {
    rel = url.slice(1); // 去掉开头的 '/'
  }
  // 路径穿越防护：拒绝任何 '..' 段
  if (rel.indexOf('..') !== -1) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
  fs.createReadStream(fp).pipe(res);
});

server.listen(port, () => {
  console.log(`坦克游戏服务器已启动！`);
  console.log(`网站首页: http://localhost:${port}/`);
  console.log(`游戏页面: http://localhost:${port}/play`);
  console.log(`隐私政策: http://localhost:${port}/privacy`);
});