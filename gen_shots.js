const games = ['FC坦克大战','坦克世界','Tanki Online','Pocket Tanks','ShellShock Live','重装上阵','Awesome Tanks','欧宝坦克大战'];
const colors = ['#ff8c42','#ff5d5d','#22eeff','#ffd23f','#c89dff','#4dd2ff','#5dff70','#f5a623'];
const out = {};
games.forEach((g,i)=>{
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='640' height='360' fill='#1a1f2b'/><rect x='10' y='10' width='620' height='340' rx='12' fill='none' stroke='${colors[i]}' stroke-width='4'/><circle cx='320' cy='150' r='48' fill='${colors[i]}' opacity='0.85'/><text x='320' y='250' font-family='Segoe UI, Microsoft YaHei, sans-serif' font-size='40' fill='#ffffff' text-anchor='middle'>${g}</text></svg>`;
  out[g] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
});
console.log(JSON.stringify(out, null, 1));