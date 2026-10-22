/* EQUA司令塔（公開用）。data/hq.json（公開済みの記録から作ったデータ）を読んで描く。
   CSP（script-src 'self' / style-src 'self'）に合わせ、style属性は使わず CSSOM（el.style）とクラスで描く。 */
(function () {
  'use strict';
  var EMBED = /[?&]embed=1\b/.test(location.search);
  var DASH = '—';
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  /* 英語版（en/hq.html, <html lang="en">）：中身は日本語版と同じ。画面の言葉だけ英語にする */
  var EN = /^en/i.test(document.documentElement.lang || '');
  var fmt = function (n) { return Number(n).toLocaleString(EN ? 'en-US' : 'ja-JP'); };
  /* 英語版の売上はドルの目安（hq_en.json の sales.fx＝ECBの参考レート）。記録は円 */
  var FX = null;
  var money = function (n) {
    if (EN && FX) return '$' + (Number(n) / FX.jpy_per_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '\u00a5' + fmt(n);
  };
  /* 種類の名前（データのキー）。英語版のデータは英語のキーで入っている */
  var K = EN
    ? { blog: 'Blog', tool: 'Free tools', note: 'note', qiita: 'Qiita', hatena: 'Hatena', site: 'EQUA site', product: 'Products' }
    : { blog: 'ブログ', tool: '無料ツール', note: 'note', qiita: 'Qiita', hatena: 'はてな', site: 'EQUAサイト', product: '商品' };
  /* 画面の言葉 */
  var L = EN ? {
    loadErr: 'Could not load the data', pcs: '', today: 'Today', todayN: 'Today ', total: 'Total', week: 'Published in the last 7 days',
    none: 'not yet', sched: 'Scheduled ', schedS: 'scheduled',
    stepSub: ['Japanese & English', 'Runs in the browser', 'Articles', 'Tech articles', 'Summaries', 'X · Threads · Instagram', 'Sales board'],
    sns: 'SNS',
    kSales: 'Total sales', kSalesSub: function (c) { return c + ' categories · totals'; },
    kToday: 'Published today', kAll: 'Published in total', kArt: function (a, t) { return 'Art ' + a + ' · Tools ' + t; },
    kQueue: 'Scheduled posts', kTools: 'Business tools', kCh: 'Channels', kChUnit: '', kChSub: 'Site · articles · SNS',
    salesAsOf: function (d) { return 'Sales as of ' + d; },
    noToday: 'Nothing published yet today', recent: function (n) { return 'Latest ' + n; },
    c_claude: 'Command', c_misa: 'Approves', c_kiji: 'Articles', c_sns: 'SNS', c_tool: 'Tools', c_gazo: 'Images', c_gazoSub: 'Carousels · GIFs',
    c_ken: 'Construction tools', c_kuru: 'Auto shop tools', c_board: 'Sales board', c_prodSub: function (n) { return 'Business tools ' + n; },
    n: function (v) { return String(v); }
  } : {
    loadErr: 'データを読み込めませんでした', pcs: '本', today: '今日', todayN: '今日 ', total: '累計', week: '直近7日の公開数',
    none: '未', sched: '予約 ', schedS: '予約',
    stepSub: ['日本語・英語', 'ブラウザで使える', '読みもの', '技術記事', '要約記事', 'X・Threads・Instagram', '売上ボード'],
    sns: 'SNS',
    kSales: '売上の累計', kSalesSub: function (c) { return '区分 ' + c + ' · 合計のみ'; },
    kToday: '今日の公開', kAll: '公開の累計', kArt: function (a, t) { return '記事 ' + a + '・ツール ' + t; },
    kQueue: '予約済みの投稿', kTools: '作った業務ツール', kCh: '発信の場所', kChUnit: 'か所', kChSub: 'サイト・記事・SNS',
    salesAsOf: function (d) { return '売上 ' + d + ' 時点'; },
    noToday: '今日の公開はまだありません', recent: function (n) { return '直近 ' + n + '件'; },
    c_claude: '司令', c_misa: '承認', c_kiji: '記事係', c_sns: 'SNS係', c_tool: 'ツール係', c_gazo: '画像係', c_gazoSub: 'カルーセル・GIF',
    c_ken: '建設ツール係', c_kuru: '車屋ツール係', c_board: '売上ボード', c_prodSub: function (n) { return '業務ツール ' + n + '本'; },
    n: function (v) { return v + '本'; }
  };
  function h(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function s(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var COL = { 'X': 'vi', 'Threads': 'vi', 'Instagram': 'pk' };
  COL[K.blog] = 'gr'; COL[K.tool] = 'cy'; COL[K.note] = 'gr'; COL[K.qiita] = 'gr'; COL[K.hatena] = 'gr'; COL[K.site] = 'pk'; COL[K.product] = 'am';
  var cv = function (k) { return 'var(--' + (COL[k] || 'tx2') + ')'; };

  /* ---- 画面に合わせて 1600×900 を縮める ---- */
  if (EMBED) document.body.classList.add('embed');
  var stage = $('stage');
  function fit() {
    var w = window.innerWidth, ht = window.innerHeight;
    var narrow = !EMBED && w < 760 && ht > w;
    document.body.classList.toggle('narrow', narrow);
    if (narrow) { stage.style.transform = ''; return; }
    var sc = Math.min(w / 1600, ht / 900);
    var x = Math.max(0, (w - 1600 * sc) / 2), y = Math.max(0, (ht - 900 * sc) / 2);
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + sc + ')';
  }
  fit();
  window.addEventListener('resize', fit);

  /* ---- 軽くする：見えていないときは止める ---- */
  var STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var offscreen = false;
  function setPaused() { document.body.classList.toggle('paused', document.hidden || offscreen); }
  var paused = function () { return STILL || document.hidden || offscreen; };
  document.addEventListener('visibilitychange', setPaused);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; setPaused(); }).observe(stage);
  }

  /* ---- 時計（日本時間） ---- */
  var WD = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '月', '火', '水', '木', '金', '土'];
  function tick() {
    var j = new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60000);
    var p = function (n) { return String(n).padStart(2, '0'); };
    $('clk').textContent = p(j.getHours()) + ':' + p(j.getMinutes()) + ':' + p(j.getSeconds());
    $('dte').textContent = j.getFullYear() + '.' + p(j.getMonth() + 1) + '.' + p(j.getDate()) + ' (' + WD[j.getDay()] + ') JST';
  }
  tick(); setInterval(tick, 1000);

  fetch(document.body.getAttribute('data-src') || 'data/hq.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(draw).catch(function () {
    $('log').textContent = L.loadErr;
  });

  function draw(D) {
    var P = D.published || {}, Q = D.queue || {}, S = D.sales || {}, G = D.products || {};
    FX = S.fx && S.fx.jpy_per_usd > 0 ? S.fx : null;
    var kt = P.kinds_today || {}, ka = P.kinds_all || {};
    var qc = Q.by_channel || {};
    var md = function (iso) { var a = iso.split('-'); return (+a[1]) + '/' + (+a[2]); };
    var log = D.log || [];
    var items = P.today_items || [];
    var artToday = (kt[K.blog] || 0) + (kt[K.note] || 0) + (kt[K.qiita] || 0) + (kt[K.hatena] || 0);
    var artAll = (ka[K.blog] || 0) + (ka[K.note] || 0) + (ka[K.qiita] || 0) + (ka[K.hatena] || 0);

    /* ---- 左：今日の公開 ---- */
    var steps = [
      [K.blog, L.stepSub[0], kt[K.blog] || 0, '本'],
      [K.tool, L.stepSub[1], kt[K.tool] || 0, '本'],
      [K.note, L.stepSub[2], kt[K.note] || 0, '本'],
      [K.qiita, L.stepSub[3], kt[K.qiita] || 0, '本'],
      [K.hatena, L.stepSub[4], kt[K.hatena] || 0, '本'],
      [L.sns, L.stepSub[5], Q.total || 0, '予約'],
      [K.site, L.stepSub[6], S.as_of ? 1 : 0, '更新']
    ];
    var last = items.length ? items[items.length - 1].kind : null;
    var ol = $('steps');
    steps.forEach(function (st, i) {
      var li = h('li', (st[2] > 0 ? 'done' : '') + (st[0] === last ? ' cur' : ''), null, ol);
      h('span', 'no', st[2] > 0 ? '✓' : String(i + 1), li);
      var d = h('div', null, null, li);
      h('div', 'nm', st[0], d); h('div', 'sub', st[1], d);
      var c = st[3] === '本' ? (st[2] ? L.n(st[2]) : L.none) : st[3] === '予約' ? L.sched + st[2] : (S.as_of ? md(S.as_of) : DASH);
      h('span', 'cnt', c, li);
    });
    $('flowN').textContent = L.n(P.today || 0) + ' · ' + md(D.today);
    var ff = $('flowfoot');
    ff.appendChild(document.createTextNode(L.todayN));
    h('b', null, L.n(P.today || 0), ff);
    ff.appendChild(document.createTextNode(EN ? ' / ' + L.total + ' ' : ' ／ 累計 '));
    h('b', null, L.n(P.total || 0), ff);
    h('div', null, L.week, ff);
    var wk = P.week || [];
    var wm = Math.max.apply(null, [1].concat(wk.map(function (w) { return w.n; })));
    var sv = s('svg', { viewBox: '0 0 216 74' }, ff);
    wk.forEach(function (w, i) {
      var bh = Math.max(w.n ? 2 : 1, w.n / wm * 42), x = i * 31 + 3;
      s('rect', { x: x, y: 58 - bh, width: 24, height: bh, rx: 1.5, fill: w.n ? 'var(--cy)' : '#1b2740', 'fill-opacity': w.n ? (.35 + .65 * w.n / wm).toFixed(2) : 1 }, sv);
      var tn = s('text', { x: x + 12, y: 58 - bh - 3, 'text-anchor': 'middle', 'font-size': 8, fill: 'var(--tx2)', 'font-family': 'var(--mono)' }, sv);
      tn.textContent = w.n || '';
      var tl = s('text', { x: x + 12, y: 70, 'text-anchor': 'middle', 'font-size': 8, fill: 'var(--tx3)', 'font-family': 'var(--mono)' }, sv);
      tl.textContent = md(w.d);
    });

    /* ---- KPI ---- */
    var kp = $('kpis');
    function tile(k, v, unit, sub, main) {
      var t = h('div', 'kpi' + (main ? ' main' : ''), null, kp);
      h('div', 'k', k, t);
      var vv = h('div', 'v', v, t);
      if (unit) h('small', null, unit, vv);
      h('div', 's', sub, t);
    }
    var cats = (S.categories || []).filter(function (c) { return c.v > 0; }).length;
    var sep = EN ? '/' : '・';
    tile(L.kSales, S.total != null ? money(S.total) : DASH, '', L.kSalesSub(cats), true);
    tile(L.kToday, String(P.today || 0), L.pcs, L.kArt(artToday, kt[K.tool] || 0));
    tile(L.kAll, String(P.total || 0), L.pcs, L.kArt(artAll, ka[K.tool] || 0));
    tile(L.kQueue, String(Q.total || 0), L.pcs, 'Threads ' + (qc.Threads || 0) + sep + 'X ' + (qc.X || 0) + sep + 'IG ' + (qc.Instagram || 0));
    tile(L.kTools, String(G.total || 0), L.pcs, (G.by_industry || []).map(function (g) { return g.g + ' ' + g.n; }).join(sep));
    tile(L.kCh, String((D.channels || []).length), L.kChUnit, L.kChSub);
    $('kpiNote').textContent = (S.as_of ? L.salesAsOf(md(S.as_of)) : '') + (EN && FX ? ' · US$ at ECB rate \u00a5' + FX.jpy_per_usd + '/$ (' + FX.date + ')' : '');

    /* ---- 売上の区分 ---- */
    var cb = $('cbars');
    var cm = Math.max.apply(null, [1].concat((S.categories || []).map(function (c) { return c.v; })));
    (S.categories || []).forEach(function (c) {
      var r = h('div', 'crow', null, cb);
      h('span', null, c.name, r);
      var bar = h('span', 'cbar', null, r);
      var fill = h('i', null, null, bar);
      fill.style.width = (c.v / cm * 100).toFixed(1) + '%';
      h('span', 'n', money(c.v), r);
    });

    /* ---- 予約（日付別） ---- */
    var qb = $('qbars');
    var rows = Q.by_day || [];
    var qm = Math.max.apply(null, [1].concat(rows.map(function (r) { return r.Threads + r.X + r.Instagram; })));
    rows.slice(0, 11).forEach(function (r) {
      var t = r.Threads + r.X + r.Instagram;
      var row = h('div', 'qrow', null, qb);
      h('span', null, md(r.d), row);
      var bar = h('span', 'qbar', null, row);
      [['Threads', 'c-vi'], ['X', 'c-cy'], ['Instagram', 'c-pk']].forEach(function (p) {
        var i = h('i', p[1], null, bar); i.style.width = (r[p[0]] / qm * 100).toFixed(1) + '%';
      });
      h('span', 'n', String(t), row);
    });
    if (!rows.length) h('div', 'dash', DASH, qb);
    var qn = $('qNote');
    [['■', 't-vi'], ['Threads ', null], ['■', 't-cy'], ['X ', null], ['■', 't-pk'], ['IG', null]].forEach(function (p) { h('span', p[1] || 'qkey', p[0], qn); });

    /* ---- 今日公開したもの ---- */
    $('pubN').textContent = md(D.today) + ' · ' + L.n(items.length);
    var chips = $('chips');
    Object.keys(kt).filter(function (k) { return kt[k] > 0; }).sort(function (a, b) { return kt[b] - kt[a]; }).forEach(function (k) {
      var c = h('span', 'chip', k, chips); c.style.borderColor = cv(k);
      h('b', null, String(kt[k]), c);
    });
    var inner = $('pinner');
    function fillList() {
      items.forEach(function (p, i) {
        var r = h('div', 'prow', null, inner);
        h('span', 'i', String(i + 1).padStart(2, '0'), r);
        var kd = h('span', 'kd', p.kind + (p.en ? ' EN' : ''), r); kd.style.color = cv(p.kind);
        h('span', 'tt', p.title, r);
      });
    }
    if (items.length) {
      fillList();
      requestAnimationFrame(function () {
        if (inner.scrollHeight > $('plist').clientHeight + 4) {
          fillList();
          inner.classList.add('scroll');
          inner.style.animationDuration = (items.length * 2.2) + 's';
        }
      });
    } else h('div', 'dash', L.noToday, inner);

    /* ---- 公開ログ（流れる） ---- */
    var box = $('log');
    $('logN').textContent = L.recent(log.length);
    if (log.length) {
      var idx = Math.max(0, log.length - 18);
      var add = function (anim) {
        var e = log[idx % log.length]; idx++;
        Array.prototype.forEach.call(box.querySelectorAll('.cursor'), function (c) { c.remove(); });
        Array.prototype.forEach.call(box.querySelectorAll('.ll'), function (l) { l.classList.add('old'); });
        var d = h('div', 'll' + (anim ? '' : ' still'), null, box);
        h('span', 'tm', e.t ? e.t : e.d, d);
        var tg = h('span', 'tg', e.kind, d); tg.style.color = cv(e.kind);
        var tx = h('span', 'tx', e.s, d);
        h('span', 'cursor', null, tx);
        while (box.children.length > 30) box.removeChild(box.firstChild);
      };
      for (var k = 0; k < 9; k++) add(false);
      if (!STILL) setInterval(function () { if (!paused()) add(true); }, 1800);
    }

    /* ---- footer ---- */
    $('fbuilt').textContent = 'build ' + (D.built || DASH);

    graph(D, kt, qc, G);
  }

  /* ---- AI組織図 ---- */
  function graph(D, kt, qc, G) {
    var svg = $('g');
    var CX = 480, CY = 262;
    var ind = function (name) { var f = (G.by_industry || []).filter(function (g) { return g.g.indexOf(name) === 0; })[0]; return f ? f.n : 0; };
    var arts = (kt[K.blog] || 0) + (kt[K.note] || 0) + (kt[K.qiita] || 0) + (kt[K.hatena] || 0);
    var qT = (qc.Threads || 0) + (qc.X || 0) + (qc.Instagram || 0);
    var nodes = {
      claude: { x: CX, y: CY, r: 26, label: 'Claude', sub: L.c_claude, col: 'var(--cy)', big: true },
      misa: { x: CX, y: 44, r: 15, label: 'MisaNeco', sub: L.c_misa, col: 'var(--am)' },
      kiji: { x: 318, y: 186, r: 11, label: L.c_kiji, sub: L.todayN + L.n(arts), col: 'var(--gr)' },
      sns: { x: 642, y: 186, r: 11, label: L.c_sns, sub: L.sched + L.n(qT), col: 'var(--vi)' },
      tool: { x: 300, y: 306, r: 11, label: L.c_tool, sub: L.todayN + L.n(kt[K.tool] || 0), col: 'var(--cy)' },
      gazo: { x: 660, y: 306, r: 11, label: L.c_gazo, sub: L.c_gazoSub, col: 'var(--pk)' },
      ken: { x: 408, y: 380, r: 11, label: L.c_ken, sub: L.n(ind(EN ? 'Construction' : '建設')), col: 'var(--am)' },
      kuru: { x: 552, y: 380, r: 11, label: L.c_kuru, sub: L.n(ind(EN ? 'Auto' : '車屋')), col: 'var(--am)' }
    };
    var today = function (k) { return L.todayN + (kt[k] || 0); };
    var CH = [
      ['ch_x', 'X', L.sched + (qc.X || 0), 'var(--vi)', ['sns', 'gazo'], 0],
      ['ch_th', 'Threads', L.sched + (qc.Threads || 0), 'var(--vi)', ['sns'], 0],
      ['ch_ig', 'Instagram', L.sched + (qc.Instagram || 0), 'var(--pk)', ['sns', 'gazo'], 0],
      ['ch_pr', K.product, L.c_prodSub(G.total || 0), 'var(--am)', ['ken', 'kuru'], 0],
      ['ch_eq', K.site, L.c_board, 'var(--pk)', ['claude', 'tool'], 0],
      ['ch_tl', K.tool, today(K.tool), 'var(--cy)', ['tool'], kt[K.tool] || 0],
      ['ch_bl', K.blog, today(K.blog), 'var(--gr)', ['kiji'], kt[K.blog] || 0],
      ['ch_ha', K.hatena, today(K.hatena), 'var(--gr)', ['kiji'], kt[K.hatena] || 0],
      ['ch_qi', K.qiita, today(K.qiita), 'var(--gr)', ['kiji'], kt[K.qiita] || 0],
      ['ch_no', K.note, today(K.note), 'var(--gr)', ['kiji'], kt[K.note] || 0]
    ];
    var a0 = -52, a1 = 232, RX = 392, RY = 214;
    CH.forEach(function (c, i) {
      var a = (a0 + (a1 - a0) * i / (CH.length - 1)) * Math.PI / 180;
      nodes[c[0]] = { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) + 6, r: 8, label: c[1], sub: c[2], col: c[3], ch: true, links: c[4], items: c[5], ang: a };
    });

    s('ellipse', { cx: CX, cy: CY + 6, rx: RX, ry: RY, fill: 'none', stroke: '#16223a', 'stroke-dasharray': '2 6' }, svg);
    s('ellipse', { cx: CX, cy: CY, rx: 205, ry: 125, fill: 'none', stroke: '#14203a', 'stroke-dasharray': '2 5' }, svg);

    var edges = [];
    var gE = s('g', {}, svg);
    function addEdge(a, b, col, dash) {
      var A = nodes[a], B = nodes[b];
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y;
      var qx = mx - dy * 0.12, qy = my + dx * 0.12;
      s('path', { d: 'M' + A.x + ',' + A.y + ' Q' + qx + ',' + qy + ' ' + B.x + ',' + B.y, fill: 'none', stroke: col, 'stroke-opacity': .32, 'stroke-width': 1, 'stroke-dasharray': dash || '' }, gE);
      edges.push({ A: A, B: B, qx: qx, qy: qy, col: col });
    }
    addEdge('misa', 'claude', 'var(--am)', '4 4');
    ['kiji', 'sns', 'tool', 'gazo', 'ken', 'kuru'].forEach(function (k) { addEdge('claude', k, 'var(--cy)'); });
    CH.forEach(function (c) { c[4].forEach(function (src) { addEdge(src, c[0], c[3]); }); });

    // 今日の公開物（小さな点）
    var gS = s('g', {}, svg);
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      if (!n.ch || !(n.items > 0)) return;
      var m = Math.min(n.items, 8);
      for (var j = 0; j < m; j++) {
        var t = n.ang + Math.PI + (j - (m - 1) / 2) * 0.2;
        var rr = 24 + (j % 2) * 7;
        var x = n.x + rr * Math.cos(t), y = n.y + rr * Math.sin(t) * 0.8;
        s('line', { x1: n.x, y1: n.y, x2: x, y2: y, stroke: n.col, 'stroke-opacity': .25, 'stroke-width': .8 }, gS);
        s('circle', { cx: x, cy: y, r: 2.2, fill: n.col, 'fill-opacity': .85 }, gS);
      }
    });

    // 流れる点
    var gP = s('g', {}, svg);
    var parts = edges.map(function (e) { return { e: e, t: Math.random(), sp: 0.0011 + Math.random() * 0.0012, c: s('circle', { r: 1.9, fill: e.col }, gP) }; });
    function qpt(e, t) { var u = 1 - t; return [u * u * e.A.x + 2 * u * t * e.qx + t * t * e.B.x, u * u * e.A.y + 2 * u * t * e.qy + t * t * e.B.y]; }
    var lastT = 0;
    function step(now) {
      // 約30コマ/秒。タブが隠れている・画面外のときは更新しない
      if (paused() || now - lastT < 33) { if (!STILL) requestAnimationFrame(step); return; }
      lastT = now;
      parts.forEach(function (p) {
        p.t += p.sp; if (p.t > 1) p.t = 0;
        var xy = qpt(p.e, p.t);
        p.c.setAttribute('cx', xy[0].toFixed(1)); p.c.setAttribute('cy', xy[1].toFixed(1));
        p.c.setAttribute('fill-opacity', Math.sin(p.t * Math.PI).toFixed(2));
      });
      if (!STILL) requestAnimationFrame(step);
    }
    if (STILL) { lastT = -1e9; STILL = false; step(0); STILL = true; } else requestAnimationFrame(step);

    // ノード
    var gN = s('g', {}, svg);
    Object.keys(nodes).forEach(function (k, i) {
      var n = nodes[k];
      // 光の輪：動かすのは司令と承認の2つだけ（ほかは止めた輪）
      var moving = n.big || k === 'misa';
      var hl = s('circle', { cx: n.x, cy: n.y, r: n.r * 2.1, fill: n.col, 'class': moving ? 'halo' : 'halo-still', 'fill-opacity': n.big ? .35 : .16 }, gN);
      if (moving) hl.style.animationDelay = ((i * 0.53) % 4.5) + 's';
      s('circle', { cx: n.x, cy: n.y, r: n.r, fill: '#0a1222', stroke: n.col, 'stroke-width': n.big ? 2 : 1.5 }, gN);
      s('circle', { cx: n.x, cy: n.y, r: n.r * 0.45, fill: n.col, 'fill-opacity': .9 }, gN);
      if (n.big) {
        var ring = s('circle', { cx: n.x, cy: n.y, r: n.r + 9, fill: 'none', stroke: n.col, 'stroke-opacity': .5, 'stroke-dasharray': '3 5' }, gN);
        s('animateTransform', { attributeName: 'transform', type: 'rotate', from: '0 ' + n.x + ' ' + n.y, to: '360 ' + n.x + ' ' + n.y, dur: '24s', repeatCount: 'indefinite' }, ring);
      }
      var lx = n.x, ly = n.y + n.r + 15, anchor = 'middle';
      if (n.ch) {
        var c = Math.cos(n.ang), sn = Math.sin(n.ang);
        if (Math.abs(c) > 0.55) { anchor = c > 0 ? 'start' : 'end'; lx = n.x + (c > 0 ? 14 : -14); ly = n.y - 1; }
        else if (sn < 0) { ly = n.y - n.r - 20; }
        else { ly = n.y + n.r + 16; }
      }
      if (k === 'misa') { lx = n.x + 24; ly = n.y - 2; anchor = 'start'; }
      if (n.big) ly = n.y + n.r + 24;
      var t = s('text', { x: lx, y: ly, 'text-anchor': anchor, 'class': 'nlabel' }, gN);
      t.textContent = n.label;
      if (n.big) t.setAttribute('font-size', '15');
      var t2 = s('text', { x: lx, y: ly + 13, 'text-anchor': anchor, 'class': 'nsub' + (/(今日|予約|Today|Scheduled) [1-9]/.test(n.sub) ? ' hot' : '') }, gN);
      t2.textContent = n.sub;
    });
  }
})();
