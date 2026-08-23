'use strict';
const POWER_TYPES={
 shield:{color:'#4dd2ff',name:'护盾'},
 speed:{color:'#ffd23f',name:'疾速'},
 heal:{color:'#5dff70',name:'维修'},
 rapid:{color:'#ff8cf0',name:'连发'},
 freeze:{color:'#9ad8ff',name:'冰冻'},
 power:{color:'#ff5d5d',name:'重炮'},
 ghost:{color:'#c89dff',name:'穿墙'},
 mine:{color:'#ffaa33',name:'地雷'},
 mega:{color:'#ff5555',name:'巨型'},
 scatter:{color:'#ff66aa',name:'散射'},
 emp:{color:'#22eeff',name:'EMP'}
};
const POWER_POOL=['shield','speed','heal','rapid','freeze','power','speed','heal','ghost','mine','mega','scatter','emp'];
function drawPowerIcon(ctx,type,s){
 const c=POWER_TYPES[type].color;
 ctx.save();
 ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
 if(type==='shield'){
  ctx.beginPath();
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3-Math.PI/2;
   const px=Math.cos(a)*s,py=Math.sin(a)*s;
   if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,s*0.35,0,7);ctx.stroke();
 }else if(type==='speed'){
  ctx.beginPath();
  ctx.moveTo(s*0.25,-s);ctx.lineTo(-s*0.55,s*0.1);ctx.lineTo(-s*0.08,s*0.1);
  ctx.lineTo(-s*0.25,s);ctx.lineTo(s*0.55,-s*0.1);ctx.lineTo(s*0.08,-s*0.1);
  ctx.closePath();ctx.fill();
 }else if(type==='heal'){
  ctx.beginPath();
  ctx.moveTo(0,s*0.75);
  ctx.bezierCurveTo(-s*1.2,-s*0.15,-s*0.5,-s*0.95,0,-s*0.35);
  ctx.bezierCurveTo(s*0.5,-s*0.95,s*1.2,-s*0.15,0,s*0.75);
  ctx.fill();
 }else if(type==='rapid'){
  for(let i=-1;i<=1;i++){
   const h=s*(i===0?1:0.62);
   rr(ctx,i*s*0.55-s*0.14,-h,s*0.28,h*2,s*0.14);ctx.fill();
  }
 }else if(type==='freeze'){
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);ctx.stroke();
   const tx=Math.cos(a)*s*0.62,ty=Math.sin(a)*s*0.62;
   ctx.beginPath();
   ctx.moveTo(tx,ty);ctx.lineTo(tx+Math.cos(a+2.4)*s*0.28,ty+Math.sin(a+2.4)*s*0.28);
   ctx.moveTo(tx,ty);ctx.lineTo(tx+Math.cos(a-2.4)*s*0.28,ty+Math.sin(a-2.4)*s*0.28);
   ctx.stroke();
  }
 }else if(type==='power'){
  ctx.beginPath();
  for(let i=0;i<10;i++){
   const a=i*Math.PI/5-Math.PI/2;
   const rad=i%2?s*0.44:s;
   const px=Math.cos(a)*rad,py=Math.sin(a)*rad;
   if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();ctx.fill();
 }else if(type==='ghost'){
  ctx.globalAlpha=0.5;
  ctx.beginPath();ctx.arc(0,0,s*0.7,0,7);ctx.stroke();
  ctx.beginPath();ctx.arc(0,-s*0.1,s*0.5,Math.PI*1.2,Math.PI*1.8);ctx.fill();
  ctx.beginPath();ctx.arc(-s*0.28,s*0.15,s*0.13,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(s*0.28,s*0.15,s*0.13,0,7);ctx.fill();
  ctx.globalAlpha=1;
 }else if(type==='mine'){
  ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,s*0.15,s*0.55,0,7);ctx.stroke();
  ctx.beginPath();ctx.arc(0,s*0.15,s*0.2,0,7);ctx.fill();
  ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,-s*0.1);ctx.lineTo(0,-s*0.55);ctx.stroke();
  ctx.beginPath();ctx.arc(0,-s*0.55,s*0.12,0,7);ctx.fill();
 }else if(type==='mega'){
  ctx.beginPath();
  ctx.moveTo(-s*0.6,-s*0.3);ctx.lineTo(s*0.6,-s*0.3);
  ctx.lineTo(s*0.3,-s*0.6);ctx.lineTo(s*0.6,0);
  ctx.lineTo(s*0.3,s*0.6);ctx.lineTo(-s*0.3,s*0.6);
  ctx.lineTo(-s*0.6,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.font='bold '+s*0.7+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('M',0,1);
 }else if(type==='scatter'){
  const angles=[-0.45,0,0.45];
  for(const a of angles){
   ctx.save();ctx.rotate(a);
   ctx.beginPath();ctx.moveTo(s*0.5,0);ctx.lineTo(-s*0.3,-s*0.25);ctx.lineTo(-s*0.3,s*0.25);
   ctx.closePath();ctx.fill();ctx.restore();
  }
 }else if(type==='emp'){
  ctx.lineWidth=2.5;
  for(let i=0;i<3;i++){
   const r=s*(0.35+i*0.22);
   ctx.beginPath();
   ctx.arc(0,0,r,-Math.PI*0.3+i*0.2,Math.PI*0.3+i*0.2);
   ctx.stroke();
  }
  ctx.beginPath();ctx.arc(0,0,s*0.18,0,7);ctx.fill();
 }
 ctx.restore();
}
class PowerUp{
 constructor(x,y,type){
  this.x=x;this.y=y;this.type=type;this.t=rand(0,6);this.life=11;this.picked=false;
 }
 update(dt){this.t+=dt;this.life-=dt;}
 expired(){return this.life<=0;}
 draw(ctx){
  const blink=this.life<3&&Math.sin(this.t*14)<0;
  if(blink)return;
  const bob=Math.sin(this.t*3)*3;
  const c=POWER_TYPES[this.type].color;
  ctx.save();
  ctx.translate(this.x,this.y+bob);
  ctx.rotate(Math.sin(this.t*2)*0.08);
  ctx.shadowColor=c;ctx.shadowBlur=14;
  ctx.fillStyle='rgba(16,20,28,0.92)';
  rr(ctx,-18,-18,36,36,9);ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=c;ctx.lineWidth=2;
  rr(ctx,-18,-18,36,36,9);ctx.stroke();
  drawPowerIcon(ctx,this.type,10);
  ctx.restore();
 }
}
class Mine{
 constructor(x,y,owner){
  this.x=x;this.y=y;this.owner=owner;
  this.t=0;this.life=18;this.armed=false;this.dead=false;
  this.blinkT=0;
 }
 update(dt){
  this.t+=dt;this.life-=dt;this.blinkT+=dt;
  if(this.t>0.8)this.armed=true;
  if(this.life<=0){this.dead=true;return;}
  if(!this.armed)return;
  const game=this.owner.game;
  for(const t of game.tanks){
    if(t===this.owner||!t.alive)continue;
    if((t.ai===null)===(this.owner.ai===null))continue;
   if(dist(this.x,this.y,t.x,t.y)<34){
    this.dead=true;
    game.parts.explosion(this.x,this.y,'#ffaa33');
    game.parts.ring(this.x,this.y,'#ff8800',50,4,0.4);
    game.addShake(6);
    AudioSys.boom();
    t.takeDamage(50,this.owner,game);
    return;
   }
  }
 }
 draw(ctx){
  if(this.dead)return;
  const blink=this.life<3&&Math.sin(this.blinkT*12)<0;
  if(blink)return;
  ctx.save();ctx.translate(this.x,this.y);
  const pulse=1+Math.sin(this.t*4)*0.08;
  ctx.scale(pulse,pulse);
  const armAlpha=this.armed?1:0.45;
  ctx.globalAlpha=armAlpha;
  ctx.strokeStyle='#ffaa33';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.stroke();
  ctx.fillStyle='#ffaa33';
  ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill();
  ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,-13);ctx.stroke();
  ctx.beginPath();ctx.arc(0,-13,3,0,7);ctx.fill();
  if(this.armed){
   ctx.globalAlpha=0.3+Math.sin(this.t*6)*0.15;
   ctx.strokeStyle='#ff6600';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(0,0,18,0,7);ctx.stroke();
  }
  ctx.restore();
 }
}
function applyPower(game,tank,type){
 const info=POWER_TYPES[type];
 if(type==='freeze'){
  if(game.gameMode===0||game.gameMode===2){
   for(const t of game.tanks){
    if(t!==tank&&t.alive){
     if(game.gameMode===2&&t.ai===null)continue;
     t.buff.freeze=2.2;t.buffMax.freeze=2.2;
    }
   }
   AudioSys.freeze();
   game.parts.text(tank.x,tank.y-30,'全屏冰冻！','#9ad8ff');
  }else{
   const other=game.tanks[1-tank.id];
   other.buff.freeze=2.2;other.buffMax.freeze=2.2;
   AudioSys.freeze();
   game.parts.spark(other.x,other.y,'#cfeaff',12,150);
   game.parts.text(other.x,other.y-30,'冰冻！',info.color);
  }
  return;
 }
 if(type==='heal'){
  tank.hp=Math.min(HP_MAX,tank.hp+40);
  AudioSys.pickup();
  game.parts.spark(tank.x,tank.y,info.color,10,140);
  game.parts.text(tank.x,tank.y-30,'+40 HP',info.color);
  return;
 }
 if(type==='mine'){
  game.mines.push(new Mine(tank.x,tank.y,tank));
  AudioSys.pickup();
  game.parts.spark(tank.x,tank.y,info.color,8,120);
  game.parts.text(tank.x,tank.y-30,'地雷已部署！',info.color);
  return;
 }
 if(type==='mega'){
  tank.hp=Math.min(HP_MAX+50,tank.hp+50);
  tank.buff.mega=10;tank.buffMax.mega=10;
  AudioSys.pickup();
  game.parts.ring(tank.x,tank.y,info.color,36,3,0.35);
  game.parts.star(tank.x,tank.y,info.color,6,8,180,0.25);
  game.parts.text(tank.x,tank.y-30,'巨型模式！',info.color);
  return;
 }
 if(type==='emp'){
  let count=0;
  for(const t of game.tanks){
   if(t!==tank&&t.alive&&t.buff.shield>0){
    t.buff.shield=0;count++;
   }
  }
  AudioSys.emp();
  game.parts.ring(tank.x,tank.y,'#22eeff',60,4,0.45);
  game.parts.spark(tank.x,tank.y,'#88eeff',16,180);
  game.parts.text(tank.x,tank.y-30,count>0?'护盾已摧毁！':'EMP冲击！',info.color);
  return;
 }
 if(type==='shield'||type==='speed'||type==='rapid'||type==='power'||type==='ghost'||type==='scatter'){
  tank.buff[type]=8;tank.buffMax[type]=8;
  AudioSys.pickup();
  game.parts.spark(tank.x,tank.y,info.color,10,140);
  game.parts.text(tank.x,tank.y-30,info.name+'！',info.color);
  if(type==='ghost'){
   game.parts.ring(tank.x,tank.y,'#c89dff',30,3,0.3);
  }else if(type==='scatter'){
   game.parts.star(tank.x,tank.y,'#ff66aa',5,6,160,0.22);
  }
 }
}
