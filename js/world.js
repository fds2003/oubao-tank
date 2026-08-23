'use strict';
class World{
 constructor(def){
  Object.assign(this,buildMap(def));
 }
 inB(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS;}
 at(c,r){return this.inB(c,r)?this.grid[r][c]:'#';}
 set(c,r,ch){if(this.inB(c,r))this.grid[r][c]=ch;}
 solidTank(c,r){const t=this.at(c,r);return t==='B'||t==='S'||t==='W';}
 destroyBrick(c,r){this.set(c,r,'.');}
 drawBase(ctx,time){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
   ctx.fillStyle=(c+r)%2?'#181c25':'#141821';
   ctx.fillRect(c*CELL,r*CELL,CELL,CELL);
  }
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
   const t=this.grid[r][c],x=c*CELL,y=r*CELL;
   if(t==='B')this.drawBrick(ctx,x,y,c,r);
   else if(t==='S')this.drawSteel(ctx,x,y);
   else if(t==='W')this.drawWater(ctx,x,y,time,c,r);
  }
 }
 drawBrick(ctx,x,y,c,r){
  ctx.fillStyle='#a04a26';
  ctx.fillRect(x,y,CELL,CELL);
  ctx.strokeStyle='rgba(46,18,8,0.5)';
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(x,y+13.5);ctx.lineTo(x+CELL,y+13.5);
  ctx.moveTo(x,y+27.5);ctx.lineTo(x+CELL,y+27.5);
  const off=cellRand(c,r,1)>0.5?10:30;
  ctx.moveTo(x+off+0.5,y);ctx.lineTo(x+off+0.5,y+13.5);
  ctx.moveTo(x+(CELL-off)+0.5,y+13.5);ctx.lineTo(x+(CELL-off)+0.5,y+27.5);
  ctx.moveTo(x+off+0.5,y+27.5);ctx.lineTo(x+off+0.5,y+CELL);
  ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.08)';
  ctx.fillRect(x,y,CELL,3);
  ctx.fillStyle='rgba(0,0,0,0.12)';
  ctx.fillRect(x,y+CELL-3,CELL,3);
 }
 drawSteel(ctx,x,y){
  ctx.fillStyle='#7d8698';
  ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
  ctx.strokeStyle='#c9d1de';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(x+3,y+CELL-3);ctx.lineTo(x+3,y+3);ctx.lineTo(x+CELL-3,y+3);
  ctx.stroke();
  ctx.strokeStyle='#484f5e';
  ctx.beginPath();
  ctx.moveTo(x+CELL-3,y+3);ctx.lineTo(x+CELL-3,y+CELL-3);ctx.lineTo(x+3,y+CELL-3);
  ctx.stroke();
  ctx.fillStyle='#98a1b3';
  ctx.beginPath();ctx.arc(x+CELL/2,y+CELL/2,6,0,7);ctx.fill();
  ctx.strokeStyle='#5a6272';
  ctx.lineWidth=1.5;ctx.stroke();
 }
 drawWater(ctx,x,y,time,c,r){
  ctx.fillStyle='#12365c';
  ctx.fillRect(x,y,CELL,CELL);
  ctx.fillStyle='rgba(125,212,255,0.12)';
  ctx.fillRect(x,y,CELL,6);
  const cy=y+CELL/2+Math.sin(time*2+c*1.3+r*0.9)*2;
  ctx.strokeStyle='rgba(125,212,255,0.4)';
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(x+5,cy-4);
  ctx.quadraticCurveTo(x+CELL/2,cy-8,x+CELL-5,cy-4);
  ctx.moveTo(x+5,cy+6);
  ctx.quadraticCurveTo(x+CELL/2,cy+2,x+CELL-5,cy+6);
  ctx.stroke();
 }
 drawGrass(ctx){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
   if(this.grid[r][c]!=='G')continue;
   const x=c*CELL+CELL/2,y=r*CELL+CELL/2;
   const cols=['#2e8f47','#38a754','#27793b'];
   for(let i=0;i<3;i++){
    ctx.globalAlpha=0.92;
    ctx.fillStyle=cols[i];
    ctx.beginPath();
    ctx.arc(x+(cellRand(c,r,i)-0.5)*22,y+(cellRand(c,r,i+3)-0.5)*22,11+i*2.5,0,7);
    ctx.fill();
   }
   ctx.globalAlpha=1;
  }
 }
}
