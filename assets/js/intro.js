(function(){
  var el=document.getElementById('intro'); if(!el) return;
  var seen=false; try{ seen=sessionStorage.getItem('equa_intro')==='1'; }catch(e){}
  if(seen){ el.parentNode.removeChild(el); return; }
  document.documentElement.classList.add('intro-lock');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var done=false, timer=setTimeout(finish, reduce?600:4300);
  function finish(){
    if(done) return; done=true; clearTimeout(timer);
    try{ sessionStorage.setItem('equa_intro','1'); }catch(e){}
    el.classList.add('is-done');
    document.documentElement.classList.remove('intro-lock');
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }
  el.addEventListener('click', finish);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'||e.key==='Enter'||e.key===' ') finish(); });
})();
