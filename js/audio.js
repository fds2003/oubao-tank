'use strict';
const AudioSys={
 ctx:null,master:null,muted:false,
 ensure(){
  if(!this.ctx){
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return;
   this.ctx=new AC();
   this.master=this.ctx.createGain();
   this.master.gain.value=this.muted?0:0.5;
   this.master.connect(this.ctx.destination);
  }
  if(this.ctx.state==='suspended')this.ctx.resume();
 },
 toggleMute(){
  this.muted=!this.muted;
  if(this.master)this.master.gain.value=this.muted?0:0.5;
 },
 tone(o){
  if(!this.ctx||this.muted)return;
  const t0=this.ctx.currentTime+(o.delay||0);
  const dur=o.dur||0.1;
  const osc=this.ctx.createOscillator();
  const g=this.ctx.createGain();
  osc.type=o.type||'square';
  osc.frequency.setValueAtTime(o.f||440,t0);
  if(o.f2)osc.frequency.exponentialRampToValueAtTime(Math.max(1,o.f2),t0+dur);
  g.gain.setValueAtTime(o.vol||0.25,t0);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  osc.connect(g);g.connect(this.master);
  osc.start(t0);osc.stop(t0+dur+0.03);
 },
 noise(o){
  if(!this.ctx||this.muted)return;
  const t0=this.ctx.currentTime+(o.delay||0);
  const dur=o.dur||0.2;
  const len=Math.ceil(this.ctx.sampleRate*dur);
  const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const src=this.ctx.createBufferSource();
  src.buffer=buf;
  const flt=this.ctx.createBiquadFilter();
  flt.type='lowpass';
  flt.frequency.setValueAtTime(o.from||2000,t0);
  flt.frequency.exponentialRampToValueAtTime(Math.max(40,o.to||200),t0+dur);
  const g=this.ctx.createGain();
  g.gain.setValueAtTime(o.vol||0.3,t0);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  src.connect(flt);flt.connect(g);g.connect(this.master);
  src.start(t0);src.stop(t0+dur);
 },
 shoot(){this.tone({f:900,f2:230,dur:0.07,type:'square',vol:0.13});this.noise({dur:0.05,from:3200,to:900,vol:0.08});},
 heavyShoot(){this.tone({f:600,f2:80,dur:0.12,type:'square',vol:0.22});this.noise({dur:0.08,from:2400,to:200,vol:0.15});this.tone({f:120,f2:40,dur:0.08,type:'sawtooth',vol:0.12});},
 clink(){this.tone({f:1350,f2:850,dur:0.05,type:'triangle',vol:0.18});this.noise({dur:0.03,from:4000,to:1500,vol:0.1});},
 crack(){this.noise({dur:0.09,from:1600,to:300,vol:0.22});},
 thud(){this.tone({f:170,f2:60,dur:0.11,type:'square',vol:0.26});this.noise({dur:0.07,from:800,to:150,vol:0.16});},
 boom(){this.noise({dur:0.55,from:2800,to:80,vol:0.5});this.tone({f:130,f2:34,dur:0.5,type:'sine',vol:0.4});},
 pickup(){this.tone({f:660,dur:0.08,type:'square',vol:0.16});this.tone({f:880,dur:0.08,type:'square',vol:0.16,delay:0.07});this.tone({f:1320,dur:0.14,type:'square',vol:0.16,delay:0.14});},
 freeze(){this.tone({f:1300,f2:280,dur:0.3,type:'sine',vol:0.24});},
 shieldHit(){this.tone({f:520,f2:980,dur:0.09,type:'triangle',vol:0.2});},
 beep(){this.tone({f:760,dur:0.08,type:'square',vol:0.22});},
 go(){this.tone({f:360,f2:640,dur:0.4,type:'sawtooth',vol:0.26});this.tone({f:180,f2:320,dur:0.4,type:'sawtooth',vol:0.18});},
 win(){[523,659,784,1046].forEach((f,i)=>this.tone({f:f,dur:0.2,type:'triangle',vol:0.22,delay:i*0.13}));},
 emp(){this.tone({f:2000,f2:100,dur:0.25,type:'sawtooth',vol:0.2});this.noise({dur:0.15,from:4000,to:200,vol:0.18});this.tone({f:800,f2:200,dur:0.18,type:'square',vol:0.15,delay:0.08});}
};
