/* スマホの画面下の「LINEで無料相談」ボタン（11/17）
   ・表示は CSS で幅760px以下のときだけ（PCでは display:none のまま）。本文やフッターを隠さないよう、下に同じ高さの余白（.juta-bar-pad）を置く
   ・×で閉じたら、ボタンと余白を消し、そのページ（同じ場所）ではこのタブの間は出さない（sessionStorage。使えないときはその場で消すだけ）
   ・通信しない。押したときの計測は ga.js（line_click、data-cta="sticky_line"）
   ・使うページ：EQUAトップ・業種ページ・/studio/custom/。無料ツールの画面には入れない（計算のじゃまになるため） */
(function () {
  'use strict';
  var KEY = 'juta-bar-closed:' + location.pathname;
  function hide() {
    var b = document.querySelector('.juta-bar'), p = document.querySelector('.juta-bar-pad');
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }
  function init() {
    var closed = false;
    try { closed = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* 保存できなくても動く */ }
    if (closed) { hide(); return; }
    var x = document.querySelector('.juta-bar__x');
    if (!x) return;
    x.addEventListener('click', function () {
      try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 保存できなくても閉じる */ }
      hide();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
