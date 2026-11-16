/* EQUA司令塔 v2（公開用）。data/hq.json（公開済みの記録と hq/schedule.json から作ったデータ）を読んで描く。
   - 時計の針が予定の時刻に来ると：その部署が光る → 部署から中央の EQUA へデータの粒 → 作業ログに1行。
   - 「今日の予定をなぞる」走査線が24秒で1日を回り、同じつながりを繰り返し見せる（予定と記録の状態はすべて実データ）。
   - 重くしない：描画は30コマ/秒まで、見えていないとき・タブが裏のときは止める、prefers-reduced-motion では動かさない。
   - CSP（script-src 'self'）に合わせ、style属性は使わず CSSOM（el.style）とクラスで描く。 */
(function () {
  'use strict';
  var EMBED = /[?&]embed=1\b/.test(location.search);
  var EN = /^en/i.test(document.documentElement.lang || '');
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var L = EN ? {
    loadErr: 'Could not load the data', updated: 'Data updated', asOf: 'as of ',
    next: 'NEXT', inT: function (m) { return m < 60 ? 'in ' + m + ' min' : 'in ' + Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; },
    st: { done: 'Done', queued: 'Scheduled', late: 'Late', past: 'Passed', up: 'Upcoming', next: 'Next' },
    stLong: {
      done: 'Confirmed in the records.', queued: 'Queued for automatic publishing at this time.',
      late: 'No record yet although the time has passed (as of the data update).',
      past: 'The time has passed. This job leaves no public record, so the status is shown by time only.',
      up: 'Later today.'
    },
    all: 'All', nowL: 'now', active: 'Active', idle: 'Standby', today: 'today', total: 'total', queuedN: 'scheduled',
    jobs: ' jobs', passedOf: function (a, b) { return a + ' / ' + b; },
    nextJob: 'Next', none: '—', todayRec: 'Today', slotsPassed: 'Jobs passed',
    deptToday: 'Today’s scheduled jobs', deptRecent: 'Recently published', deptLog: 'Recent activity', deptStats: 'Numbers',
    noRecent: 'Nothing to show yet.', noStats: 'This department does not publish counts. Only the schedule is shown.',
    times: 'Times today', days: 'Days', every: 'Every day', dayN: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    statusL: 'Status', deptL: 'Department', staleNote: function (d) { return 'Records are from ' + d + '. Today’s statuses are shown by time.'; },
    liveLog: function (t, d, j) { return t + ' ' + d + ' — ' + j + ' (scheduled time)'; },
    posted: function (k) { return k + ' post'; },
    kpi: {
      ig_followers: ['Instagram followers', '', 'Followers of our Instagram account, from our daily stats record.'],
      tt_followers: ['TikTok followers', '', 'Followers of our TikTok account, from our daily stats record.'],
      week_published: ['Published in last 7 days', '', 'Reels, Shorts, long videos, note articles, blog posts and free tools published in the last 7 days.'],
      tools_total: ['Free tools & demos', '', 'Free browser tools and demo pages published on our tool site (running total).'],
      jobs_today: ['Today’s scheduled jobs', '', 'Daily jobs whose time has passed, out of all jobs today. “Confirmed” counts the ones we can see in the public records.'],
      queued: ['Scheduled to publish', '', 'Reels, Shorts and long videos already queued to go live automatically.']
    },
    br: { reels: 'Reels', shorts: 'Shorts', long: 'Long', note: 'note', blog: 'Blog', tools: 'Tools' },
    vsPrev: function (d) { return 'vs ' + d; }, confirmed: 'confirmed', hist: 'History', source: 'Source',
    srcNums: 'Our daily social-media stats record.', srcPub: 'Our list of published pages and the posting queues.',
    stat: { threads: 'Threads posts', ig: 'Reels published', x: 'X explainers', tiktok: 'TikTok videos', yt: 'Shorts',
      reels: 'Reels made', long: 'Long videos', note: 'note articles', tools: 'Free tools', studio_tools: 'Industry business tools',
      blog: 'Blog posts', qiita: 'Qiita articles', hatena: 'Hatena posts' },
    open: 'Open', scan: 'Tracing', legendNow: 'now', titleOf: function (n) { return n; }
  } : {
    loadErr: 'データを読み込めませんでした', updated: 'データ更新', asOf: '',
    next: 'NEXT · 次の予定', inT: function (m) { return m < 60 ? 'あと' + m + '分' : 'あと' + Math.floor(m / 60) + '時間' + (m % 60) + '分'; },
    st: { done: '済み', queued: '予約済み', late: '遅れ', past: '経過', up: 'これから', next: '次' },
    stLong: {
      done: '記録で確認できました。', queued: 'この時刻に自動で公開される予約が入っています。',
      late: '時刻を過ぎていますが、データ更新の時点で記録がありません。',
      past: '時刻を過ぎました。公開の記録が残らない作業なので、時刻だけで表示しています。',
      up: '今日このあと動きます。'
    },
    all: 'すべて', nowL: '現在', active: '稼働中', idle: '待機', today: '今日', total: '累計', queuedN: '予約',
    jobs: '件', passedOf: function (a, b) { return a + ' / ' + b; },
    nextJob: '次', none: '—', todayRec: '今日', slotsPassed: '経過した定時作業',
    deptToday: '今日の定期作業', deptRecent: '最近の公開物', deptLog: '最近の記録', deptStats: '数字',
    noRecent: 'まだ表示できるものがありません。', noStats: 'この部署は件数を公開していません。予定だけを表示しています。',
    times: '今日の時刻', days: '曜日', every: '毎日', dayN: ['日', '月', '火', '水', '木', '金', '土'],
    statusL: '状態', deptL: '担当', staleNote: function (d) { return '記録は ' + d + ' 時点です。今日の状態は時刻で表示しています。'; },
    liveLog: function (t, d, j) { return t + ' ' + d + '「' + j + '」の時刻'; },
    posted: function (k) { return k + ' 投稿'; },
    kpi: {
      ig_followers: ['Instagram フォロワー', '人', 'Instagram のフォロワー数。毎日の数字の記録から取っています。'],
      tt_followers: ['TikTok フォロワー', '人', 'TikTok のフォロワー数。毎日の数字の記録から取っています。'],
      week_published: ['直近7日の公開', '本', '直近7日に公開したリール・ショート・長い動画・note・ブログ・無料ツールの本数です。'],
      tools_total: ['無料ツール・見本', '本', 'ツールのサイトで公開している無料ツールと見本ページの数（累計）です。'],
      jobs_today: ['今日の定期作業', '件', '今日の定期作業のうち、時刻を過ぎた数／全体の数です。「記録で確認」は公開の記録で確かめられた数です。'],
      queued: ['予約済みの公開', '本', '自動で公開される予約が入っているリール・ショート・長い動画の本数です。']
    },
    br: { reels: 'リール', shorts: 'ショート', long: '長い動画', note: 'note', blog: 'ブログ', tools: 'ツール' },
    vsPrev: function (d) { return d + ' 比'; }, confirmed: '記録で確認', hist: '推移', source: 'もとの記録',
    srcNums: '毎日の SNS の数字の記録。', srcPub: '公開済みページの一覧と、投稿の予約の記録。',
    stat: { threads: 'Threads 投稿', ig: 'リール公開', x: 'X 解説', tiktok: 'TikTok', yt: 'ショート',
      reels: 'リール制作', long: '長い動画', note: 'note 記事', tools: '無料ツール', studio_tools: '業種別の業務ツール',
      blog: 'ブログ', qiita: 'Qiita', hatena: 'はてな' },
    open: '開く', scan: '走査', legendNow: '現在', titleOf: function (n) { return n; }
  };

  var COL = { sns: '#5cc8ff', studio: '#a78bfa', biz: '#f5b44f', dev: '#4ade80', pr: '#f0a5c8', admin: '#9fb7dc' };
  var ICON = {
    sns: 'M4 5h16v10H9l-5 4z M8 9h8 M8 12h5',
    studio: 'M3 6h18v12H3z M10 9.5v5l4.5-2.5z M3 9h2 M3 15h2 M19 9h2 M19 15h2',
    biz: 'M3 8h18v11H3z M8 8V5h8v3 M3 13h18',
    dev: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M13.5 5l-3 14',
    pr: 'M3 10v4h3l7 4V6l-7 4z M17 9a4 4 0 010 6 M19.5 6.5a7.5 7.5 0 010 11',
    admin: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'
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
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtN(v) { return Number(v).toLocaleString(EN ? 'en-US' : 'ja-JP'); }
  function md(iso) { var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]); }
  function todayIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function minOf(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function nowMin(d) { return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }

  /* ---- 画面に合わせて 1600×900 を縮める（スマホ縦は1列） ---- */
  if (EMBED) document.body.classList.add('embed');
  var stage = $('stage');
  var NARROW = false;
  function fit() {
    var w = window.innerWidth, ht = window.innerHeight;
    var narrow = !EMBED && w < 760 && ht > w;
    var changed = narrow !== NARROW;
    NARROW = narrow;
    document.body.classList.toggle('narrow', narrow);
    if (narrow) stage.style.transform = '';
    else {
      var sc = Math.min(w / 1600, ht / 900);
      var x = Math.max(0, (w - 1600 * sc) / 2), y = Math.max(0, (ht - 900 * sc) / 2);
      stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + sc + ')';
    }
    if (changed && D) { buildViz(); }
    sizeCanvas();
  }

  /* ---- 止める：タブが裏・画面外 ---- */
  var offscreen = false;
  function paused() { return document.hidden || offscreen; }
  function setPaused() { document.body.classList.toggle('paused', paused()); }
  document.addEventListener('visibilitychange', setPaused);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; setPaused(); }, { threshold: 0 }).observe($('vizbox'));
  }

  /* ================================================================ データ */
  var D = null, DEPT = {}, JOBS = [], SLOTS = [], PROOF = {}, STALE = false, BUILT = null;
  var src = document.body.getAttribute('data-src') || 'data/hq.json';
  fetch(src + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(init).catch(function () {
    h('p', 'nojs', L.loadErr, $('kpis'));
  });

  function deptName(id) { var d = DEPT[id]; return d ? (EN ? d.en : d.ja) : id; }
  function jobName(j) { return EN ? j.en : j.ja; }

  function buildSlots() {
    var now = new Date();
    var wd = now.getDay();
    SLOTS = [];
    JOBS.forEach(function (j) {
      if (j.days && j.days.indexOf(wd) < 0) return;
      j.times.forEach(function (t) {
        SLOTS.push({ job: j, t: t, m: minOf(t), key: j.id + '|' + t, dept: j.dept });
      });
    });
    SLOTS.sort(function (a, b) { return a.m - b.m || a.dept.localeCompare(b.dept); });
  }
  function slotStatus(sl, now) {
    var nm = nowMin(now);
    var p = STALE ? null : PROOF[sl.key];
    if (p === 'done') return 'done';
    if (p === 'queued') return sl.m <= nm ? 'done' : 'queued';
    if (sl.m > nm) return 'up';
    if (!STALE && sl.job.proof && BUILT && sl.job.proof !== 'hq') {
      var bm = BUILT.getHours() * 60 + BUILT.getMinutes();
      if (todayIso(BUILT) === D.today && bm > sl.m + 75) return 'late';
    }
    return 'past';
  }
  function nextSlot(now) {
    var nm = nowMin(now);
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].m > nm) return SLOTS[i];
    return null;
  }

  function init(data) {
    D = data;
    (D.schedule.depts || []).forEach(function (d) { DEPT[d.id] = d; });
    (D.depts || []).forEach(function (d) { if (DEPT[d.id]) { DEPT[d.id].sub = EN ? d.sub_en : d.sub_ja; DEPT[d.id].data = d; } });
    JOBS = D.schedule.jobs || [];
    PROOF = D.proof || {};
    var bp = (D.built || '').split(/[- :]/);
    BUILT = bp.length >= 5 ? new Date(+bp[0], +bp[1] - 1, +bp[2], +bp[3], +bp[4]) : null;
    STALE = D.today !== todayIso(new Date());
    buildSlots();
    $('upd').innerHTML = '';
    h('span', null, L.updated + ' ', $('upd'));
    h('b', null, D.built || '—', $('upd'));
    buildLegend();
    buildViz();
    buildKpis();
    buildDepts();
    buildFilter();
    buildSchedule();
    buildLog();
    fit();
    tickSecond();
    setInterval(function () { if (!document.hidden) tickSecond(); }, 1000);
    if (!STILL) schedule(); else drawStatic();
  }

  /* ================================================================ KPI */
  function sparkline(svg, series, color, w, hh) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
    svg.setAttribute('preserveAspectRatio', 'none');
    if (!series || series.length < 2) return;
    var vs = series.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
    if (mx === mn) { mx += 1; mn -= 1; }
    var pts = series.map(function (p, i) {
      return [(i / (series.length - 1)) * (w - 4) + 2, hh - 3 - ((p.v - mn) / (mx - mn)) * (hh - 6)];
    });
    var dpath = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var gid = 'g' + Math.random().toString(36).slice(2, 8);
    var defs = s('defs', {}, svg);
    var lg = s('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    s('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '.28' }, lg);
    s('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }, lg);
    s('path', { d: dpath + ' L' + (w - 2) + ' ' + hh + ' L2 ' + hh + ' Z', fill: 'url(#' + gid + ')' }, svg);
    s('path', { d: dpath, fill: 'none', stroke: color, 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }, svg);
    var lp = pts[pts.length - 1];
    s('circle', { cx: lp[0], cy: lp[1], r: 2.2, fill: color }, svg);
  }

  var COUNTS = [];    // カウントアップする数字 [{el, to, fmt}]
  function countTo(el, to, fmt) { COUNTS.push({ el: el, to: to, fmt: fmt || fmtN }); el.textContent = STILL ? (fmt || fmtN)(to) : '0'; }

  var KPI_EL = {};
  function queuedTotal() {
    var n = 0;
    (D.depts || []).forEach(function (d) {
      if (d.id !== 'sns' && d.id !== 'studio') return;
      d.stats.forEach(function (x) { if (x.queued && (x.k === 'ig' || x.k === 'yt' || x.k === 'long')) n += x.queued; });
    });
    return n;
  }
  function buildKpis() {
    var box = $('kpis');
    var list = (D.kpi || []).slice();
    list.push({ id: 'queued', client: true });
    var colors = { ig_followers: '#f0a5c8', tt_followers: '#5cc8ff', week_published: '#e6c77a', tools_total: '#4ade80', jobs_today: '#e6c77a', queued: '#a78bfa' };
    list.forEach(function (k) {
      var lab = L.kpi[k.id];
      if (!lab) return;
      var b = h('button', 'kpi', null, box);
      b.type = 'button';
      var kl = h('div', 'kl', null, b);
      h('span', null, lab[0], kl);
      var em = h('em', null, '', kl);
      var kv = h('div', 'kv', null, b);
      var kn = h('span', 'kn', '0', kv);
      if (lab[1]) h('span', 'ku', lab[1], kv);
      var kd = h('span', 'kd', '', kv);
      if (k.id === 'jobs_today') {
        KPI_EL.jobs = { n: kn, d: kd, em: em, bar: h('div', 'kr', null, b) };
        KPI_EL.jobs.a = h('i', 'a', null, KPI_EL.jobs.bar);
        KPI_EL.jobs.b = h('i', 'b', null, KPI_EL.jobs.bar);
        KPI_EL.jobsBtn = b;
        updateJobsKpi();
      } else if (k.id === 'queued') {
        var q = queuedTotal();
        countTo(kn, q);
        var qb = h('div', 'kb', null, b), qd = {};
        (D.depts || []).forEach(function (d) { d.stats.forEach(function (x) { if (x.queued && (x.k === 'ig' || x.k === 'yt' || x.k === 'long')) qd[x.k] = (qd[x.k] || 0) + x.queued; }); });
        [['ig', 'reels'], ['yt', 'shorts'], ['long', 'long']].forEach(function (p) { if (qd[p[0]]) h('span', null, L.br[p[1]] + ' ' + qd[p[0]], qb); });
        k.breakdown = { reels: qd.ig || 0, shorts: qd.yt || 0, long: qd.long || 0 };
        em.textContent = L.asOf + md(D.today);
        b.setAttribute('aria-label', lab[0] + ' ' + q + lab[1]);
        k.v = q;
      } else {
        countTo(kn, k.v);
        em.textContent = L.asOf + md(k.asof);
        if (k.delta != null) {
          kd.textContent = (k.delta > 0 ? '+' : '') + fmtN(k.delta) + ' · ' + L.vsPrev(md(k.prev_d));
          kd.classList.add(k.delta > 0 ? 'up' : (k.delta < 0 ? 'dn' : 'eq'));
        }
        if (k.breakdown) {
          var kb = h('div', 'kb', null, b);
          Object.keys(k.breakdown).forEach(function (x) { if (k.breakdown[x]) h('span', null, L.br[x] + ' ' + k.breakdown[x], kb); });
        }
        var sv = s('svg', { class: 'ks', 'aria-hidden': 'true' }, b);
        sparkline(sv, k.series, colors[k.id], 260, 26);
        b.setAttribute('aria-label', lab[0] + ' ' + fmtN(k.v) + lab[1] + (k.delta != null ? '、' + kd.textContent : '') + '（' + md(k.asof) + '）');
      }
      b.addEventListener('click', function () { openKpi(k, colors[k.id]); });
    });
  }
  function jobsCounts() {
    var now = new Date(), passed = 0, conf = 0;
    SLOTS.forEach(function (sl) {
      var st = slotStatus(sl, now);
      if (st !== 'up' && st !== 'queued') passed++;
      if (st === 'done') conf++;
    });
    return { passed: passed, total: SLOTS.length, conf: conf };
  }
  function updateJobsKpi() {
    if (!KPI_EL.jobs) return;
    var c = jobsCounts();
    KPI_EL.jobs.n.textContent = L.passedOf(c.passed, c.total);
    KPI_EL.jobs.d.textContent = L.confirmed + ' ' + c.conf;
    KPI_EL.jobs.em.textContent = L.nowL;
    KPI_EL.jobs.a.style.width = (c.total ? c.conf / c.total * 100 : 0) + '%';
    KPI_EL.jobs.b.style.width = (c.total ? (c.passed - c.conf) / c.total * 100 : 0) + '%';
    KPI_EL.jobsBtn.setAttribute('aria-label', L.kpi.jobs_today[0] + ' ' + c.passed + '/' + c.total + '、' + L.confirmed + ' ' + c.conf);
  }

  /* ================================================================ 映像：24時間の時計＋部署ノード */
  var V = {};   // 配置
  var NODE_EL = {}, SLOT_EL = {}, HAND = null, NOWT = null;
  var ORDER = ['sns', 'studio', 'pr', 'dev', 'biz', 'admin'];
  function buildLegend() {
    var lg = $('legend');
    lg.innerHTML = '';
    ORDER.forEach(function (id) {
      if (!DEPT[id]) return;
      var sp = h('span', null, null, lg);
      var i = h('i', null, null, sp); i.style.background = COL[id];
      sp.appendChild(document.createTextNode(deptName(id)));
    });
  }
  function polar(r, deg) { var a = (deg - 90) * Math.PI / 180; return [V.cx + r * Math.cos(a), V.cy + r * Math.sin(a)]; }
  function buildViz() {
    var g = $('g');
    while (g.firstChild) g.removeChild(g.firstChild);
    var W = 800, H = NARROW ? 800 : 500;
    V = NARROW
      ? { W: W, H: H, cx: 400, cy: 404, rx: 312, ry: 320, ringIn: 150, ringStep: 17, nodeR: 42, fs: 1.55, core: 92 }
      : { W: W, H: H, cx: 400, cy: 252, rx: 322, ry: 172, ringIn: 104, ringStep: 12, nodeR: 27, fs: 1, core: 66 };
    g.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    V.ringOut = V.ringIn + V.ringStep * 5;
    V.tickR = V.ringOut + 10;
    V.labelR = V.ringOut + 24 * V.fs;
    var defs = s('defs', {}, g);
    ORDER.forEach(function (id) {
      var rg = s('radialGradient', { id: 'halo-' + id }, defs);
      s('stop', { offset: '0', 'stop-color': COL[id], 'stop-opacity': '.55' }, rg);
      s('stop', { offset: '1', 'stop-color': COL[id], 'stop-opacity': '0' }, rg);
    });
    var cg = s('radialGradient', { id: 'coreg' }, defs);
    s('stop', { offset: '0', 'stop-color': '#e6c77a', 'stop-opacity': '.30' }, cg);
    s('stop', { offset: '1', 'stop-color': '#e6c77a', 'stop-opacity': '0' }, cg);

    // 部署の位置（楕円上・上から時計回り）
    V.nodes = {};
    ORDER.forEach(function (id, i) {
      var deg = 30 + i * 60;
      var a = (deg - 90) * Math.PI / 180;
      V.nodes[id] = { x: V.cx + V.rx * Math.cos(a), y: V.cy + V.ry * Math.sin(a), deg: deg };
    });
    // 部署→中央の線
    var links = s('g', {}, g);
    ORDER.forEach(function (id) {
      var n = V.nodes[id];
      var c = linkCtrl(id);
      s('path', { class: 'link', d: 'M' + n.x + ' ' + n.y + ' Q' + c[0] + ' ' + c[1] + ' ' + V.cx + ' ' + V.cy, stroke: COL[id] }, links);
    });
    // 時計：部署ごとの軌道
    var rings = s('g', {}, g);
    ORDER.forEach(function (id, i) {
      s('circle', { class: 'ring', cx: V.cx, cy: V.cy, r: V.ringIn + i * V.ringStep, stroke: COL[id], 'stroke-opacity': .16 }, rings);
    });
    s('circle', { class: 'ring', cx: V.cx, cy: V.cy, r: V.tickR + 6, stroke: 'rgba(230,199,122,.25)' }, rings);
    // 目盛りと時刻
    for (var hr = 0; hr < 24; hr++) {
      var p1 = polar(V.tickR, hr * 15), p2 = polar(V.tickR + (hr % 3 ? 4 : 8), hr * 15);
      s('line', { class: 'tick' + (hr % 3 ? '' : ' h3'), x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, rings);
      if (hr % 3 === 0) {
        var pl = polar(V.labelR, hr * 15);
        var tx = s('text', { class: 'hl', x: pl[0], y: pl[1] + 3.5 * V.fs, 'text-anchor': 'middle', 'font-size': 10 * V.fs }, rings);
        tx.textContent = pad(hr);
      }
    }
    // 回る細い輪（中央）は canvas で描く（SVG を毎フレーム動かすと重いため）
    if (STILL) {
      s('circle', { cx: V.cx, cy: V.cy, r: V.core + 12, fill: 'none', stroke: 'rgba(230,199,122,.35)', 'stroke-width': 1, 'stroke-dasharray': '1 7' }, g);
      s('circle', { cx: V.cx, cy: V.cy, r: V.core + 22, fill: 'none', stroke: 'rgba(92,200,255,.22)', 'stroke-width': 1, 'stroke-dasharray': '30 10 4 10' }, g);
    }
    // 中央 EQUA
    var core = s('g', { class: 'core' }, g);
    s('circle', { cx: V.cx, cy: V.cy, r: V.core + 34, fill: 'url(#coreg)' }, core);
    s('circle', { class: 'c1', cx: V.cx, cy: V.cy, r: V.core, 'stroke-width': 1.2 }, core);
    var t1 = s('text', { class: 't1', x: V.cx, y: V.cy + 6 * V.fs, 'text-anchor': 'middle', 'font-size': 24 * V.fs }, core); t1.textContent = 'EQUA';
    var t2 = s('text', { class: 't2', x: V.cx, y: V.cy + 24 * V.fs, 'text-anchor': 'middle', 'font-size': 9.5 * V.fs }, core); t2.textContent = 'HQ · ' + (D ? md(D.today) : '');
    // 予定の点
    var slots = s('g', {}, g);
    SLOT_EL = {};
    var now = new Date();
    SLOTS.forEach(function (sl) {
      var i = ORDER.indexOf(sl.dept);
      var p = polar(V.ringIn + i * V.ringStep, sl.m / 4);
      var st = slotStatus(sl, now);
      var gg = s('g', { class: 'slot ' + st, tabindex: '0', role: 'button', 'aria-label': sl.t + ' ' + deptName(sl.dept) + ' ' + jobName(sl.job) + ' ' + L.st[st] }, slots);
      s('circle', { cx: p[0], cy: p[1], r: 9 * V.fs, fill: 'transparent' }, gg);
      s('circle', { class: 'd', cx: p[0], cy: p[1], r: 3 * V.fs, fill: COL[sl.dept] }, gg);
      gg.addEventListener('click', function () { openJob(sl.job); });
      gg.addEventListener('keydown', keyAct(function () { openJob(sl.job); }));
      SLOT_EL[sl.key] = { g: gg, x: p[0], y: p[1] };
      sl.x = p[0]; sl.y = p[1];
    });
    // 現在の針
    HAND = s('g', {}, g);
    s('line', { class: 'hand', x1: V.cx, y1: V.cy - V.core - 2, x2: V.cx, y2: V.cy - V.tickR - 10 }, HAND);
    s('circle', { class: 'handdot', cx: V.cx, cy: V.cy - V.tickR - 10, r: 3 * V.fs }, HAND);
    NOWT = s('text', { class: 'nowt', x: V.cx, y: V.cy - V.tickR - 18, 'text-anchor': 'middle', 'font-size': 10 * V.fs }, HAND);
    // 部署ノード
    NODE_EL = {};
    ORDER.forEach(function (id) {
      if (!DEPT[id]) return;
      var n = V.nodes[id];
      var gg = s('g', { class: 'node', tabindex: '0', role: 'button' }, g);
      s('circle', { class: 'halo', cx: n.x, cy: n.y, r: V.nodeR * 2.1, fill: 'url(#halo-' + id + ')' }, gg);
      s('circle', { class: 'nb', cx: n.x, cy: n.y, r: V.nodeR, stroke: COL[id] }, gg);
      var sc = V.nodeR / 27 * 0.95;
      var ic = s('path', { d: ICON[id], fill: 'none', stroke: COL[id], 'stroke-width': 1.6 / sc * 0.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        transform: 'translate(' + (n.x - 12 * sc) + ' ' + (n.y - 12 * sc) + ') scale(' + sc + ')' }, gg);
      ic.setAttribute('aria-hidden', 'true');
      var nm = s('text', { class: 'nm', x: n.x, y: n.y + V.nodeR + 16 * V.fs, 'text-anchor': 'middle', 'font-size': 13 * V.fs }, gg);
      nm.textContent = deptName(id);
      var ns = s('text', { class: 'ns', x: n.x, y: n.y + V.nodeR + 29 * V.fs, 'text-anchor': 'middle', 'font-size': 9.5 * V.fs }, gg);
      gg.addEventListener('click', function () { openDept(id); });
      gg.addEventListener('keydown', keyAct(function () { openDept(id); }));
      NODE_EL[id] = { g: gg, ns: ns, hotUntil: 0 };
    });
    updateViz();
  }
  function linkCtrl(id) {
    var n = V.nodes[id];
    var mx = (n.x + V.cx) / 2, my = (n.y + V.cy) / 2;
    var dx = V.cx - n.x, dy = V.cy - n.y;
    return [mx - dy * 0.22, my + dx * 0.22];
  }
  function keyAct(fn) { return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }; }

  function deptActive(id, now) {
    var nm = nowMin(now);
    return SLOTS.some(function (sl) { return sl.dept === id && sl.m <= nm + 10 && sl.m >= nm - 15; });
  }
  function updateViz() {
    var now = new Date();
    var nm = nowMin(now);
    if (HAND) {
      HAND.setAttribute('transform', 'rotate(' + (nm / 4).toFixed(2) + ' ' + V.cx + ' ' + V.cy + ')');
      NOWT.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
      NOWT.setAttribute('transform', 'rotate(' + (-nm / 4).toFixed(2) + ' ' + V.cx + ' ' + (V.cy - V.tickR - 21) + ')');
    }
    var nx = nextSlot(now);
    SLOTS.forEach(function (sl) {
      var el = SLOT_EL[sl.key]; if (!el) return;
      var st = slotStatus(sl, now);
      var cls = 'slot ' + st + (nx && sl.m === nx.m ? ' next' : '');
      if (el.g.getAttribute('class') !== cls) el.g.setAttribute('class', cls);
    });
    ORDER.forEach(function (id) {
      var n = NODE_EL[id]; if (!n) return;
      var on = deptActive(id, now);
      n.ns.textContent = on ? '● ' + L.active : L.idle;
      n.ns.setAttribute('class', 'ns' + (on ? ' on' : ''));
      n.g.setAttribute('aria-label', deptName(id) + '、' + (on ? L.active : L.idle));
    });
    // 次の予定
    var nb = $('nextbox');
    nb.innerHTML = '';
    if (nx) {
      h('div', 'nl', L.next, nb);
      h('div', 'nt', nx.t, nb);
      var same = SLOTS.filter(function (x) { return x.m === nx.m; });
      same.forEach(function (x) { var dv = h('div', 'nj', null, nb); var i = h('span', null, '● ', dv); i.style.color = COL[x.dept]; dv.appendChild(document.createTextNode(deptName(x.dept) + ' · ' + jobName(x.job))); });
      h('div', 'nd', L.inT(Math.max(1, Math.round(nx.m - nm))), nb);
    }
  }

  /* ---- 粒と走査線（canvas） ---- */
  var cv = $('cv'), ctx = cv.getContext('2d'), CS = 1;
  function sizeCanvas() {
    if (!V.W) return;
    var box = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var scale = Math.min(box.width / V.W, box.height / V.H);
    CS = Math.max(0.5, Math.min(scale * dpr, 2));
    cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
    // SVG（xMidYMid meet）と同じ座標にそろえる
    V.ox = (box.width - V.W * scale) / 2 * dpr; V.oy = (box.height - V.H * scale) / 2 * dpr; V.k = scale * dpr;
  }
  var PARTS = [], PULSES = [];
  function spawn(id, n, toDept) {
    var nd = V.nodes[id]; if (!nd) return;
    var c = linkCtrl(id);
    for (var i = 0; i < n; i++) {
      if (PARTS.length > 70) PARTS.shift();
      PARTS.push({ id: id, t: -i * 0.09, sp: 0.55 + Math.random() * 0.35, c: c, rev: !!toDept });
    }
  }
  var SCAN = { deg: 0, last: 0 };
  var SCAN_MS = 24000;
  function fire(sl, live) {
    var now = performance.now();
    var n = NODE_EL[sl.dept];
    if (n) { n.hotUntil = now + 1400; n.hot0 = now; }   // 光は canvas で描く（SVG を描き直さない）
    var card = DEPT_CARD[sl.dept];
    if (card) { card.hotUntil = now + 1400; card.el.classList.add('hot'); }
    spawn(sl.dept, live ? 7 : 4);
    PULSES.push({ x: sl.x, y: sl.y, t0: now, c: COL[sl.dept] });
    if (KPI_EL.jobsBtn) { KPI_EL.jobsBtn.classList.add('flash'); KPI_EL.flashUntil = now + 600; }
    if (live) addLiveLog(sl);
    else addScanRow(sl);
  }
  function addScanRow(sl) {
    var ol = $('scanrows');
    var li = document.createElement('li');
    var i = h('i', null, null, li); i.style.background = COL[sl.dept];
    h('b', null, sl.t, li);
    h('span', null, deptName(sl.dept) + ' · ' + jobName(sl.job), li);
    h('span', 'sc', '· ' + L.st[slotStatus(sl, new Date())], li);
    ol.insertBefore(li, ol.firstChild);
    while (ol.children.length > 1) ol.removeChild(ol.lastChild);
  }

  var lastF = 0, t0 = 0, ambientT = 0;
  var FPS = 20;                            // 30コマ/秒より少なく。間はタイマーで待つ（毎フレームの描き直しを減らす）
  function schedule() {
    if (paused()) { setTimeout(schedule, 500); lastF = 0; return; }
    setTimeout(function () { requestAnimationFrame(frame); }, Math.max(0, 1000 / FPS - 8));
  }
  function frame(ts) {
    schedule();
    if (!lastF) { lastF = ts; return; }
    var dt = Math.min(0.1, (ts - lastF) / 1000);
    lastF = ts;
    if (!t0) t0 = ts;
    // 走査（24秒で1日）
    var prev = SCAN.deg;
    SCAN.deg = (SCAN.deg + dt * 360000 / SCAN_MS) % 360;
    var pm = prev * 4, cm = SCAN.deg * 4;
    SLOTS.forEach(function (sl) {
      var hit = cm >= pm ? (sl.m > pm && sl.m <= cm) : (sl.m > pm || sl.m <= cm);
      if (hit) fire(sl, false);
    });
    // 部署ごとのふだんの流れ（今日・累計の記録が多い部署ほどよく流れる）
    ambientT += dt;
    if (ambientT > 0.9) {
      ambientT = 0;
      var id = ORDER[Math.floor(Math.random() * ORDER.length)];
      spawn(id, 1, Math.random() < 0.25);
    }
    // 光の切りかえ
    var now = performance.now();
    ORDER.forEach(function (id) {
      var n = NODE_EL[id];
      var c = DEPT_CARD[id];
      if (c && c.hotUntil && now > c.hotUntil) { c.hotUntil = 0; c.el.classList.remove('hot'); }
    });
    if (KPI_EL.flashUntil && now > KPI_EL.flashUntil) { KPI_EL.flashUntil = 0; KPI_EL.jobsBtn.classList.remove('flash'); }
    // カウントアップ（最初の1.4秒）
    if (COUNTS.length) {
      var p = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
      COUNTS.forEach(function (c) { c.el.textContent = c.fmt(Math.round(c.to * e)); });
      if (p >= 1) COUNTS = [];
    }
    draw(dt);
  }
  function draw(dt) {
    var k = V.k, ox = V.ox, oy = V.oy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    // 走査線：細い線＋うしろに薄い扇（1回の塗りで描く）
    var a = (SCAN.deg - 90) * Math.PI / 180;
    var r0 = V.core + 4, r1 = V.tickR + 4, span = 0.35;
    ctx.beginPath();
    ctx.arc(V.cx, V.cy, r1, a - span, a, false);
    ctx.arc(V.cx, V.cy, r0, a, a - span, true);
    ctx.closePath();
    var tx0 = V.cx + (r0 + r1) / 2 * Math.cos(a - span), ty0 = V.cy + (r0 + r1) / 2 * Math.sin(a - span);
    var tx1 = V.cx + (r0 + r1) / 2 * Math.cos(a), ty1 = V.cy + (r0 + r1) / 2 * Math.sin(a);
    var lgd = ctx.createLinearGradient(tx0, ty0, tx1, ty1);
    lgd.addColorStop(0, 'rgba(230,199,122,0)');
    lgd.addColorStop(1, 'rgba(230,199,122,.10)');
    ctx.fillStyle = lgd;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(V.cx + r0 * Math.cos(a), V.cy + r0 * Math.sin(a));
    ctx.lineTo(V.cx + r1 * Math.cos(a), V.cy + r1 * Math.sin(a));
    ctx.strokeStyle = 'rgba(230,199,122,.55)'; ctx.lineWidth = 1 / k * 1.2;
    ctx.stroke();
    // 光っている部署（予定の時刻が来た部署）
    var nowp = performance.now();
    ORDER.forEach(function (id) {
      var n = NODE_EL[id], nd = V.nodes[id];
      if (!n || !n.hotUntil || nowp > n.hotUntil) return;
      var q = (nowp - n.hot0) / 1400, al = q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
      var rg = ctx.createRadialGradient(nd.x, nd.y, V.nodeR * 0.6, nd.x, nd.y, V.nodeR * 2.3);
      rg.addColorStop(0, hexA(COL[id], 0.55 * al)); rg.addColorStop(1, hexA(COL[id], 0));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, V.nodeR * 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(COL[id], 0.9 * al); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, V.nodeR + 3, 0, Math.PI * 2); ctx.stroke();
    });
    // 中央の回る輪（60秒・90秒で1周）
    var tt = performance.now() / 1000;
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 7]); ctx.lineDashOffset = -tt * 6;
    ctx.strokeStyle = 'rgba(230,199,122,.35)';
    ctx.beginPath(); ctx.arc(V.cx, V.cy, V.core + 12, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([30, 10, 4, 10]); ctx.lineDashOffset = tt * 5;
    ctx.strokeStyle = 'rgba(92,200,255,.22)';
    ctx.beginPath(); ctx.arc(V.cx, V.cy, V.core + 22, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 予定の点の波紋
    var now = performance.now();
    ctx.lineWidth = 1.2;
    PULSES = PULSES.filter(function (p) {
      var q = (now - p.t0) / 900; if (q >= 1) return false;
      ctx.beginPath(); ctx.arc(p.x, p.y, (3 + q * 16) * V.fs, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(p.c, 0.8 * (1 - q)); ctx.stroke();
      return true;
    });
    // 粒（部署→EQUA、ときどき EQUA→部署は金色）
    ctx.globalCompositeOperation = 'lighter';
    PARTS = PARTS.filter(function (pt) {
      pt.t += dt * pt.sp;
      if (pt.t < 0) return true;
      if (pt.t >= 1) return false;
      var n = V.nodes[pt.id];
      var u = pt.rev ? 1 - pt.t : pt.t;
      var x = (1 - u) * (1 - u) * n.x + 2 * (1 - u) * u * pt.c[0] + u * u * V.cx;
      var y = (1 - u) * (1 - u) * n.y + 2 * (1 - u) * u * pt.c[1] + u * u * V.cy;
      var col = pt.rev ? '#e6c77a' : COL[pt.id];
      ctx.fillStyle = hexA(col, 0.22);
      ctx.beginPath(); ctx.arc(x, y, 4.2 * V.fs, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hexA(col, 0.95);
      ctx.beginPath(); ctx.arc(x, y, 1.6 * V.fs, 0, Math.PI * 2); ctx.fill();
      return true;
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }
  function drawStatic() {
    // 動きを減らす設定：走査線・粒は出さず、針と状態だけ
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
  }

  /* ---- 1秒ごと：時計・針・状態、予定の時刻になったら発火 ---- */
  var lastMin = -1;
  function tickSecond() {
    var d = new Date();
    $('clk').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    $('dte').textContent = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + L.dayN[d.getDay()];
    var m = d.getHours() * 60 + d.getMinutes();
    if (m !== lastMin) {
      if (lastMin >= 0) {
        if (m < lastMin) { STALE = D.today !== todayIso(d); buildSlots(); buildViz(); buildSchedule(); }   // 日付が変わった
        SLOTS.forEach(function (sl) { if (sl.m === m) fire(sl, true); });
        buildSchedule(true);
        updateDepts();
      }
      lastMin = m;
      updateJobsKpi();
    }
    if (D) updateViz();
  }

  /* ================================================================ 部署カード */
  var DEPT_CARD = {};
  function deptToday(id) {
    var d = DEPT[id] && DEPT[id].data;
    if (!d || !d.stats.length) return null;
    var n = 0, seen = {};
    d.stats.forEach(function (x) { if (x.today && !seen[x.k]) { n += x.today; seen[x.k] = 1; } });
    return n;
  }
  function deptWeek(id) {
    var d = DEPT[id] && DEPT[id].data;
    return (d && d.week) || [0, 0, 0, 0, 0, 0, 0];
  }
  function buildDepts() {
    var box = $('depts');
    box.innerHTML = '';
    ORDER.forEach(function (id) {
      if (!DEPT[id]) return;
      var b = h('button', 'dc', null, box);
      b.type = 'button';
      b.style.setProperty('--c', COL[id]);
      var dh = h('div', 'dh', null, b);
      var ic = s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, dh);
      s('path', { d: ICON[id] }, ic);
      h('span', 'dn', deptName(id), dh);
      h('div', 'sub', DEPT[id].sub || '', b);
      var row = h('div', 'row', null, b);
      var big = h('div', 'big', null, row);
      var st = h('span', 'st', null, row); h('i', null, null, st); var stt = h('span', null, '', st);
      var bn = h('span', null, '0', big);
      var bs = h('small', null, '', big);
      var bars = h('div', 'bars', null, b);
      bars.setAttribute('aria-hidden', 'true');
      var wk = deptWeek(id), mx = Math.max.apply(null, wk.concat([1]));
      wk.forEach(function (v) { var i = h('i', null, null, bars); i.style.height = Math.max(4, v / mx * 100) + '%'; });
      var tl = h('div', 'tl', null, b);
      tl.setAttribute('aria-hidden', 'true');
      var ticks = [];
      SLOTS.forEach(function (x) { if (x.dept === id) { var i = h('i', null, null, tl); i.style.left = (x.m / 1440 * 100) + '%'; ticks.push([i, x.m]); } });
      ['0', '12', '24'].forEach(function (lb, k) { var sp = h('span', null, lb, tl); sp.style.left = (k * 50) + '%'; });
      var nowMark = h('b', null, null, tl);
      var nx = h('div', 'nx', null, b);
      DEPT_CARD[id] = { el: b, st: st, stt: stt, bn: bn, bs: bs, nx: nx, hotUntil: 0, ticks: ticks, now: nowMark };
      var t = deptToday(id);
      if (t != null) { countTo(bn, t); bs.textContent = EN ? 'today' : '今日'; }
      b.addEventListener('click', function () { openDept(id); });
    });
    updateDepts();
  }
  function updateDepts() {
    var now = new Date(), nm = nowMin(now);
    ORDER.forEach(function (id) {
      var c = DEPT_CARD[id]; if (!c) return;
      var on = deptActive(id, now);
      c.st.className = 'st' + (on ? ' on' : '');
      c.stt.textContent = on ? L.active : L.idle;
      var mine = SLOTS.filter(function (x) { return x.dept === id; });
      c.now.style.left = (nm / 1440 * 100) + '%';
      c.ticks.forEach(function (t) { t[0].className = t[1] <= nm ? 'p' : ''; });
      if (deptToday(id) == null) {
        var passed = mine.filter(function (x) { return x.m <= nm; }).length;
        c.bn.textContent = passed + '/' + mine.length;
        c.bs.textContent = EN ? 'passed' : '経過';
      }
      var nx = mine.filter(function (x) { return x.m > nm; })[0];
      c.nx.innerHTML = '';
      h('span', null, L.nextJob + ' ', c.nx);
      if (nx) { h('b', null, nx.t, c.nx); c.nx.appendChild(document.createTextNode(' ' + jobName(nx.job))); }
      else c.nx.appendChild(document.createTextNode(L.none));
      c.el.setAttribute('aria-label', deptName(id) + '、' + (on ? L.active : L.idle) + '、' + c.bn.textContent + ' ' + c.bs.textContent + '、' + c.nx.textContent);
    });
  }

  /* ================================================================ 今日の予定 */
  var FILTER = 'all';
  function buildFilter() {
    var box = $('sfilter');
    box.innerHTML = '';
    ['all'].concat(ORDER).forEach(function (id) {
      if (id !== 'all' && !DEPT[id]) return;
      var b = h('button', null, id === 'all' ? L.all : deptName(id), box);
      b.type = 'button';
      b.setAttribute('aria-pressed', id === FILTER ? 'true' : 'false');
      b.addEventListener('click', function () {
        FILTER = id;
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        buildSchedule();
      });
    });
  }
  function buildSchedule(keepScroll) {
    var ol = $('sched');
    var st0 = ol.scrollTop;
    ol.innerHTML = '';
    var now = new Date(), nm = nowMin(now), nx = nextSlot(now);
    var c = { done: 0, queued: 0, late: 0, past: 0, up: 0 };
    var nowPlaced = false, nowLi = null;
    SLOTS.forEach(function (sl) {
      var st = slotStatus(sl, now);
      c[st]++;
      if (FILTER !== 'all' && sl.dept !== FILTER) return;
      if (!nowPlaced && sl.m > nm) {
        nowLi = h('li', 'nowline', null, ol);
        nowLi.setAttribute('aria-hidden', 'true');
        h('span', null, L.legendNow + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()), nowLi);
        nowPlaced = true;
      }
      var isNext = nx && sl.m === nx.m;
      var li = h('li', (isNext ? 'is-next ' : '') + (sl.m <= nm ? 'is-past' : ''), null, ol);
      var b = h('button', null, null, li);
      b.type = 'button';
      h('span', 'tm', sl.t, b);
      var dt = h('span', 'dt', null, b); dt.style.background = COL[sl.dept];
      var lb = h('span', 'lb', jobName(sl.job), b);
      h('small', null, deptName(sl.dept), lb);
      var chipSt = isNext && st === 'up' ? 'next' : st;
      h('span', 'chip ' + chipSt, L.st[chipSt], b);
      b.setAttribute('aria-label', sl.t + ' ' + jobName(sl.job) + '、' + deptName(sl.dept) + '、' + L.st[chipSt]);
      b.addEventListener('click', function () { openJob(sl.job); });
    });
    var sum = $('schedSum');
    sum.textContent = SLOTS.length + L.jobs + ' · ' + L.st.done + ' ' + c.done + (c.queued ? ' · ' + L.st.queued + ' ' + c.queued : '') + (c.late ? ' · ' + L.st.late + ' ' + c.late : '');
    if (keepScroll) ol.scrollTop = st0;
    else if (nowLi) ol.scrollTop = Math.max(0, nowLi.offsetTop - ol.offsetTop - 70);
  }

  /* ================================================================ 作業ログ */
  function actText(a) {
    if (a.title) return a.title;
    return L.posted(a.kind);
  }
  function actTime(a) {
    var d = a.t.slice(0, 10), t = a.t.length > 10 ? ' ' + a.t.slice(11, 16) : '';
    return md(d) + t;
  }
  function logRow(ol, a, isNew, top) {
    var li = document.createElement('li');
    if (isNew) li.className = 'new';
    h('span', 'tm', actTime(a), li);
    var dt = h('span', 'dt', null, li); dt.style.background = COL[a.dept] || '#e6c77a';
    var tx = h('span', 'tx', null, li);
    h('em', null, a.kind, tx);
    if (a.url) {
      var an = h('a', null, actText(a), tx);
      an.href = a.url; an.target = '_blank'; an.rel = 'noopener';
    } else tx.appendChild(document.createTextNode(actText(a)));
    if (top) ol.insertBefore(li, ol.firstChild); else ol.appendChild(li);
    return li;
  }
  function buildLog() {
    var ol = $('log');
    ol.innerHTML = '';
    (D.activity || []).forEach(function (a) { logRow(ol, a); });
  }
  function addLiveLog(sl) {
    var ol = $('log');
    var d = new Date();
    var li = document.createElement('li');
    li.className = 'new sys';
    h('span', 'tm', md(todayIso(d)) + ' ' + sl.t, li);
    var dt = h('span', 'dt', null, li); dt.style.background = COL[sl.dept];
    var tx = h('span', 'tx', null, li);
    h('em', null, deptName(sl.dept), tx);
    tx.appendChild(document.createTextNode(jobName(sl.job) + ' · ' + L.st[slotStatus(sl, d)]));
    ol.insertBefore(li, ol.firstChild);
    while (ol.children.length > 60) ol.removeChild(ol.lastChild);
    $('live').textContent = L.liveLog(sl.t, deptName(sl.dept), jobName(sl.job));
  }

  /* ================================================================ 詳しい中身（パネル） */
  var lastFocus = null;
  function openDrawer(title, color) {
    lastFocus = document.activeElement;
    $('dwTitle').textContent = title;
    $('dwDot').style.background = color || '#e6c77a';
    var body = $('dwBody');
    body.innerHTML = '';
    $('drawer').hidden = false; $('scrim').hidden = false;
    $('dwClose').focus();
    return body;
  }
  function closeDrawer() {
    $('drawer').hidden = true; $('scrim').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('dwClose').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if ($('drawer').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key === 'Tab') {   // パネルの中だけでフォーカスを回す
      var f = $('drawer').querySelectorAll('button,a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  function slotList(parent, slots) {
    var ul = h('ul', null, null, parent);
    var now = new Date(), nx = nextSlot(now);
    slots.forEach(function (sl) {
      var li = h('li', null, null, ul);
      h('span', 'tm', sl.t, li);
      h('span', 'lb', jobName(sl.job), li);
      var st = slotStatus(sl, now); if (nx && sl.m === nx.m && st === 'up') st = 'next';
      h('span', 'chip ' + st, L.st[st], li);
    });
    if (!slots.length) h('p', null, L.noRecent, parent);
  }
  function linkList(parent, rows) {
    if (!rows || !rows.length) { h('p', null, L.noRecent, parent); return; }
    var ul = h('ul', null, null, parent);
    rows.forEach(function (r) {
      var li = h('li', null, null, ul);
      h('span', 'tm', r.t ? actTime(r) : md(r.d), li);
      var lb = h('span', 'lb', null, li);
      var em = h('span', null, r.kind + ' · ', lb); em.style.color = 'var(--tx3)';
      if (r.url) { var a = h('a', null, r.title || L.posted(r.kind), lb); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; }
      else lb.appendChild(document.createTextNode(r.title || L.posted(r.kind)));
    });
  }
  function openDept(id) {
    if (EMBED) return;
    var d = DEPT[id], data = d.data || { stats: [], recent: [] };
    var body = openDrawer(deptName(id), COL[id]);
    h('p', null, d.sub || '', body);
    h('h3', null, L.deptStats, body);
    if (data.stats.length) {
      var g = h('div', 'stats', null, body);
      data.stats.forEach(function (x) {
        var c = h('div', null, null, g);
        h('b', null, fmtN(x.total != null ? x.total : 0), c);
        h('span', null, L.stat[x.k] || x.k, c);
        var parts = [];
        if (x.today != null) parts.push(L.today + ' ' + x.today);
        if (x.queued) parts.push(L.queuedN + ' ' + x.queued);
        h('small', null, L.total + (parts.length ? ' · ' + parts.join(' · ') : ''), c);
      });
    } else h('p', null, L.noStats, body);
    h('h3', null, L.deptToday, body);
    slotList(body, SLOTS.filter(function (x) { return x.dept === id; }));
    h('h3', null, L.deptRecent, body);
    linkList(body, data.recent);
    var acts = (D.activity || []).filter(function (a) { return a.dept === id; }).slice(0, 8);
    if (acts.length) { h('h3', null, L.deptLog, body); linkList(body, acts); }
    if (STALE) h('p', 'note', L.staleNote(md(D.today)), body);
  }
  function openJob(job) {
    if (EMBED) return;
    var body = openDrawer(jobName(job), COL[job.dept]);
    h('h3', null, L.deptL, body);
    var p = h('p', null, null, body);
    var b = h('button', null, deptName(job.dept) + ' →', p);
    b.type = 'button'; b.style.color = COL[job.dept];
    b.addEventListener('click', function () { openDept(job.dept); });
    h('h3', null, L.times, body);
    var mine = SLOTS.filter(function (x) { return x.job === job; });
    slotList(body, mine);
    h('h3', null, L.days, body);
    h('p', null, job.days ? job.days.map(function (x) { return L.dayN[x]; }).join('・') : L.every, body);
    h('h3', null, L.statusL, body);
    var seen = {};
    var now = new Date();
    mine.forEach(function (sl) { var st = slotStatus(sl, now); if (!seen[st]) { seen[st] = 1; h('p', null, L.st[st] + '：' + L.stLong[st], body); } });
    if (STALE) h('p', 'note', L.staleNote(md(D.today)), body);
  }
  function openKpi(k, color) {
    if (EMBED) return;
    var lab = L.kpi[k.id];
    var body = openDrawer(lab[0], color);
    if (k.id === 'jobs_today') {
      var c = jobsCounts();
      h('div', 'big', L.passedOf(c.passed, c.total), body);
      h('p', null, L.confirmed + ' ' + c.conf, body);
      h('h3', null, EN ? 'About' : '説明', body);
      h('p', null, lab[2], body);
      return;
    }
    h('div', 'big', fmtN(k.v) + (lab[1] ? ' ' + lab[1] : ''), body);
    if (k.delta != null) h('p', null, (k.delta > 0 ? '+' : '') + fmtN(k.delta) + ' · ' + L.vsPrev(md(k.prev_d)), body);
    h('p', null, lab[2], body);
    if (k.series && k.series.length > 1) {
      h('h3', null, L.hist, body);
      var sv = s('svg', { class: 'spk', 'aria-hidden': 'true' }, body);
      sparkline(sv, k.series, color, 420, 60);
      var ul = h('ul', null, null, body);
      k.series.slice().reverse().slice(0, 10).forEach(function (p) {
        var li = h('li', null, null, ul); h('span', 'tm', md(p.d), li); h('span', 'lb', fmtN(p.v), li);
      });
    }
    if (k.breakdown) {
      h('h3', null, EN ? 'Breakdown' : '内訳', body);
      var g = h('div', 'stats', null, body);
      Object.keys(k.breakdown).forEach(function (x) { var cc = h('div', null, null, g); h('b', null, k.breakdown[x], cc); h('span', null, L.br[x], cc); });
    }
    h('h3', null, L.source, body);
    h('p', null, (k.id === 'ig_followers' || k.id === 'tt_followers') ? L.srcNums : L.srcPub, body);
    if (k.asof) h('p', 'note', L.asOf + k.asof, body);
  }

  window.addEventListener('resize', fit);
})();
