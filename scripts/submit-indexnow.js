// scripts/submit-indexnow.js — 自动向 IndexNow / Bing 提交全站 URL
'use strict';
const https = require('https');

const data = JSON.stringify({
  host: 'fot.us.kg',
  key: '3763fca8c10d4765bfa92deae8f0f898',
  keyLocation: 'https://fot.us.kg/3763fca8c10d4765bfa92deae8f0f898.txt',
  urlList: [
    'https://fot.us.kg/',
    'https://fot.us.kg/tank-battle-guide',
    'https://fot.us.kg/classic-tank-games',
    'https://fot.us.kg/2-player-tank-game',
    'https://fot.us.kg/about',
    'https://fot.us.kg/privacy'
  ]
});

function submit(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        resolve({ endpoint, statusCode: res.statusCode, statusMessage: res.statusMessage, body });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('正在向 IndexNow 搜索引擎推送 URL 列表...\n');
  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow'
  ];

  for (const ep of endpoints) {
    try {
      const res = await submit(ep);
      console.log(`[${res.endpoint}]`);
      console.log(`  状态码: ${res.statusCode} (${res.statusMessage})`);
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`  结果: ✅ 推送成功！URL 已进入搜索引擎索引管道。`);
      } else {
        console.log(`  返回内容: ${res.body || '无内容'}`);
      }
    } catch (err) {
      console.error(`  ✗ 推送失败: ${err.message}`);
    }
    console.log('');
  }
}

main();
