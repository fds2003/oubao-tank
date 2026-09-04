'use strict';
(function(){
  function initSite(){
    var header=document.querySelector('.site-header');
    var toggle=document.querySelector('.site-nav-toggle');
    if(header&&toggle){
      toggle.addEventListener('click',function(){
        var open=header.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded',open?'true':'false');
      });
    }
    var items=document.querySelectorAll('.faq-item');
    for(var i=0;i<items.length;i++){
      items[i].addEventListener('toggle',function(){
        if(this.open){
          for(var j=0;j<items.length;j++){
            if(items[j]!==this&&items[j].open)items[j].open=false;
          }
        }
      });
    }
    var years=document.querySelectorAll('[data-year]');
    var now=new Date().getFullYear();
    for(var k=0;k<years.length;k++){years[k].textContent=now;}
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSite);
  }else{
    initSite();
  }
  if(typeof window!=='undefined')window.initSite=initSite;
})();