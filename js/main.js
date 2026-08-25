'use strict';
window.addEventListener('DOMContentLoaded',()=>{
 const canvas=document.getElementById('game');
 const dpr=Math.min(2,window.devicePixelRatio||1);
 function resize(){
  canvas.width=VIEW_W*dpr;
  canvas.height=VIEW_H*dpr;
 }
 resize();
 Input.init();
 const game=new Game(canvas.getContext('2d'),dpr);
 window.__game=game; // 调试/自动化测试钩子
 const blurHandler=()=>game.autoPause();
 window.addEventListener('blur',blurHandler);
 game.start();
 game._cleanup=()=>{window.removeEventListener('blur',blurHandler);Input.destroy();};
});
