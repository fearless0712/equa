/* EQUA司令塔（公開用）。data/hq.json（公開済みの記録から作ったデータ）を読んで描く。
   CSP（script-src 'self' / style-src 'self'）に合わせ、style属性は使わず CSSOM（el.style）とクラスで描く。 */
(function () {
  'use strict';
  var EMBED = /[?&]embed=1\b/.test(location.search);
  var DASH = '—';
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Number(n).toLocaleString('ja-JP'); };
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
  var COL = { 'ブログ': 'gr', '無料ツール': 'cy', 'note': 'gr', 'Qiita': 'gr', 'はてな': 'gr', 'X': 'vi', 'Threads': 'vi', 'Instagram': 'pk', 'EQUAサイト': 'pk', '商品': 'am' };
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
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function tick() {
    var j = new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60000);
    var p = function (n) { return String(n).padStart(2, '0'); };
    $('clk').textContent = p(j.getHours()) + ':' + p(j.getMinutes()) + ':' + p(j.getSeconds());
    $('dte').textContent = j.getFullYear() + '.' + p(j.getMonth() + 1) + '.' + p(j.getDate()) + ' (' + WD[j.getDay()] + ') JST';
  }
  tick(); setInterval(tick, 1000);

  fetch('data/hq.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(draw).catch(function () {
    $('log').textContent = 'データを読み込めませんでした';
  });

  function draw(D) {
    var P = D.published || {}, Q = D.queue || {}, S = D.sales || {}, G = D.products || {};
    var kt = P.kinds_today || {}, ka = P.kinds_all || {};
    var qc = Q.by_channel || {};
    var md = function (iso) { var a = iso.split('-'); return (+a[1]) + '/' + (+a[2]); };
    var log = D.log || [];
    var items = P.today_items || [];
    var artToday = (kt['ブログ'] || 0) + (kt['note'] || 0) + (kt['Qiita'] || 0) + (kt['はてな'] || 0);
    var artAll = (ka['ブログ'] || 0) + (ka['note'] || 0) + (ka['Qiita'] || 0) + (ka['はてな'] || 0);

    /* ---- 左：今日の公開 ---- */
    var steps = [
      ['ブログ', '日本語・英語', kt['ブログ'] || 0, '本'],
      ['無料ツール', 'ブラウザで使える', kt['無料ツール'] || 0, '本'],
      ['note', '読みもの', kt['note'] || 0, '本'],
      ['Qiita', '技術記事', kt['Qiita'] || 0, '本'],
      ['はてな', '要約記事', kt['はてな'] || 0, '本'],
      ['SNS', 'X・Threads・Instagram', Q.total || 0, '予約'],
      ['EQUAサイト', '売上ボード', S.as_of ? 1 : 0, '更新']
    ];
    var last = items.length ? items[items.length - 1].kind : null;
    var ol = $('steps');
    steps.forEach(function (st, i) {
      var li = h('li', (st[2] > 0 ? 'done' : '') + (st[0] === last ? ' cur' : ''), null, ol);
      h('span', 'no', st[2] > 0 ? '✓' : String(i + 1), li);
      var d = h('div', null, null, li);
      h('div', 'nm', st[0], d); h('div', 'sub', st[1], d);
      var c = st[3] === '本' ? (st[2] ? st[2] + '本' : '未') : st[3] === '予約' ? '予約 ' + st[2] : (S.as_of ? md(S.as_of) : DASH);
      h('span', 'cnt', c, li);
    });
    $('flowN').textContent = (P.today || 0) + '本 · ' + md(D.today);
    var ff = $('flowfoot');
    ff.appendChild(document.createTextNode('今日 '));
    h('b', null, (P.today || 0) + '本', ff);
    ff.appendChild(document.createTextNode(' ／ 累計 '));
    h('b', null, (P.total || 0) + '本', ff);
    h('div', null, '直近7日の公開数', ff);
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
    tile('売上の累計', S.total != null ? '¥' + fmt(S.total) : DASH, '', '区分 ' + cats + ' · 合計のみ', true);
    tile('今日の公開', String(P.today || 0), '本', '記事 ' + artToday + '・ツール ' + (kt['無料ツール'] || 0));
    tile('公開の累計', String(P.total || 0), '本', '記事 ' + artAll + '・ツール ' + (ka['無料ツール'] || 0));
    tile('予約済みの投稿', String(Q.total || 0), '本', 'Threads ' + (qc.Threads || 0) + '・X ' + (qc.X || 0) + '・IG ' + (qc.Instagram || 0));
    tile('作った業務ツール', String(G.total || 0), '本', (G.by_industry || []).map(function (g) { return g.g + ' ' + g.n; }).join('・'));
    tile('発信の場所', String((D.channels || []).length), 'か所', 'サイト・記事・SNS');
    $('kpiNote').textContent = S.as_of ? '売上 ' + md(S.as_of) + ' 時点' : '';

    /* ---- 売上の区分 ---- */
    var cb = $('cbars');
    var cm = Math.max.apply(null, [1].concat((S.categories || []).map(function (c) { return c.v; })));
    (S.categories || []).forEach(function (c) {
      var r = h('div', 'crow', null, cb);
      h('span', null, c.name, r);
      var bar = h('span', 'cbar', null, r);
      var fill = h('i', null, null, bar);
      fill.style.width = (c.v / cm * 100).toFixed(1) + '%';
      h('span', 'n', '¥' + fmt(c.v), r);
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
    $('pubN').textContent = md(D.today) + ' · ' + items.length + '本';
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
    } else h('div', 'dash', '今日の公開はまだありません', inner);

    /* ---- 公開ログ（流れる） ---- */
    var box = $('log');
    $('logN').textContent = '直近 ' + log.length + '件';
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
    var arts = (kt['ブログ'] || 0) + (kt['note'] || 0) + (kt['Qiita'] || 0) + (kt['はてな'] || 0);
    var qT = (qc.Threads || 0) + (qc.X || 0) + (qc.Instagram || 0);
    var nodes = {
      claude: { x: CX, y: CY, r: 26, label: 'Claude', sub: '司令', col: 'var(--cy)', big: true },
      misa: { x: CX, y: 44, r: 15, label: 'MisaNeco', sub: '承認', col: 'var(--am)' },
      kiji: { x: 318, y: 186, r: 11, label: '記事係', sub: '今日 ' + arts + '本', col: 'var(--gr)' },
      sns: { x: 642, y: 186, r: 11, label: 'SNS係', sub: '予約 ' + qT + '本', col: 'var(--vi)' },
      tool: { x: 300, y: 306, r: 11, label: 'ツール係', sub: '今日 ' + (kt['無料ツール'] || 0) + '本', col: 'var(--cy)' },
      gazo: { x: 660, y: 306, r: 11, label: '画像係', sub: 'カルーセル・GIF', col: 'var(--pk)' },
      ken: { x: 408, y: 380, r: 11, label: '建設ツール係', sub: ind('建設') + '本', col: 'var(--am)' },
      kuru: { x: 552, y: 380, r: 11, label: '車屋ツール係', sub: ind('車屋') + '本', col: 'var(--am)' }
    };
    var today = function (k) { return '今日 ' + (kt[k] || 0); };
    var CH = [
      ['ch_x', 'X', '予約 ' + (qc.X || 0), 'var(--vi)', ['sns', 'gazo'], 0],
      ['ch_th', 'Threads', '予約 ' + (qc.Threads || 0), 'var(--vi)', ['sns'], 0],
      ['ch_ig', 'Instagram', '予約 ' + (qc.Instagram || 0), 'var(--pk)', ['sns', 'gazo'], 0],
      ['ch_pr', '商品', '業務ツール ' + (G.total || 0) + '本', 'var(--am)', ['ken', 'kuru'], 0],
      ['ch_eq', 'EQUAサイト', '売上ボード', 'var(--pk)', ['claude', 'tool'], 0],
      ['ch_tl', '無料ツール', today('無料ツール'), 'var(--cy)', ['tool'], kt['無料ツール'] || 0],
      ['ch_bl', 'ブログ', today('ブログ'), 'var(--gr)', ['kiji'], kt['ブログ'] || 0],
      ['ch_ha', 'はてな', today('はてな'), 'var(--gr)', ['kiji'], kt['はてな'] || 0],
      ['ch_qi', 'Qiita', today('Qiita'), 'var(--gr)', ['kiji'], kt['Qiita'] || 0],
      ['ch_no', 'note', today('note'), 'var(--gr)', ['kiji'], kt['note'] || 0]
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
      var t2 = s('text', { x: lx, y: ly + 13, 'text-anchor': anchor, 'class': 'nsub' + (/今日 [1-9]|予約 [1-9]/.test(n.sub) ? ' hot' : '') }, gN);
      t2.textContent = n.sub;
    });
  }
})();
