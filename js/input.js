'use strict';
const GAME_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','KeyW','KeyA','KeyS','KeyD','KeyF','KeyL','Escape','KeyP','KeyM','KeyR','KeyC','KeyV','KeyQ','KeyZ','KeyX','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6']);
const Input={
 held:new Set(),taps:new Set(),
 mouse:{x:800,y:450,down:false,taps:false,active:false},
 gamepads:[
  {connected:false,dir:null,fire:false,aimAngle:null,btns:{}},
  {connected:false,dir:null,fire:false,aimAngle:null,btns:{}}
 ],
 _kd:null,_ku:null,_bl:null,_mm:null,_md:null,_mu:null,
 init(canvas){
  this._kd=e=>{
   if(GAME_KEYS.has(e.code))e.preventDefault();
   if(!e.repeat)this.taps.add(e.code);
   this.held.add(e.code);
   AudioSys.ensure();
  };
  this._ku=e=>this.held.delete(e.code);
  this._bl=()=>{this.held.clear();this.mouse.down=false;};
  window.addEventListener('keydown',this._kd,{passive:false});
  window.addEventListener('keyup',this._ku);
  window.addEventListener('blur',this._bl);

  const updateMousePos=e=>{
   const targetCanvas=canvas||document.getElementById('game');
   if(!targetCanvas)return;
   const rect=targetCanvas.getBoundingClientRect();
   const scaleX=VIEW_W/(rect.width||VIEW_W);
   const scaleY=VIEW_H/(rect.height||VIEW_H);
   this.mouse.x=(e.clientX-rect.left)*scaleX;
   this.mouse.y=(e.clientY-rect.top)*scaleY;
   this.mouse.active=true;
  };
  this._mm=e=>updateMousePos(e);
  this._md=e=>{
   updateMousePos(e);
   if(e.button===0){
    this.mouse.down=true;
    this.mouse.taps=true;
   }
   AudioSys.ensure();
  };
  this._mu=e=>{
   if(e.button===0)this.mouse.down=false;
  };
  window.addEventListener('mousemove',this._mm);
  window.addEventListener('mousedown',this._md);
  window.addEventListener('mouseup',this._mu);
 },
 destroy(){
  if(this._kd)window.removeEventListener('keydown',this._kd);
  if(this._ku)window.removeEventListener('keyup',this._ku);
  if(this._bl)window.removeEventListener('blur',this._bl);
  if(this._mm)window.removeEventListener('mousemove',this._mm);
  if(this._md)window.removeEventListener('mousedown',this._md);
  if(this._mu)window.removeEventListener('mouseup',this._mu);
  this.held.clear();this.taps.clear();
  this.mouse.down=false;this.mouse.taps=false;
 },
 pollGamepad(){
  if(typeof navigator==='undefined'||!navigator.getGamepads)return;
  const rawPads=navigator.getGamepads();
  if(!rawPads)return;
  for(let i=0;i<2;i++){
   const pad=rawPads[i];
   const state=this.gamepads[i];
   if(!pad||!pad.connected){
    state.connected=false;state.dir=null;state.fire=false;state.aimAngle=null;state.btns={};
    continue;
   }
   state.connected=true;
   const b=pad.buttons||[];
   const ax=pad.axes||[0,0,0,0];
   const isDown=idx=>b[idx]&&(b[idx].pressed||b[idx].value>0.3);
   state.btns={
    a:isDown(0),b:isDown(1),x:isDown(2),y:isDown(3),
    lb:isDown(4),rb:isDown(5),lt:isDown(6),rt:isDown(7),
    select:isDown(8),start:isDown(9),
    up:isDown(12),down:isDown(13),left:isDown(14),right:isDown(15)
   };
   // 1. 开火判定：A / X / RB / RT
   state.fire=state.btns.a||state.btns.x||state.btns.rb||state.btns.rt;
   // 2. 移动方向判定：D-pad 优先，其次左摇杆 (Deadzone=0.25)
   let dir=null;
   if(state.btns.up)dir='up';
   else if(state.btns.down)dir='down';
   else if(state.btns.left)dir='left';
   else if(state.btns.right)dir='right';
   else{
    const dz=(typeof CONFIG!=='undefined'&&CONFIG.GAMEPAD_DEADZONE)||0.25;
    const lx=ax[0]||0,ly=ax[1]||0;
    const maxA=Math.max(Math.abs(lx),Math.abs(ly));
    if(maxA>dz){
     if(Math.abs(lx)>Math.abs(ly))dir=lx>0?'right':'left';
     else dir=ly>0?'down':'up';
    }
   }
   state.dir=dir;
   // 3. 右摇杆 360° 瞄准角度 (Deadzone)
   const dz=(typeof CONFIG!=='undefined'&&CONFIG.GAMEPAD_DEADZONE)||0.25;
   const rx=ax[2]||0,ry=ax[3]||0;
   const rMag=Math.hypot(rx,ry);
   if(rMag>dz){
    state.aimAngle=Math.atan2(ry,rx);
   }else{
    state.aimAngle=null;
   }
  }
 },
 getGamepadDir(playerIndex=0){
  const s=this.gamepads[playerIndex];
  return s&&s.connected?s.dir:null;
 },
 getGamepadFire(playerIndex=0){
  const s=this.gamepads[playerIndex];
  return s&&s.connected?s.fire:false;
 },
 getGamepadAimAngle(playerIndex=0){
  const s=this.gamepads[playerIndex];
  return s&&s.connected?s.aimAngle:null;
 },
 vibrate(playerIndex=0,duration=200,weak=0.3,strong=0.5){
  if(typeof navigator==='undefined'||!navigator.getGamepads)return;
  const rawPads=navigator.getGamepads();
  if(!rawPads||!rawPads[playerIndex])return;
  const pad=rawPads[playerIndex];
  if(pad.vibrationActuator&&pad.vibrationActuator.playEffect){
   try{
    pad.vibrationActuator.playEffect('dual-rumble',{
     startDelay:0,
     duration:duration,
     weakMagnitude:weak,
     strongMagnitude:strong
    }).catch(()=>{});
   }catch(e){}
  }
 },
 down(...cs){return cs.some(c=>this.held.has(c));},
 pressed(...cs){return cs.some(c=>this.taps.has(c));},
 mouseDown(){return this.mouse.down;},
 mousePressed(){return this.mouse.taps;},
 endFrame(){this.taps.clear();this.mouse.taps=false;}
};
