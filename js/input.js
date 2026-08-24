'use strict';
const GAME_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','KeyW','KeyA','KeyS','KeyD','KeyF','KeyL','Escape','KeyP','KeyM','KeyR','Digit1','Digit2','Digit3','Digit4','Digit5']);
const Input={
 held:new Set(),taps:new Set(),
 init(){
  window.addEventListener('keydown',e=>{
   if(GAME_KEYS.has(e.code))e.preventDefault();
   if(!e.repeat)this.taps.add(e.code);
   this.held.add(e.code);
   AudioSys.ensure();
  },{passive:false});
  window.addEventListener('keyup',e=>this.held.delete(e.code));
  window.addEventListener('blur',()=>{this.held.clear();});
 },
 down(...cs){return cs.some(c=>this.held.has(c));},
 pressed(...cs){return cs.some(c=>this.taps.has(c));},
 endFrame(){this.taps.clear();}
};
