'use strict';
const P1_KEYS={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',fire:['Space','KeyF']};
const P2_KEYS={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',fire:['Enter','KeyL']};
const WIN_ROUNDS=CONFIG.WIN_ROUNDS;
const AI_COLORS=['#ff8c42','#c084fc','#34d399','#f472b6','#facc15','#fb923c','#a78bfa','#22d3ee','#e879f9','#84cc16'];
const AI_COLORS_COOP=['#ff8c42','#c084fc','#f472b6','#facc15','#fb923c','#a78bfa','#22d3ee','#e879f9','#84cc16','#38bdf8'];
const AI_NAMES=['AI·烈焰','AI·幻紫','AI·翡翠','AI·蔷薇','AI·金芒','AI·炽阳','AI·星辉','AI·寒冰','AI·魅影','AI·翠芽'];
const AI_NAMES_COOP=['AI·烈焰','AI·幻紫','AI·蔷薇','AI·金芒','AI·炽阳','AI·星辉','AI·寒冰','AI·魅影','AI·翠芽','AI·苍穹'];
const SAFE_OFFSETS=[{c:0,r:-1},{c:0,r:1},{c:-1,r:0},{c:1,r:0},{c:0,r:-2},{c:0,r:2},{c:-1,r:-1},{c:1,r:1},{c:2,r:0},{c:-2,r:0}];
const DIFF_LIST=['easy','normal','hard'];

class Game{
 constructor(ctx,dpr){
  this.ctx=ctx;this.dpr=dpr;
  this.parts=new Particles();
  this.state='menu';
  this.mapIdx=0;
  this.menuT=0;this.time=0;
  this.previews=MAP_DEFS.map(buildMap);
  this.scores=[0,0];this.roundNum=1;
  this.matchStats=[{shots:0,hits:0,dmg:0},{shots:0,hits:0,dmg:0}];
  this.world=null;this.tanks=[];this.bullets=[];this.powerups=[];this.mines=[];
  this.cd=0;this.cdLast=4;this.fightT=0;
  this.bannerT=0;this.roundWinner=-1;
  this.matchWinner=-1;
  this.puTimer=rand(4,6);
  this.confT=0;this.shake=0;this.lastTs=0; this.gameMode=0;this.aiDifficulty=1;this.aiCount=2; this.damageFlash=0;
 this.fade=0;this.fadeTarget=1;
 this.tutorial=new Tutorial();
 if(Tutorial.shouldShow())this.tutorial.start();
 this.dynamicDifficulty=new DynamicDifficulty();
 this.playerTankClass='medium';
 this.tankClassList=getTankClassList();
 this.tankClassIndex=1;
 }
 start(){requestAnimationFrame(ts=>this.loop(ts));}
 loop(ts){
  const dt=Math.min(0.033,(ts-this.lastTs)/1000||0.016);
  this.lastTs=ts;this.time+=dt;
  this.update(dt);this.draw();
  Input.endFrame();
  requestAnimationFrame(t=>this.loop(t));
 }
 addShake(v){this.shake=Math.min(10,Math.max(this.shake,v));}
 triggerDamageFlash(){this.damageFlash=0.3;}
 autoPause(){if(this.state==='play')this.state='pause';}
  startMatch(i){
   this.mapIdx=i;this.scores=[0,0];this.roundNum=1;
   this.matchWinner=-1;
   const n=this.gameMode===1?2:(this.gameMode===2?2+this.aiCount:1+this.aiCount);
   this.matchStats=[];for(let j=0;j<n;j++)this.matchStats.push({shots:0,hits:0,dmg:0});
   this.fade=0;this.fadeTarget=1;
  this.startRound();
 }
 spawnAI(id,spawnPt,color,name,playerClass){
  const aiClass=selectAITankClass(this.dynamicDifficulty.getEffectiveDifficulty(),playerClass);
  for(const off of SAFE_OFFSETS){
   const tc=spawnPt.c+off.c,tr=spawnPt.r+off.r;
   if(tc>=1&&tc<COLS-1&&tr>=1&&tr<ROWS-1&&!this.world.solidTank(tc,tr)){
    const t=new Tank(id,{c:tc,r:tr,face:'left',color,name,keys:{up:0,down:0,left:0,right:0,fire:[]}},this,aiClass);
    t.ai=new AI(t,this,this.dynamicDifficulty.getEffectiveDifficulty());this.tanks.push(t);return;
   }
  }
  const t=new Tank(id,{c:spawnPt.c,r:spawnPt.r,face:'left',color,name,keys:{up:0,down:0,left:0,right:0,fire:[]}},this,aiClass);
  t.ai=new AI(t,this,this.dynamicDifficulty.getEffectiveDifficulty());this.tanks.push(t);
 }
 startRound(){
  this.world=new World(MAP_DEFS[this.mapIdx]);
  const s1=this.world.spawns[0],s2=this.world.spawns[1];
  const playerClass=this.playerTankClass||'medium';
  if(this.gameMode===0){
   while(this.matchStats.length<1+this.aiCount)this.matchStats.push({shots:0,hits:0,dmg:0});
   this.tanks=[new Tank(0,{c:s1.c,r:s1.r,face:'right',color:'#38bdf8',name:'玩家',keys:P1_KEYS},this,playerClass)];
   for(let i=0;i<this.aiCount;i++)this.spawnAI(i+1,s2,AI_COLORS[i],AI_NAMES[i],playerClass);
  }else if(this.gameMode===2){
   while(this.matchStats.length<2+this.aiCount)this.matchStats.push({shots:0,hits:0,dmg:0});
   this.tanks=[
    new Tank(0,{c:s1.c,r:s1.r,face:'right',color:'#38bdf8',name:'玩家 1',keys:P1_KEYS},this,playerClass),
    new Tank(1,{c:s2.c,r:s2.r,face:'right',color:'#34d399',name:'玩家 2',keys:P2_KEYS},this,playerClass)
   ];
   for(let i=0;i<this.aiCount;i++)this.spawnAI(i+2,s1,AI_COLORS_COOP[i],AI_NAMES_COOP[i],playerClass);
  }else{
   this.matchStats.length=2;
   this.tanks=[
    new Tank(0,{c:s1.c,r:s1.r,face:'right',color:'#38bdf8',name:'玩家 1',keys:P1_KEYS},this,playerClass),
    new Tank(1,{c:s2.c,r:s2.r,face:'left',color:'#ff8c42',name:'玩家 2',keys:P2_KEYS},this,playerClass)
   ];
  }
  this.bullets=[];this.powerups=[];this.mines=[];this.parts.clear();
  this.puTimer=rand(CONFIG.POWERUP_INITIAL_MIN,CONFIG.POWERUP_INITIAL_MAX);
  this.state='countdown';this.cd=3;this.cdLast=4;
 }
 trySpawnPowerup(){
  for(let i=0;i<50;i++){
   const c=randInt(1,COLS-2),r=randInt(1,ROWS-2);
   if(this.world.at(c,r)!=='.')continue;
   const px=c*CELL+CELL/2,py=r*CELL+CELL/2;
   let ok=true;
   for(const t of this.tanks)if(t.alive&&dist(px,py,t.x,t.y)<CONFIG.POWERUP_SPAWN_MIN_DIST){ok=false;break;}
   if(ok)for(const p of this.powerups)if(dist(px,py,p.x,p.y)<CONFIG.POWERUP_MIN_SPACING){ok=false;break;}
   if(!ok)continue;
   this.powerups.push(new PowerUp(px,py,POWER_POOL[randInt(0,POWER_POOL.length-1)]));return;
  }
 }
 updatePlay(dt){
  for(const t of this.tanks)t.update(dt);
  for(let i=0;i<this.tanks.length;i++)for(let j=i+1;j<this.tanks.length;j++)separateTanks(this.tanks[i],this.tanks[j]);
  for(const b of this.bullets)b.update(dt,this);
  this.bullets=this.bullets.filter(b=>!b.dead);
  for(const p of this.powerups)p.update(dt);
  this.powerups=this.powerups.filter(p=>!p.expired());
  for(const m of this.mines)m.update(dt);
  this.mines=this.mines.filter(m=>!m.dead);
  this.puTimer-=dt;
  if(this.puTimer<=0){if(this.powerups.length<3)this.trySpawnPowerup();  this.puTimer=rand(CONFIG.POWERUP_INTERVAL_MIN,CONFIG.POWERUP_INTERVAL_MAX);}
  for(const p of this.powerups)for(const t of this.tanks)
   if(!p.picked&&t.alive&&dist(p.x,p.y,t.x,t.y)<CONFIG.POWERUP_PICKUP_RANGE){p.picked=true;applyPower(this,t,p.type);}
  this.powerups=this.powerups.filter(p=>!p.picked);
  if(this.gameMode===0){
   const pDead=!this.tanks[0].alive,aiDead=this.tanks.slice(1).every(t=>!t.alive);
   if(pDead||aiDead){
    if(pDead&&aiDead)this.roundWinner=-1;
    else if(pDead){this.scores[1]++;this.roundWinner=1;this.dynamicDifficulty.recordWin();}
    else{this.scores[0]++;this.roundWinner=0;this.dynamicDifficulty.recordLoss();}
    this.dynamicDifficulty.recordGame();
    this.bannerT=2.6;this.state='round';
   }
  }else if(this.gameMode===2){
   const pDead=this.tanks.slice(0,2).every(t=>!t.alive),aiDead=this.tanks.slice(2).every(t=>!t.alive);
   if(pDead||aiDead){
    if(pDead&&aiDead)this.roundWinner=-1;
    else if(pDead){this.scores[1]++;this.roundWinner=1;this.dynamicDifficulty.recordWin();}
    else{this.scores[0]++;this.roundWinner=0;this.dynamicDifficulty.recordLoss();}
    this.dynamicDifficulty.recordGame();
    this.bannerT=2.6;this.state='round';
   }
  }else{
   const d0=!this.tanks[0].alive,d1=!this.tanks[1].alive;
   if(d0||d1){const w=d0&&d1?-1:(d0?1:0);if(w>=0)this.scores[w]++;this.roundWinner=w;this.dynamicDifficulty.recordGame();this.bannerT=2.6;this.state='round';}
  }
  this.fightT=Math.max(0,this.fightT-dt);
 }
 update(dt){
  this.menuT+=dt;this.parts.update(dt);
  this.shake=Math.max(0,this.shake-dt*16);
  if(this.damageFlash>0&&dt>0)this.damageFlash=Math.max(0,this.damageFlash-dt);
  this.fade=lerp(this.fade,this.fadeTarget,dt*6);
  if(Input.pressed('KeyM'))AudioSys.toggleMute();
  if(this.tutorial.state==='active'){
   this.tutorial.update(dt);
   if(Input.pressed('Escape'))this.tutorial.handleInput('Escape');
   else if(Input.pressed('Space','Enter','Digit1','Digit2','Digit3','ArrowLeft','ArrowRight'))this.tutorial.handleInput('Space');
  }
  switch(this.state){
   case'menu':
    if(Input.pressed('Digit1'))this.gameMode=0;
    if(Input.pressed('Digit2'))this.gameMode=1;
    if(Input.pressed('Digit3'))this.gameMode=2;
    if(Input.pressed('ArrowLeft'))this.mapIdx=(this.mapIdx+MAP_DEFS.length-1)%MAP_DEFS.length;
    if(Input.pressed('ArrowRight'))this.mapIdx=(this.mapIdx+1)%MAP_DEFS.length;
    if(Input.pressed('ArrowUp')){const row=Math.floor(this.mapIdx/6);if(row>0)this.mapIdx-=6;}
    if(Input.pressed('ArrowDown')){const row=Math.floor(this.mapIdx/6);if(row<1)this.mapIdx+=6;}
    if(Input.pressed('KeyC')){this.tankClassIndex=(this.tankClassIndex-1+this.tankClassList.length)%this.tankClassList.length;this.playerTankClass=this.tankClassList[this.tankClassIndex];}
    if(Input.pressed('KeyV')){this.tankClassIndex=(this.tankClassIndex+1)%this.tankClassList.length;this.playerTankClass=this.tankClassList[this.tankClassIndex];}
    if(this.gameMode===0||this.gameMode===2){
     if(Input.pressed('KeyQ'))this.aiDifficulty=(this.aiDifficulty+1)%3;
     if(Input.pressed('KeyZ'))this.aiCount=Math.max(1,this.aiCount-1);
     if(Input.pressed('KeyX'))this.aiCount=Math.min(10,this.aiCount+1);
    }
    if(Input.pressed('Enter','Space'))this.startMatch(this.mapIdx);
    break;
   case'countdown':{
    this.cd-=dt;const n=Math.ceil(this.cd);
    if(n!==this.cdLast){this.cdLast=n;if(n>0)AudioSys.beep();}
    if(this.cd<=0){this.state='play';this.fightT=0.9;AudioSys.go();}
    break;}
   case'play':this.updatePlay(dt);if(Input.pressed('KeyP','Escape'))this.state='pause';break;
   case'round':
    this.bannerT-=dt;
    for(const b of this.bullets)b.update(dt,this);this.bullets=this.bullets.filter(b=>!b.dead);
    if(this.bannerT<=0){
     if(this.roundWinner>=0&&this.scores[this.roundWinner]>=WIN_ROUNDS){this.matchWinner=this.roundWinner;this.state='match';AudioSys.win();}
     else{this.roundNum++;this.startRound();}
    }break;
   case'match':
    this.confT-=dt;
    if(this.confT<=0){this.confT=0.09;this.parts.confetti(rand(60,VIEW_W-60));if(chance(0.5))this.parts.confetti(rand(60,VIEW_W-60));}
    if(Input.pressed('KeyR'))this.startMatch(this.mapIdx);
    if(Input.pressed('Escape'))this.state='menu';break;
   case'pause':
    if(Input.pressed('KeyP','Enter'))this.state='play';
    else if(Input.pressed('Escape'))this.state='menu';break;
  }
 }
 draw(){
  const ctx=this.ctx;const CX=VIEW_W/2;
  ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.textBaseline='alphabetic';
  if(this.state==='menu'){this.drawMenu(ctx);this.tutorial.draw(ctx);return;}
  this.drawScene(ctx);
  if(this.state==='countdown')this.drawCountdown(ctx);
  if(this.fightT>0)this.drawFight(ctx);
  if(this.state==='round')this.drawRoundBanner(ctx);
  if(this.state==='match')this.drawMatchEnd(ctx);
  if(this.state==='pause')this.drawPause(ctx);
  if(this.fade<0.99){ctx.fillStyle='rgba(11,13,18,'+(1-this.fade)+')';ctx.fillRect(0,0,VIEW_W,VIEW_H);}
  if(this.damageFlash>0){ctx.save();ctx.globalAlpha=this.damageFlash/0.3*0.4;ctx.fillStyle='rgba(255,50,50,1)';ctx.fillRect(0,0,VIEW_W,VIEW_H);ctx.restore();}
 }
 drawScene(ctx){
  const sx=this.shake>0?rand(-this.shake,this.shake):0;
  const sy=this.shake>0?rand(-this.shake,this.shake):0;
  ctx.save();
  ctx.translate(FIELD_X+sx,FIELD_Y+sy);
  ctx.beginPath();ctx.rect(0,0,FIELD_W,FIELD_H);ctx.clip();
  this.world.drawBase(ctx,this.time);
  for(const m of this.mines)m.draw(ctx);
  for(const p of this.powerups)p.draw(ctx);
  for(const b of this.bullets)b.draw(ctx);
  for(const t of this.tanks)t.draw(ctx,this.time);
  this.world.drawGrass(ctx);this.parts.draw(ctx);
  ctx.restore();
  const grd=ctx.createLinearGradient(FIELD_X,FIELD_Y,FIELD_X,FIELD_Y+FIELD_H);
  grd.addColorStop(0,'rgba(11,13,18,0.5)');grd.addColorStop(0.06,'rgba(11,13,18,0)');
  grd.addColorStop(0.94,'rgba(11,13,18,0)');grd.addColorStop(1,'rgba(11,13,18,0.5)');
  ctx.fillStyle=grd;ctx.fillRect(FIELD_X,FIELD_Y,FIELD_W,FIELD_H);
  ctx.strokeStyle='#1e2636';ctx.lineWidth=2;
  ctx.strokeRect(FIELD_X-1,FIELD_Y-1,FIELD_W+2,FIELD_H+2);
  this.drawHUD(ctx);
 }
 drawHUD(ctx){
  const L=FIELD_X+12,R=FIELD_X+FIELD_W-12;
  const p1=this.tanks[0];const CX=VIEW_W/2;
  ctx.textBaseline='alphabetic';
  if(this.gameMode===2){
   const p2=this.tanks[1];const hpW=320;
   ctx.textAlign='left';ctx.font='bold 20px '+FONT;
   ctx.fillStyle=p1.color;ctx.fillText(p1.name,L,22);
   ctx.fillStyle=p2.color;ctx.fillText(p2.name,L+hpW+36,22);
   this.drawHpBar(ctx,L+1,28,hpW,p1,false);
   this.drawHpBar(ctx,L+hpW+35,28,hpW,p2,false);
   for(let i=0;i<WIN_ROUNDS;i++)this.drawPip(ctx,L+18+i*26,58,this.scores[0]>i,p1.color);
   this.drawChips(ctx,p1,L+60,72,false);
  }else{
   ctx.textAlign='left';ctx.font='bold 22px '+FONT;
   ctx.fillStyle=p1.color;ctx.fillText(p1.name,L,26);
   this.drawHpBar(ctx,L+1,32,380,p1,false);
   for(let i=0;i<WIN_ROUNDS;i++)this.drawPip(ctx,L+18+i*30,64,this.scores[0]>i,p1.color);
   this.drawChips(ctx,p1,L+80,60,false);
  }
  if(this.gameMode===1){
   const p2=this.tanks[1];
   ctx.textAlign='right';ctx.font='bold 22px '+FONT;
   ctx.fillStyle=p2.color;ctx.fillText(p2.name,R,26);
   this.drawHpBar(ctx,R-381,32,380,p2,true);
   for(let i=0;i<WIN_ROUNDS;i++)this.drawPip(ctx,R-18-i*30,64,this.scores[1]>i,p2.color);
   this.drawChips(ctx,p2,R-80,60,true);
  }else{
   const aiIdx=this.gameMode===0?1:2;
   const aiAlive=this.tanks.slice(aiIdx).filter(t=>t.alive).length;
   const aiTotal=this.tanks.length-aiIdx;
   const diffN=['简单','普通','困难'],diffC=['#5dff70','#ffd23f','#ff5d5d'];
   ctx.textAlign='right';ctx.font='bold 22px '+FONT;
   ctx.fillStyle='#ff8c42';ctx.fillText('AI 阵营',R,26);
   ctx.font='16px '+FONT;ctx.fillStyle=diffC[this.aiDifficulty];ctx.fillText(diffN[this.aiDifficulty],R,48);
   ctx.fillStyle='#7a8599';ctx.fillText('存活 '+aiAlive+'/'+aiTotal,R,68);
   for(let i=0;i<WIN_ROUNDS;i++)this.drawPip(ctx,R-18-i*30,82,this.scores[1]>i,'#ff8c42');
  }
   ctx.textAlign='center';ctx.font='bold 26px '+FONT;ctx.fillStyle='#ffd23f';
   ctx.fillText('第 '+this.roundNum+' 局',CX,14);
   ctx.font='16px '+FONT;ctx.fillStyle='#5a6478';
   const ml=this.gameMode===0?'单人 · '+['简单','普通','困难'][this.aiDifficulty]+' ×'+this.aiCount:this.gameMode===2?'协作 · '+['简单','普通','困难'][this.aiDifficulty]+' ×'+this.aiCount:'双人对战';
   ctx.fillText(MAP_DEFS[this.mapIdx].name+' · '+ml+' · 先胜'+WIN_ROUNDS,CX,VIEW_H-20);
   if(AudioSys.muted){ctx.fillStyle='#5a6478';ctx.fillText('🔇 静音中',CX,VIEW_H-40);}
   ctx.font='16px '+FONT;ctx.fillStyle='#3a4255';
   const h=this.gameMode===0?'WASD 移动 · F/空格 开火 · P 暂停':this.gameMode===2?'P1:WASD·F   P2:方向键·L   P 暂停':'P1:WASD·F   P2:方向键·L   P 暂停';
   ctx.fillText(h,CX,VIEW_H-4);
 }
 drawHpBar(ctx,x,y,w,tank,flip){
  ctx.fillStyle='#0e1219';rr(ctx,x,y,w,16,4);ctx.fill();
  ctx.strokeStyle='#1e2636';ctx.lineWidth=1;rr(ctx,x,y,w,16,4);ctx.stroke();
  const frac=tank.hp/(tank.maxHp||HP_MAX),fw=Math.max(0,(w-4)*frac);
  if(fw>0){
   const c=frac>0.5?tank.color:frac>0.25?'#ffd23f':'#ff5555';
   ctx.fillStyle=c;
   if(flip)rr(ctx,x+w-2-fw,y+2,fw,12,3);else rr(ctx,x+2,y+2,fw,12,3);ctx.fill();
   ctx.fillStyle='rgba(255,255,255,0.15)';
   if(flip)rr(ctx,x+w-2-fw,y+2,fw,4,2);else rr(ctx,x+2,y+2,fw,4,2);ctx.fill();
  }
 }
 drawPip(ctx,x,y,on,color){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
  ctx.fillStyle=on?color:'#1a2030';
  if(on){ctx.shadowColor=color;ctx.shadowBlur=8;}
  ctx.fillRect(-7,-7,14,14);ctx.restore();
 }
 drawChips(ctx,tank,x,y,rtl){
  const list=[];for(const k in tank.buff)if(tank.buff[k]>0)list.push(k);
  if(!list.length)return;
  ctx.save();ctx.font='bold 13px '+FONT;ctx.textBaseline='middle';
  let cx=x;
  for(const k of list){
   const c=POWER_TYPES[k].color,label=Math.ceil(tank.buff[k])+'s';
   const wTxt=ctx.measureText(label).width,total=26+6+wTxt;
   const bx=rtl?cx-total:cx;
   ctx.fillStyle='rgba(10,14,22,0.88)';rr(ctx,bx,y-12,total,24,6);ctx.fill();
   ctx.strokeStyle=c;ctx.lineWidth=1;rr(ctx,bx,y-12,total,24,6);ctx.stroke();
   ctx.save();ctx.translate(bx+13,y);drawPowerIcon(ctx,k,6);ctx.restore();
   ctx.fillStyle=c;ctx.textAlign='left';ctx.fillText(label,bx+28,y+0.5);
   cx=rtl?bx-5:bx+total+5;
  }
  ctx.restore();
 }
 drawCountdown(ctx){
  ctx.fillStyle='rgba(5,8,13,0.5)';ctx.fillRect(FIELD_X,FIELD_Y,FIELD_W,FIELD_H);
  const fcx=FIELD_X+FIELD_W/2,fcy=FIELD_Y+FIELD_H/2;
  const num=Math.max(1,Math.ceil(this.cd)),p=this.cd-Math.floor(this.cd);
  const sc=1+p*0.8,a=Math.min(1,p*2.5);
  ctx.save();ctx.translate(fcx,fcy);
  ctx.globalAlpha=a*0.25;ctx.fillStyle='#38bdf8';
  ctx.beginPath();ctx.arc(0,0,80+p*40,0,7);ctx.fill();
  ctx.globalAlpha=a;ctx.scale(sc,sc);
  ctx.font='bold 110px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.shadowColor='#38bdf8';ctx.shadowBlur=40;
  ctx.fillText(String(num),0,0);ctx.restore();
  ctx.globalAlpha=a;ctx.font='bold 22px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#6b7a94';ctx.fillText('ROUND '+this.roundNum+' · 准备战斗',fcx,fcy-90);
  ctx.globalAlpha=1;
 }
 drawFight(ctx){
  const q=this.fightT/0.9;
  const fcx=FIELD_X+FIELD_W/2,fcy=FIELD_Y+FIELD_H/2;
  ctx.save();ctx.globalAlpha=q;ctx.translate(fcx,fcy);
  ctx.scale(0.6+(1-q)*0.6,0.6+(1-q)*0.6);
  ctx.font='bold 88px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#ffd23f';ctx.shadowColor='#ff8c42';ctx.shadowBlur=50;
  ctx.fillText('开 战 ！',0,0);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,210,63,'+q*0.4+')';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,0,100+(1-q)*80,0,7);ctx.stroke();
  ctx.restore();
 }
 drawRoundBanner(ctx){
  const a=Math.min(1,this.bannerT/0.4);
  ctx.fillStyle='rgba(4,6,10,'+(0.6*a)+')';ctx.fillRect(FIELD_X,FIELD_Y,FIELD_W,FIELD_H);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const cy=FIELD_Y+FIELD_H/2;
  if(this.roundWinner<0){ctx.globalAlpha=a;ctx.font='bold 60px '+FONT;ctx.fillStyle='#c7d0de';ctx.fillText('平 局 ！',VIEW_W/2,cy-24);}
  else{
   let msg,color;
   if(this.gameMode===0){msg=this.roundWinner===0?'玩家 得分！':'AI 阵营 得分！';color=this.roundWinner===0?'#38bdf8':'#ff8c42';}
   else if(this.gameMode===2){msg=this.roundWinner===0?'玩家阵营 得分！':'AI 阵营 得分！';color=this.roundWinner===0?'#38bdf8':'#ff8c42';}
   else{msg=this.tanks[this.roundWinner].name+' 得分！';color=this.tanks[this.roundWinner].color;}
   ctx.globalAlpha=a;ctx.font='bold 60px '+FONT;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=26;
   ctx.fillText(msg,VIEW_W/2,cy-24);ctx.shadowBlur=0;
  }
  ctx.font='bold 38px '+FONT;ctx.fillStyle='#8fa0bd';ctx.globalAlpha=a;
  ctx.fillText(this.scores[0]+'  :  '+this.scores[1],VIEW_W/2,cy+34);
  ctx.font='18px '+FONT;ctx.fillStyle='#525d70';ctx.fillText('下一局即将开始…',VIEW_W/2,cy+78);
  ctx.globalAlpha=1;
 }
 drawCrownPath(ctx,x,y,s,color){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;
  ctx.beginPath();ctx.moveTo(-s,s*0.2);ctx.lineTo(-s,-s*0.75);ctx.lineTo(-s*0.5,-s*0.15);
  ctx.lineTo(0,-s*0.95);ctx.lineTo(s*0.5,-s*0.15);ctx.lineTo(s,-s*0.75);ctx.lineTo(s,s*0.2);
  ctx.closePath();ctx.fill();ctx.restore();
 }
 drawMatchEnd(ctx){
  ctx.fillStyle='rgba(4,6,10,0.82)';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  let winName,winColor;
  if(this.gameMode===0){winName=this.matchWinner===0?'玩家':'AI 阵营';winColor=this.matchWinner===0?'#38bdf8':'#ff8c42';}
  else if(this.gameMode===2){winName=this.matchWinner===0?'玩家阵营':'AI 阵营';winColor=this.matchWinner===0?'#38bdf8':'#ff8c42';}
  else{winName=this.tanks[this.matchWinner].name;winColor=this.tanks[this.matchWinner].color;}
  this.drawCrownPath(ctx,VIEW_W/2,180,36,'#ffd23f');
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 64px '+FONT;ctx.fillStyle=winColor;ctx.shadowColor=winColor;ctx.shadowBlur=30;
  ctx.fillText(winName+' 获胜！',VIEW_W/2,260);ctx.shadowBlur=0;
  ctx.font='bold 34px '+FONT;ctx.fillStyle='#8fa0bd';
  ctx.fillText(this.scores[0]+' : '+this.scores[1],VIEW_W/2,316);
  const pw=700,ph=220,px=VIEW_W/2-pw/2,py=360;
  ctx.fillStyle='rgba(12,16,24,0.92)';rr(ctx,px,py,pw,ph,14);ctx.fill();
  ctx.strokeStyle='#1e2636';ctx.lineWidth=1;rr(ctx,px,py,pw,ph,14);ctx.stroke();
  const stats=[];
  if(this.gameMode===0){
   stats.push(this.tanks[0].stats);
   const agg={shots:0,hits:0,dmg:0};
   for(let i=1;i<this.tanks.length;i++){agg.shots+=this.tanks[i].stats.shots;agg.hits+=this.tanks[i].stats.hits;agg.dmg+=this.tanks[i].stats.dmg;}
   stats.push(agg);
  }else if(this.gameMode===2){
   const pAgg={shots:0,hits:0,dmg:0};
   pAgg.shots+=this.tanks[0].stats.shots;pAgg.hits+=this.tanks[0].stats.hits;pAgg.dmg+=this.tanks[0].stats.dmg;
   pAgg.shots+=this.tanks[1].stats.shots;pAgg.hits+=this.tanks[1].stats.hits;pAgg.dmg+=this.tanks[1].stats.dmg;
   stats.push(pAgg);
   const agg={shots:0,hits:0,dmg:0};
   for(let i=2;i<this.tanks.length;i++){agg.shots+=this.tanks[i].stats.shots;agg.hits+=this.tanks[i].stats.hits;agg.dmg+=this.tanks[i].stats.dmg;}
   stats.push(agg);
  }else{stats.push(this.tanks[0].stats);stats.push(this.tanks[1].stats);}
  const labels=this.gameMode===0?['玩家','AI 阵营']:this.gameMode===2?['玩家阵营','AI 阵营']:[this.tanks[0].name,this.tanks[1].name];
  const colors=this.gameMode===0?['#38bdf8','#ff8c42']:this.gameMode===2?['#38bdf8','#ff8c42']:[this.tanks[0].color,this.tanks[1].color];
  const cols=[VIEW_W/2-170,VIEW_W/2+170];
  for(let i=0;i<2;i++){
   const st=stats[i],acc=st.shots?Math.round(st.hits/st.shots*100)+'%':'--';
   ctx.fillStyle=colors[i];ctx.font='bold 20px '+FONT;ctx.fillText(labels[i],cols[i],py+32);
   ctx.fillStyle='#7a8599';ctx.font='17px '+FONT;
   ctx.fillText('射击 '+st.shots,cols[i],py+68);ctx.fillText('命中 '+st.hits,cols[i],py+96);
   ctx.fillText('命中率 '+acc,cols[i],py+124);ctx.fillText('输出 '+st.dmg,cols[i],py+152);
   if(i===0){ctx.strokeStyle='#1e2636';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(VIEW_W/2,py+12);ctx.lineTo(VIEW_W/2,py+ph-12);ctx.stroke();}
  }
  ctx.font='bold 20px '+FONT;ctx.fillStyle='#ffd23f';
  ctx.fillText('R 再来一局        Esc 返回菜单',VIEW_W/2,py+ph+42);
 }
 drawPause(ctx){
  ctx.fillStyle='rgba(4,6,10,0.55)';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 68px '+FONT;ctx.fillStyle='#e8edf5';
  ctx.shadowColor='#38bdf8';ctx.shadowBlur=20;ctx.fillText('暂 停',VIEW_W/2,VIEW_H/2-24);ctx.shadowBlur=0;
  ctx.font='20px '+FONT;ctx.fillStyle='#7a8599';ctx.fillText('P 继续 · Esc 返回菜单',VIEW_W/2,VIEW_H/2+32);
 }
 drawMenu(ctx){
  const t=this.menuT,CX=VIEW_W/2;
  ctx.save();ctx.globalAlpha=0.07;
  drawTankBody(ctx,((t*55)%(VIEW_W+120))-60,VIEW_H*0.12,'right','#38bdf8',t*55,0);
  drawTankBody(ctx,VIEW_W-(((t*70)%(VIEW_W+120))-60),VIEW_H*0.18,'left','#ff8c42',t*70,0);
  ctx.restore();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 80px '+FONT;ctx.fillStyle='#ffd23f';
  ctx.shadowColor='#ff8c42';ctx.shadowBlur=36;
  ctx.fillText('坦 克 大 战',CX,68);ctx.shadowBlur=0;
  ctx.font='bold 16px '+FONT;ctx.fillStyle='#5a6478';
  ctx.fillText('OUBAO TANK ARENA · 本地对战',CX,104);
  const btnW=200,btnH=42,btnGap=18,btnX=CX-(btnW*3+btnGap*2)/2;
  for(let m=0;m<3;m++){
   const bx=btnX+m*(btnW+btnGap),sel=this.gameMode===m;
   if(sel){ctx.shadowColor='#ffd23f';ctx.shadowBlur=14;}
   ctx.fillStyle=sel?'#ffd23f':'rgba(22,28,40,0.95)';rr(ctx,bx,126,btnW,btnH,8);ctx.fill();
   ctx.strokeStyle=sel?'#ffd23f':'#252d3d';ctx.lineWidth=1;rr(ctx,bx,126,btnW,btnH,8);ctx.stroke();ctx.shadowBlur=0;
   ctx.fillStyle=sel?'#0b0d12':'#7a8599';ctx.font='bold 16px '+FONT;
   ctx.fillText(['单人对战 [1]','双人对战 [2]','协作对战 [3]'][m],bx+btnW/2,126+btnH/2);
  }   ctx.font='16px '+FONT;ctx.fillStyle='#5a6478';ctx.fillText('← → ↑ ↓ 选择地图',CX,188);
  const tw=140,th=76,gap=10,perRow=6,rows2=2;
  const gridW=perRow*tw+(perRow-1)*gap,gridX=CX-gridW/2,rowH=th+22,gridTop=206;
  for(let i=0;i<MAP_DEFS.length;i++){
   const on=i===this.mapIdx,col=i%perRow,row=Math.floor(i/perRow);
   const ox=gridX+col*(tw+gap),oy=gridTop+row*rowH+(on?-3:0);
   ctx.save();ctx.globalAlpha=on?1:0.45;
    const pv=this.previews[i],sc=Math.min(tw/(COLS*8),th/(ROWS*8));
   for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const ch=pv.grid[r][c];let col2='#121620';
    if(ch==='B')col2='#8a3e1e';else if(ch==='S')col2='#5a6270';
    else if(ch==='W')col2='#103050';else if(ch==='G')col2='#1e6830';
    ctx.fillStyle=col2;ctx.fillRect(ox+c*sc*8,oy+r*sc*8,sc*8+0.5,sc*8+0.5);
   }
   ctx.fillStyle='#38bdf8';ctx.beginPath();ctx.arc(ox+pv.spawns[0].c*sc*8+sc*4,oy+pv.spawns[0].r*sc*8+sc*4,3,0,7);ctx.fill();
   ctx.fillStyle='#ff8c42';ctx.beginPath();ctx.arc(ox+pv.spawns[1].c*sc*8+sc*4,oy+pv.spawns[1].r*sc*8+sc*4,3,0,7);ctx.fill();
   ctx.restore();
   if(on){ctx.shadowColor='#ffd23f';ctx.shadowBlur=12;}
   ctx.strokeStyle=on?'#ffd23f':'#1e2636';ctx.lineWidth=on?2:1;
   ctx.strokeRect(ox-2,oy-2,tw+4,th+4);ctx.shadowBlur=0;
   ctx.font=on?'bold 13px '+FONT:'12px '+FONT;ctx.fillStyle=on?'#ffd23f':'#4a5468';
   ctx.fillText(MAP_DEFS[i].name,ox+tw/2,oy+th+14);
  }
  const gridBot=gridTop+rows2*rowH+14;
  // AI难度和数量（单人/协作模式）
  let aiCtrlH=0;
  if(this.gameMode===0||this.gameMode===2){
   const ay=gridBot+4,diffNames=['简单','普通','困难'],diffColors=['#5dff70','#ffd23f','#ff5d5d'];
   // 难度按钮居中排列，间距更大
   const btnW=72,btnGap=12,diffTotalW=3*btnW+2*btnGap;
   const diffStartX=CX-diffTotalW/2;
   for(let i=0;i<3;i++){
    const dx=diffStartX+i*(btnW+btnGap),sel=this.aiDifficulty===i;
    ctx.fillStyle=sel?diffColors[i]:'rgba(22,28,40,0.95)';rr(ctx,dx,ay,btnW,30,6);ctx.fill();
    ctx.strokeStyle=sel?diffColors[i]:'#252d3d';rr(ctx,dx,ay,btnW,30,6);ctx.stroke();
    ctx.fillStyle=sel?'#0b0d12':'#5a6478';ctx.font='bold 15px '+FONT;ctx.textAlign='center';
    ctx.fillText(diffNames[i],dx+btnW/2,ay+15);
   }
   // 数量在右侧独立区域
   const countX=CX+diffTotalW/2+40;
   ctx.textAlign='left';ctx.font='16px '+FONT;ctx.fillStyle='#7a8599';ctx.fillText('数量',countX,ay+16);
   ctx.fillStyle='#ffd23f';ctx.font='bold 28px '+FONT;ctx.textAlign='center';ctx.fillText(this.aiCount,countX+55,ay+14);
   ctx.font='13px '+FONT;ctx.fillStyle='#3a4255';ctx.fillText('[Q] 难度   [Z−] [X+] 数量',CX,ay+48);
   aiCtrlH=60;
  }
  // 车型选择
  const classY=gridBot+aiCtrlH+4;
  ctx.font='16px '+FONT;ctx.fillStyle='#7a8599';ctx.textAlign='center';
  ctx.fillText('选择车型 [C/V]',CX,classY+12);
  const classW=120,classGap=15,totalW=this.tankClassList.length*classW+(this.tankClassList.length-1)*classGap;
  const classX=CX-totalW/2;
  for(let i=0;i<this.tankClassList.length;i++){
   const cls=TANK_CLASSES[this.tankClassList[i]];
   const sel=this.playerTankClass===this.tankClassList[i];
   const cx=classX+i*(classW+classGap);
   ctx.fillStyle=sel?cls.color:'rgba(22,28,40,0.95)';rr(ctx,cx,classY+20,classW,50,8);ctx.fill();
   ctx.strokeStyle=sel?cls.color:'#252d3d';ctx.lineWidth=sel?2:1;rr(ctx,cx,classY+20,classW,50,8);ctx.stroke();
   ctx.fillStyle=sel?'#0b0d12':'#7a8599';ctx.font='bold 14px '+FONT;ctx.textAlign='center';
   ctx.fillText(cls.icon+' '+cls.name,cx+classW/2,classY+38);
   ctx.font='11px '+FONT;ctx.fillStyle=sel?'#0b0d12':'#5a6478';
   ctx.fillText('HP:'+cls.hp+' 速:'+cls.speed,cx+classW/2,classY+55);
  }
  const classH=78;
  const ctrlY=gridBot+aiCtrlH+classH+8;
  const pw=320;
  if(this.gameMode===0)this.drawControlPanel(ctx,CX-pw/2,ctrlY,pw,'操作说明','#38bdf8',[['移动','W A S D'],['开火','F / 空格'],['暂停 P · 静音 M','']]);
  else if(this.gameMode===2){
   this.drawControlPanel(ctx,CX-pw-10,ctrlY,pw,'玩家 1','#38bdf8',[['移动','WASD'],['开火','F / 空格']]);
   this.drawControlPanel(ctx,CX+10,ctrlY,pw,'玩家 2','#34d399',[['移动','方向键'],['开火','L / 回车']]);
  }else{
   this.drawControlPanel(ctx,CX-pw-10,ctrlY,pw,'玩家 1','#38bdf8',[['移动','WASD'],['开火','F / 空格']]);
   this.drawControlPanel(ctx,CX+10,ctrlY,pw,'玩家 2','#ff8c42',[['移动','方向键'],['开火','L / 回车']]);
  }
  const ctrlH=28+(this.gameMode===0?3:2)*26+10;
  const infoY=ctrlY+ctrlH+14;
  ctx.font='15px '+FONT;ctx.fillStyle='#4a5468';
  ctx.fillText('先胜'+WIN_ROUNDS+'局 · 砖墙可碎 · 钢墙无敌 · 水面阻坦克 · 草丛藏身',CX,infoY);
  const items=Object.keys(POWER_TYPES),pGap=120,iy=infoY+32;
  for(let i=0;i<items.length;i++){
   const ix=CX-(items.length-1)*pGap/2+i*pGap;
   ctx.save();ctx.translate(ix,iy);ctx.scale(1.5,1.5);drawPowerIcon(ctx,items[i],9);ctx.restore();
   ctx.font='bold 15px '+FONT;ctx.fillStyle='#c7d0de';ctx.fillText(POWER_TYPES[items[i]].name,ix,iy+26);
   ctx.font='12px '+FONT;ctx.fillStyle='#7a8599';ctx.fillText(POWER_TYPES[items[i]].desc,ix,iy+42);
  }
  const startY=iy+54,pa=clamp(0.5+Math.sin(t*3)*0.5,0,1);
  ctx.globalAlpha=pa;ctx.font='bold 28px '+FONT;ctx.fillStyle='#ffd23f';
  ctx.shadowColor='#ff8c42';ctx.shadowBlur=16;ctx.fillText('按 回车 开始战斗',CX,startY);ctx.shadowBlur=0;
  ctx.globalAlpha=1;ctx.font='14px '+FONT;ctx.fillStyle='#3a4255';ctx.fillText('M 静音',CX,startY+26);
 }
 drawControlPanel(ctx,x,y,w,title,color,rows){
  const h=28+rows.length*26+10;
  ctx.fillStyle='rgba(12,16,24,0.92)';rr(ctx,x,y,w,h,10);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1.5;rr(ctx,x,y,w,h,10);ctx.stroke();
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.font='bold 18px '+FONT;ctx.fillStyle=color;ctx.fillText(title,x+18,y+28);
  ctx.font='16px '+FONT;let ry=y+52;
  for(const row of rows){
   ctx.fillStyle='#5a6478';ctx.fillText(row[0],x+18,ry);
   ctx.fillStyle='#c7d0de';ctx.textAlign='right';ctx.fillText(row[1],x+w-18,ry);ctx.textAlign='left';ry+=26;
  }
  ctx.textAlign='center';ctx.textBaseline='middle';
  return h;
 }
}
