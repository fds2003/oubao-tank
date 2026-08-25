'use strict';
const GAME_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','KeyW','KeyA','KeyS','KeyD','KeyF','KeyL','Escape','KeyP','KeyM','KeyR','KeyC','KeyV','KeyQ','KeyZ','KeyX','Digit1','Digit2','Digit3','Digit4','Digit5']);
const Input={
 held:new Set(),taps:new Set(),
 _kd:null,_ku:null,_bl:null,
 init(){
  this._kd=e=>{
   if(GAME_KEYS.has(e.code))e.preventDefault();
   if(!e.repeat)this.taps.add(e.code);
   this.held.add(e.code);
   AudioSys.ensure();
  };
  this._ku=e=>this.held.delete(e.code);
  this._bl=()=>{this.held.clear();};
  window.addEventListener('keydown',this._kd,{passive:false});
  window.addEventListener('keyup',this._ku);
  window.addEventListener('blur',this._bl);
 },
 destroy(){
  if(this._kd)window.removeEventListener('keydown',this._kd);
  if(this._ku)window.removeEventListener('keyup',this._ku);
  if(this._bl)window.removeEventListener('blur',this._bl);
  this.held.clear();this.taps.clear();
 },
 down(...cs){return cs.some(c=>this.held.has(c));},
 pressed(...cs){return cs.some(c=>this.taps.has(c));},
 endFrame(){this.taps.clear();}
};
