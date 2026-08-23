 'use strict';
class Particles{
 constructor(){this.list=[];}
 add(p){p.t=0;this.list.push(p);}
 debris(x,y,color,n,spd){
  for(let i=0;i<n;i++)this.add({k:'sq',x:x,y:y,vx:rand(-spd,spd),vy:rand(-spd,spd)-40,rot:rand(0,6),vr:rand(-9,9),s:rand(2,5),color:color,life:rand(0.3,0.7)});
 }
 ring(x,y,color,maxR,w,life){this.add({k:'ring',x:x,y:y,color:color,maxR:maxR||44,w:w||3,life:life||0.35});}
 flash(x,y,r){this.add({k:'flash',x:x,y:y,r:r||28,life:0.18});}
 smoke(x,y,n){
  for(let i=0;i<n;i++)this.add({k:'smoke',x:x+rand(-9,9),y:y+rand(-9,9),vx:rand(-16,16),vy:rand(-28,-6),r:rand(4,9),gr:rand(10,24),life:rand(0.5,0.95)});
 }
 spark(x,y,color,n,spd){
  for(let i=0;i<n;i++){
   const a=rand(0,6.283);
   this.add({k:'spark',x:x,y:y,vx:Math.cos(a)*rand(spd*0.4,spd),vy:Math.sin(a)*rand(spd*0.4,spd),color:color,life:rand(0.12,0.28)});
  }
 }
 star(x,y,color,r,n,spd,life){
  for(let i=0;i<n;i++){
   const a=i*6.283/n+rand(-0.2,0.2);
   const s=rand(spd*0.5,spd);
   this.add({k:'star',x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:r,rot:rand(0,6.283),vr:rand(-12,12),color:color,life:life||0.22});
  }
 }
 trail(x,y,color,dir){
  this.add({k:'trail',x:x+rand(-2,2),y:y+rand(-2,2),vx:-dir.x*rand(12,28),vy:-dir.y*rand(12,28)-10,r:rand(2,4),gr:rand(4,8),color:color,life:rand(0.25,0.5)});
 }
 heatRing(x,y,color,maxR){
  this.add({k:'heatRing',x:x,y:y,color:color,maxR:maxR,life:0.35});
 }
 text(x,y,str,color,size){this.add({k:'text',x:x,y:y,vy:-56,str:str,color:color,size:size||20,life:0.9});}
 snow(x,y){this.add({k:'snow',x:x+rand(-16,16),y:y+rand(-14,10),vy:rand(18,34),sd:rand(0,6),life:rand(0.5,0.9)});}
 confetti(x){
  const cols=['#38bdf8','#ff8c42','#ffd23f','#ffffff','#7ef29a'];
  this.add({k:'sq',x:x,y:-10,vx:rand(-30,30),vy:rand(60,130),rot:rand(0,6),vr:rand(-6,6),s:rand(3,6),color:cols[randInt(0,4)],life:rand(1.8,2.6)});
 }
 explosion(x,y,color){
  this.flash(x,y,34);
  this.ring(x,y,'#ffd28a',54,4,0.42);
  this.debris(x,y,color,16,260);
  this.debris(x,y,'#ffb35c',8,190);
  this.smoke(x,y,7);
 }
 muzzleBlast(x,y,dirKey,color,heavy){
  const d=DIRS[dirKey];
  const r=heavy?18:14;
  this.flash(x,y,r);
  this.ring(x,y,heavy?'#ffcc44':'#ffe9a3',heavy?36:24,heavy?3.5:2.5,0.18);
  const n=heavy?12:7;
  for(let i=0;i<n;i++){
   const a=Math.atan2(d.y,d.x)+rand(-0.55,0.55);
   const spd=rand(140,heavy?340:240);
   this.add({k:'spark',x:x,y:y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,color:i<3?'#ffffff':'#ffe9a3',life:rand(0.08,0.2)});
  }
  this.star(x,y,'#ffe9a3',heavy?7:5,heavy?6:4,heavy?200:140,0.16);
  this.smoke(x,y,heavy?4:2);
  this.heatRing(x,y,color,heavy?28:18);
 }
 hitImpact(x,y,color,dmg,dir){
  this.flash(x,y,16+dmg*0.08);
  this.ring(x,y,color,22+dmg*0.15,3,0.3);
  for(let i=0;i<8;i++){
   const a=dir?Math.atan2(dir.y,dir.x)+rand(-1.2,1.2):rand(0,6.283);
   const spd=rand(100,260);
   this.add({k:'spark',x:x,y:y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,color:i<3?'#ffffff':color,life:rand(0.1,0.25)});
  }
  this.star(x,y,color,5,5,180,0.18);
  this.smoke(x,y,3);
 }
 shieldImpact(x,y){
  this.ring(x,y,'#4dd2ff',34,3.5,0.35);
  this.ring(x,y,'#8aeaff',22,2,0.25);
  this.spark(x,y,'#c7f3ff',10,160);
  this.flash(x,y,14);
 }
  update(dt){
   for(const p of this.list){
    p.t+=dt;
    switch(p.k){
     case'sq':p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.rot+=p.vr*dt;break;
     case'spark':p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(0.02,dt);p.vy*=Math.pow(0.02,dt);break;
     case'smoke':p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.gr*dt;break;
     case'text':p.y+=p.vy*dt;break;
     case'snow':p.y+=p.vy*dt;p.x+=Math.sin(p.t*5+p.sd)*16*dt;break;
     case'star':p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(0.06,dt);p.vy*=Math.pow(0.06,dt);p.rot+=p.vr*dt;break;
     case'trail':p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.gr*dt;break;
    }
   }
   let w=0;
   for(let r=0;r<this.list.length;r++){
    if(this.list[r].t<this.list[r].life)this.list[w++]=this.list[r];
   }
   this.list.length=w;
  }
 draw(ctx){
  for(const p of this.list){
   const a=Math.max(0,1-p.t/p.life);
   ctx.globalAlpha=a;
   switch(p.k){
    case'sq':
     ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
     ctx.fillStyle=p.color;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s);
     ctx.restore();break;
    case'ring':{
     const q=p.t/p.life;
     ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(0.5,p.w*(1-q));
     ctx.beginPath();ctx.arc(p.x,p.y,4+p.maxR*q,0,7);ctx.stroke();break;
    }
    case'heatRing':{
     const q=p.t/p.life;
     ctx.globalAlpha=a*0.25;
     ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(0.5,2.5*(1-q));
     ctx.beginPath();ctx.arc(p.x,p.y,6+p.maxR*q,0,7);ctx.stroke();break;
    }
    case'flash':
     ctx.fillStyle='#fff3cf';
     ctx.beginPath();ctx.arc(p.x,p.y,p.r*(0.4+(p.t/p.life)*0.8),0,7);ctx.fill();break;
    case'smoke':
     ctx.fillStyle='#8b909b';ctx.globalAlpha=a*0.32;
     ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();break;
    case'text':
     ctx.font='bold '+p.size+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillStyle=p.color;ctx.fillText(p.str,p.x,p.y);break;
    case'spark':
     ctx.strokeStyle=p.color;ctx.lineWidth=2;
     ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03);ctx.stroke();break;
    case'star':{
     ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
     ctx.fillStyle=p.color;
     ctx.beginPath();
     for(let i=0;i<6;i++){
      const a=i*1.047;
      const rr=i%2?p.r*0.4:p.r;
      if(i)ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);
      else ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);
     }
     ctx.closePath();ctx.fill();ctx.restore();break;
    }
    case'trail':
     ctx.fillStyle=p.color;ctx.globalAlpha=a*0.45;
     ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.5,p.r),0,7);ctx.fill();break;
    case'snow':
     ctx.fillStyle='#dff2ff';ctx.fillRect(p.x-1.2,p.y-1.2,2.4,2.4);break;
   }
   ctx.globalAlpha=1;
  }
 }
 clear(){this.list.length=0;}
}
