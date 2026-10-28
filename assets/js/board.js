/* EQUA 売上ボード — data/public.json（日付・区分・金額だけ）を読んで、今日・今月・累計を日本時間で計算する */
(function () {
  "use strict";
  var board = document.getElementById("board");
  if (!board) return;
  var DATA = board.getAttribute("data-src") || "data/public.json";
  /* 英語版（en/index.html, <html lang="en">）では画面の言葉と区分名だけ英語にする（数字は同じ） */
  var EN = /^en/i.test(document.documentElement.lang || "");
  /* 英語版はドルの目安で出す（public.json の fx＝ECBの参考レート。記録そのものは円） */
  var FX = null;
  var yen = function (n) {
    if (EN && FX) return (n < 0 ? "−$" : "$") + (Math.abs(n) / FX.jpy_per_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "−¥" : "¥") + Math.abs(n).toLocaleString(EN ? "en-US" : "ja-JP");
  };
  var CAT_EN = {
    "市場調査・分析": "Research & analysis", "アプリ・ツール販売": "App & tool sales", "アフィリエイト収益": "Affiliate income",
    "その他の報酬": "Other income", "手数料": "Fees", "広告費": "Advertising", "出店費用": "Store fees"
  };
  var cn = function (c) { return EN ? (CAT_EN[c] || "Other") : c; };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function jstParts(d) {
    var f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    var p = {};
    f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function jstToday() { var p = jstParts(new Date()); return p.year + "-" + p.month + "-" + p.day; }
  function fmtUpdated(iso) {
    var p = jstParts(new Date(iso));
    if (EN) return MON[Number(p.month) - 1] + " " + Number(p.day) + ", " + p.year + " " + p.hour + ":" + p.minute + " (Japan time)";
    return p.year + "年" + Number(p.month) + "月" + Number(p.day) + "日 " + p.hour + ":" + p.minute + "（日本時間）";
  }

  function summarize(data, today) {
    var month = today.slice(0, 7);
    var tests = {
      today: function (d) { return d === today; },
      month: function (d) { return d.slice(0, 7) === month && d <= today; },
      total: function (d) { return d <= today; }
    };
    var out = {};
    Object.keys(tests).forEach(function (k) {
      var ok = tests[k], sales = {}, exps = {}, st = 0, et = 0;
      data.income_categories.forEach(function (c) { sales[c] = 0; });
      data.expense_categories.forEach(function (c) { exps[c] = 0; });
      data.income.forEach(function (r) { if (ok(r.date)) { sales[r.category] = (sales[r.category] || 0) + r.amount; st += r.amount; } });
      data.expenses.forEach(function (r) { if (ok(r.date)) { exps[r.category] = (exps[r.category] || 0) + r.amount; et += r.amount; } });
      out[k] = { sales: sales, salesTotal: st, expenses: exps, expensesTotal: et, profit: st - et };
    });
    return out;
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function render(data) {
    FX = data.fx && data.fx.jpy_per_usd > 0 ? data.fx : null;
    var fxNote = document.getElementById("board-fx");
    if (EN && fxNote) fxNote.textContent = FX
      ? "Amounts are shown in US dollars, converted from Japanese yen at the ECB reference rate (¥" + FX.jpy_per_usd.toLocaleString("en-US") + " = US$1, " + FX.date + "). The records themselves are kept in yen, so dollar figures move a little with the exchange rate."
      : "Amounts are in Japanese yen (JPY).";
    var today = jstToday();
    var s = summarize(data, today);
    var md = Number(today.slice(5, 7)) + "/" + Number(today.slice(8, 10));
    var mname = EN ? MON[Number(today.slice(5, 7)) - 1] : Number(today.slice(5, 7)) + "月";
    document.getElementById("board-updated").textContent = (EN ? "Last updated: " : "最終更新：") + fmtUpdated(data.updated);

    var kpis = document.getElementById("kpis");
    kpis.textContent = "";
    (EN ? [
      ["Sales today", s.today.salesTotal, md + " (Japan time)"],
      ["Sales this month", s.month.salesTotal, mname],
      ["Total sales", s.total.salesTotal, "Since records began"],
      ["Total profit", s.total.profit, "Sales − expenses", "profit"]
    ] : [
      ["今日の売上", s.today.salesTotal, md + "（日本時間）"],
      ["今月の売上", s.month.salesTotal, Number(today.slice(5, 7)) + "月"],
      ["累計の売上", s.total.salesTotal, "記録の開始から"],
      ["累計の利益", s.total.profit, "売上 − 経費", "profit"]
    ]).forEach(function (k) {
      var box = el("div", { "class": "kpi" + (k[3] ? " " + k[3] : "") + (k[3] && k[1] < 0 ? " neg" : "") });
      box.appendChild(el("p", { "class": "kpi-label" }, k[0]));
      box.appendChild(el("p", { "class": "kpi-value" }, yen(k[1])));
      box.appendChild(el("p", { "class": "kpi-sub" }, k[2]));
      kpis.appendChild(box);
    });

    var tb = document.getElementById("board-rows");
    tb.textContent = "";
    var P = ["today", "month", "total"];
    function row(label, vals, cls, labelCls) {
      var tr = el("tr", cls ? { "class": cls } : null);
      tr.appendChild(el("td", labelCls ? { "class": labelCls } : null, label));
      vals.forEach(function (v) { tr.appendChild(el("td", v < 0 ? { "class": "neg-num" } : null, yen(v))); });
      tb.appendChild(tr);
    }
    function group(label) {
      var tr = el("tr", { "class": "group" });
      tr.appendChild(el("th", { colspan: "4", scope: "colgroup" }, label));
      tb.appendChild(tr);
    }
    group(EN ? "Sales (by category)" : "売上（区分ごと）");
    data.income_categories.forEach(function (c) { row(cn(c), P.map(function (p) { return s[p].sales[c] || 0; }), null, "sub"); });
    row(EN ? "Sales total" : "売上 合計", P.map(function (p) { return s[p].salesTotal; }), "total");
    group(EN ? "Expenses" : "経費");
    data.expense_categories.forEach(function (c) { row(cn(c), P.map(function (p) { return s[p].expenses[c] || 0; }), null, "sub"); });
    row(EN ? "Expenses total" : "経費 合計", P.map(function (p) { return s[p].expensesTotal; }), "total");
    row(EN ? "Profit (sales − expenses)" : "利益（売上−経費）", P.map(function (p) { return s[p].profit; }), "profit");
    document.getElementById("th-today").textContent = (EN ? "Today " : "今日 ") + md;
    document.getElementById("th-month").textContent = mname;

    worldPanel(data, s);
  }

  // EQUA WORLD の右上パネル（PCのみ表示）にも同じ数字を出す
  function worldPanel(data, s) {
    var ui = document.getElementById("world-ui");
    if (!ui) return;
    fetch(ui.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (W) {
      var U = W.ui, WW = W.width, WH = W.height;
      var put = function (node, x, y) { node.style.left = (x / WW * 100) + "%"; node.style.top = (y / WH * 100) + "%"; ui.appendChild(node); return node; };
      ui.textContent = "";
      put(el("div", { "class": "wu-title" }, "EQUA 売上ボード"), U.control.title[0] + 8, U.control.title[1] + 3);
      var rows = [
        ["今日の売上", yen(s.today.salesTotal)], ["今月の売上", yen(s.month.salesTotal)], ["累計の売上", yen(s.total.salesTotal)],
        ["累計の経費", yen(s.total.expensesTotal)], ["累計の利益", yen(s.total.profit)], ["更新", fmtShort(data.updated)]
      ];
      rows.forEach(function (r, i) {
        put(el("div", null, r[0]), U.control.x, U.control.rows[i] - 4);
        put(el("div", { "class": "wu-val" }, r[1]), U.control.valueRight, U.control.rows[i] - 4);
      });
      var menu = ["売上ボード", "社員", "ツール", "商品"];
      menu.forEach(function (m, i) { put(el("div", null, m), U.menu.x + 12, U.menu.rows[i] - 4); });
      var plates = { scout: ["Scout", "仕事さがし"], brain: ["EQUA Brain", "考える・覚える"], flow: ["Flow", "やりとり・納品"] };
      U.plates.forEach(function (p) {
        var t = plates[p.id]; if (!t) return;
        var box = el("div", { "class": "wu-clock wu-plate", id: "wu-plate-" + p.id });
        box.style.width = ((p.rect[2] - p.rect[0]) / WW * 100) + "%";
        box.style.height = ((p.rect[3] - p.rect[1]) / WH * 100) + "%";
        box.appendChild(el("span", { "class": "wu-title" }, t[0]));
        box.appendChild(el("span", { "class": "wu-sub" }, t[1]));
        put(box, p.rect[0], p.rect[1]);
      });
      var lists = {
        scout: ["案件をさがす", "提案をととのえる", "ツールを点検", ""],
        brainL: ["知識の整理", "方針の確認", "判断の手伝い", "作業の割り振り"],
        brainR: ["これまでの記録", "ツールの一覧", "安全のルール", "出す前チェック"],
        flow: ["お問い合わせ", "進み具合の連絡", "納品の準備"]
      };
      (U.lists || []).forEach(function (l) {
        (lists[l.id] || []).forEach(function (line, i) { if (line && l.rows[i] != null) put(el("div", { "class": "wu-sub" }, line), l.x + 6, l.rows[i] - 4); });
      });
      var clock = el("div", { "class": "wu-clock" });
      var c = U.clock.rect;
      clock.style.width = ((c[2] - c[0]) / WW * 100) + "%";
      clock.style.height = ((c[3] - c[1]) / WH * 100) + "%";
      var cd = el("span", { "class": "wu-sub" }), ct = el("span", { "class": "wu-title" });
      clock.appendChild(cd); clock.appendChild(ct);
      put(clock, c[0], c[1]);
      var tick = function () {
        var p = jstParts(new Date());
        cd.textContent = Number(p.month) + "月" + Number(p.day) + "日 日本時間";
        ct.textContent = p.hour + ":" + p.minute;
      };
      tick();
      setInterval(tick, 20000);
    }).catch(function () {});
  }
  function fmtShort(iso) { var p = jstParts(new Date(iso)); return Number(p.month) + "/" + Number(p.day) + " " + p.hour + ":" + p.minute; }

  fetch(DATA, { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(render).catch(function () {
    var e = document.getElementById("board-error");
    if (e) e.hidden = false;
  });
})();
