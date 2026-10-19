/* 引っぱって更新（ホーム画面に追加したアプリ表示のときだけ）。
   ブラウザで開いたときはブラウザ自身の更新があるので、二重にならないよう何もしない。 */
(function () {
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (!standalone || !('ontouchstart' in window)) return;
  var TH = 70, startY = null, dy = 0, busy = false;
  var bar = document.createElement('div');
  bar.className = 'ptr';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '<span class="ptr-ico" aria-hidden="true">↓</span><span class="ptr-txt">引っぱって更新</span>';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(bar); });
  var txt = function () { return bar.querySelector('.ptr-txt'); };
  function top() { return (window.scrollY || document.documentElement.scrollTop || 0) <= 0; }
  window.addEventListener('touchstart', function (e) {
    if (busy || e.touches.length !== 1 || !top()) { startY = null; return; }
    startY = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (dy <= 0 || !top()) { bar.style.transform = ''; bar.classList.remove('on'); return; }
    var pull = Math.min(dy / 2, 90);
    bar.classList.add('on');
    bar.style.transform = 'translate(-50%,' + pull + 'px)';
    var ready = dy > TH * 2 ? true : dy > TH;
    bar.classList.toggle('ready', ready);
    txt().textContent = ready ? '離すと更新' : '引っぱって更新';
  }, { passive: true });
  window.addEventListener('touchend', function () {
    if (startY === null) return;
    if (dy > TH && top()) {
      busy = true;
      bar.classList.add('ready', 'loading');
      txt().textContent = '更新中…';
      setTimeout(function () { window.location.reload(); }, 150);
    } else {
      bar.classList.remove('on', 'ready');
      bar.style.transform = '';
    }
    startY = null; dy = 0;
  }, { passive: true });
})();
