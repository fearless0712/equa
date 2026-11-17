window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-EWJXRJY9M6');
/* 次に進んだ人の数（11/6）：BOOTH・公式LINE・無料版zip へのリンクのクリックと、業種スタジオの見本ページの表示を GA4 のイベントで数える。
   送るのは上の gtag だけ（新しい通信先なし）。送るのはリンク先・ページの場所・ボタンの印（data-cta）だけで、入力した内容は送らない。
   purchase_click … booth.pm へのリンク ／ line_click … line.me へのリンク
   free_download … /studio/<業種>/free/ の zip ／ studio_view … /studio/<業種>/ の見本ページを開いた（作り変えの相談 custom は除く） */
(function (w, d) {
  'use strict';
  var STUDIO = /^\/studio\/([a-z0-9-]+)\/(?:index\.html)?$/;
  var FREE_ZIP = /^\/studio\/[a-z0-9-]+\/free\/[^\/]+\.zip$/i;
  function send(name, p) { try { p.page_path = w.location.pathname; p.transport_type = 'beacon'; gtag('event', name, p); } catch (e) { /* 計測できなくてもページはそのまま */ } }
  function kind(a) {
    var host = (a.hostname || '').toLowerCase(), path = a.pathname || '';
    if (path.charAt(0) !== '/') path = '/' + path;
    if (host === 'booth.pm' || /\.booth\.pm$/.test(host)) return 'purchase_click';
    if (host === 'line.me' || /\.line\.me$/.test(host)) return 'line_click';
    if (host === w.location.hostname && FREE_ZIP.test(path)) return 'free_download';
    return '';
  }
  function onClick(e) {
    if (e.type === 'auxclick' && e.button !== 1) return; // 中ボタン（新しいタブ）だけ
    var a = e.target;
    while (a && a.nodeName !== 'A') a = a.parentNode;
    if (!a || !a.href) return;
    var k = kind(a);
    if (!k) return;
    var p = { link_url: a.href };
    var cta = a.getAttribute && a.getAttribute('data-cta');
    if (cta) p.cta = cta;
    if (k === 'free_download') p.file_name = (a.pathname || '').split('/').pop();
    send(k, p);
  }
  try {
    var m = STUDIO.exec(w.location.pathname);
    if (m && m[1] !== 'custom') send('studio_view', { studio: m[1] });
    d.addEventListener('click', onClick, true);
    d.addEventListener('auxclick', onClick, true);
  } catch (e) { /* 計測できなくてもページはそのまま */ }
})(window, document);
