'use strict';
const VIEW_W=1600,VIEW_H=900;
const CELL=55,COLS=22,ROWS=13;
const FIELD_W=COLS*CELL,FIELD_H=ROWS*CELL;
const FIELD_X=Math.floor((VIEW_W-FIELD_W)/2),FIELD_Y=88;
const EPS=0.01;
const FONT="'Segoe UI','Microsoft YaHei',sans-serif";
const DIRS={
 up:{x:0,y:-1,a:-Math.PI/2},
 down:{x:0,y:1,a:Math.PI/2},
 left:{x:-1,y:0,a:Math.PI},
 right:{x:1,y:0,a:0}
};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const randInt=(a,b)=>Math.floor(rand(a,b+1));
const chance=p=>Math.random()<p;
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
function rr(ctx,x,y,w,h,r){
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);
 ctx.arcTo(x,y,x+w,y,r);
 ctx.closePath();
}
function shade(hex,f){
 const n=parseInt(hex.slice(1),16);
 let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 r=clamp(Math.round(r*f),0,255);
 g=clamp(Math.round(g*f),0,255);
 b=clamp(Math.round(b*f),0,255);
 return 'rgb('+r+','+g+','+b+')';
}
function cellRand(c,r,n){
 const s=Math.sin(c*127.1+r*311.7+n*74.7)*43758.5453;
 return s-Math.floor(s);
}
