window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-EWJXRJY9M6');
/* 次に進んだ人の数（11/6・11/17）：GA4 のイベントで数える。
   送るのは上の gtag だけ（新しい通信先なし）。送るのはリンク先・ページの場所・ボタンの印（data-cta）・ボタンの文字・道具の名前だけで、入力した内容は送らない。
   select_item … BOOTH・Gumroad へのリンク（item_id＝URLの商品番号。外部ストアのクリックは purchase として送らない）
   line_click … line.me へのリンク（page_path・cta＝どのボタンか）
   free_download … /studio/<業種>/free/ の zip ／ studio_view … /studio/<業種>/ の見本ページを開いた（作り変えの相談 custom は除く）
   custom_service_view … data-ga-view="custom_service" の欄（/studio/custom/・業種ページの相談欄）が画面に入った（1ページ1回）
   free_tool_use … 主な無料ツールで、入力・計算ボタンなどを初めて使った（1ページ1回。入力した値は送らない） */
(function (w, d) {
  'use strict';
  var STUDIO = /^\/studio\/([a-z0-9-]+)\/(?:index\.html)?$/;
  var FREE_ZIP = /^\/studio\/[a-z0-9-]+\/free\/[^\/]+\.zip$/i;
  var FREE_TOOL = /^\/(suryo|kouki|shiharai|anbun|hiwari|riekiritsu|kinri|shaken|workdays|due-date|hozon|sonkiri|freelance-rate|erabikata)\/(?:index\.html)?$/;
  function send(name, p) { try { p.page_path = w.location.pathname; p.transport_type = 'beacon'; gtag('event', name, p); } catch (e) { /* 計測できなくてもページはそのまま */ } }
  function store(host) {
    if (host === 'booth.pm' || /\.booth\.pm$/.test(host)) return 'BOOTH';
    if (host === 'gumroad.com' || /\.gumroad\.com$/.test(host) || host === 'gum.co') return 'Gumroad';
    return '';
  }
  function itemId(host, path) {
    var m = /\/items\/(\d+)/.exec(path) || /^\/l\/([A-Za-z0-9_-]+)/.exec(path) || (host === 'gum.co' && /^\/([A-Za-z0-9_-]+)/.exec(path));
    return m ? m[1] : '';
  }
  function kind(a) {
    var host = (a.hostname || '').toLowerCase(), path = a.pathname || '';
    if (path.charAt(0) !== '/') path = '/' + path;
    if (store(host)) return 'select_item';
    if (host === 'line.me' || /\.line\.me$/.test(host)) return 'line_click';
    if (host === w.location.hostname && FREE_ZIP.test(path)) return 'free_download';
    return '';
  }
  function label(a) {
    var t = (a.textContent || '').replace(/\s+/g, ' ').replace(/（新しいタブで開きます）/g, '').trim();
    return t.slice(0, 40);
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
    if (k === 'line_click') { var t = label(a); if (t) p.link_text = t; }
    if (k === 'free_download') p.file_name = (a.pathname || '').split('/').pop();
    if (k === 'select_item') {
      var host = (a.hostname || '').toLowerCase(), path = a.pathname || '';
      if (path.charAt(0) !== '/') path = '/' + path;
      var id = itemId(host, path);
      p.item_list_name = store(host);
      if (id) { p.item_id = id; p.items = [{ item_id: id, affiliation: store(host) }]; }
    }
    send(k, p);
  }
  /* 無料ツール：最初の入力・ボタン（タブの切り替えは除く）で1回だけ */
  function watchUse(tool) {
    var done = false;
    function use(e) {
      if (done || e.isTrusted === false) return;
      var t = e.target, how = '';
      if (!t || !t.closest || !t.closest('main')) return;
      if (e.type === 'click') {
        var b = t.closest('button');
        if (!b || b.getAttribute('role') === 'tab') return;
        how = 'button';
      } else {
        if (!/^(INPUT|SELECT|TEXTAREA)$/.test(t.nodeName)) return;
        how = 'input';
      }
      done = true;
      ['click', 'input', 'change'].forEach(function (n) { d.removeEventListener(n, use, true); });
      send('free_tool_use', { tool: tool, how: how });
    }
    ['click', 'input', 'change'].forEach(function (n) { d.addEventListener(n, use, true); });
  }
  /* 相談の欄が画面に入ったら1回だけ */
  function watchView() {
    if (!('IntersectionObserver' in w) || !d.querySelectorAll) return;
    var els = d.querySelectorAll('[data-ga-view="custom_service"]');
    if (!els.length) return;
    var io = new w.IntersectionObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].isIntersecting) { io.disconnect(); send('custom_service_view', {}); return; }
      }
    }, { threshold: 0.3 });
    for (var i = 0; i < els.length; i++) io.observe(els[i]);
  }
  try {
    var m = STUDIO.exec(w.location.pathname);
    if (m && m[1] !== 'custom') send('studio_view', { studio: m[1] });
    var f = FREE_TOOL.exec(w.location.pathname);
    if (f) watchUse(f[1]);
    d.addEventListener('click', onClick, true);
    d.addEventListener('auxclick', onClick, true);
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', watchView); else watchView();
  } catch (e) { /* 計測できなくてもページはそのまま */ }
})(window, document);
