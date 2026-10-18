/* EQUA WORLD — 静的サイト用の小さな描画（Canvas 2D、外部ライブラリなし）
 * 素材: equa-hq の EQUA WORLD（上段 = HQ の visual slice、下段 = Production Wing。どちらも Founder 承認）。
 * 動きはイメージで、実際の業務状況とは連動しない。
 * <div class="world" data-band="upper|lower"><canvas></canvas></div> を1つずつ描く。 */
(function () {
  "use strict";
  var roots = Array.prototype.slice.call(document.querySelectorAll(".world[data-band]"));
  if (!roots.length) return;
  var BASE = roots[0].getAttribute("data-base") || "assets/world/";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 719px)"); // スマホは各段の crop（world.json）を切り出す。site.css と同じ値
  var cache = {};

  function load(src) {
    if (!cache[src]) {
      cache[src] = new Promise(function (ok, ng) {
        var im = new Image();
        im.onload = function () { ok(im); };
        im.onerror = function () { ng(new Error("load " + src)); };
        im.src = BASE + src;
      });
    }
    return cache[src];
  }

  fetch(BASE + "world.json").then(function (r) { return r.json(); }).then(function (W) {
    roots.forEach(function (root) {
      var band = W.bands[root.getAttribute("data-band")];
      if (!band) return;
      var ids = Object.keys(band.actors);
      var imgs = [load(band.plate), band.glowImg ? load(band.glowImg) : Promise.resolve(null)]
        .concat(band.layers.map(function (l) { return load(l.img); }))
        .concat(ids.map(function (id) { return load("characters/" + band.actors[id].sheet + ".png"); }));
      Promise.all(imgs).then(function (a) {
        start(root, W, band, a[0], a[1], a.slice(2, 2 + band.layers.length), ids, a.slice(2 + band.layers.length));
      }).catch(function (e) { root.classList.add("world-failed"); if (window.console) console.warn(e); });
    });
  }).catch(function (e) {
    roots.forEach(function (r) { r.classList.add("world-failed"); });
    if (window.console) console.warn(e);
  });

  var tables = new WeakMap();
  function frameTable(W, sheet) {
    if (tables.has(sheet)) return tables.get(sheet);
    var FW = W.frame.w, FH = W.frame.h;
    var c = document.createElement("canvas");
    c.width = sheet.width; c.height = sheet.height;
    var g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(sheet, 0, 0);
    var table = {};
    W.views.forEach(function (view, vi) {
      table[view] = {};
      Object.keys(W.frames).forEach(function (anim) {
        var row = vi * W.anims.length + W.anims.indexOf(anim);
        var list = [];
        for (var f = 0; f < W.frames[anim]; f++) {
          if ((row + 1) * FH > sheet.height) break;
          var d = g.getImageData(f * FW, row * FH, FW, FH).data, any = false;
          for (var k = 3; k < d.length; k += 4) if (d[k] > 8) { any = true; break; }
          if (!any) break; // 空のコマは使わない（IDLE に戻す）
          list.push([f * FW, row * FH]);
        }
        table[view][anim] = list;
      });
    });
    tables.set(sheet, table);
    return table;
  }

  function start(root, W, band, plate, glow, occImgs, ids, sheets) {
    var canvas = root.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var FW = W.frame.w, FH = W.frame.h;
    var SPEED = 26; // 論理px / 秒
    var chars = ids.map(function (id, i) {
      var a = band.actors[id];
      var steps = a.steps.map(function (s) {
        var walkMs = 0, segs = [];
        if (s.walk) {
          for (var k = 1; k < s.walk.length; k++) {
            var p = s.walk[k - 1], q = s.walk[k];
            var ms = (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1])) / SPEED * 1000;
            segs.push({ a: p, b: q, ms: ms });
            walkMs += ms;
          }
        }
        return { s: s, segs: segs, walkMs: walkMs, ms: walkMs + s.ms };
      });
      return { id: id, sheet: sheets[i], frames: frameTable(W, sheets[i]), steps: steps, offset: a.offset || 0,
        total: steps.reduce(function (n, st) { return n + st.ms; }, 0) };
    });
    var occs = [];
    band.layers.forEach(function (l, li) { l.occluders.forEach(function (o) { occs.push({ o: o, img: occImgs[li] }); }); });

    function facingOf(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
      return dy < 0 ? "up" : "down";
    }
    function stateAt(c, t) {
      var tt = (t + c.offset) % c.total;
      for (var i = 0; i < c.steps.length; i++) {
        var st = c.steps[i];
        if (tt < st.ms) {
          if (tt < st.walkMs) {
            for (var k = 0; k < st.segs.length; k++) {
              var g = st.segs[k];
              if (tt < g.ms) {
                var p = g.ms ? tt / g.ms : 1;
                return { x: g.a[0] + (g.b[0] - g.a[0]) * p, y: g.a[1] + (g.b[1] - g.a[1]) * p,
                  anim: "WALK", facing: facingOf(g.b[0] - g.a[0], g.b[1] - g.a[1]), el: tt };
              }
              tt -= g.ms;
            }
          }
          return { x: st.s.at[0], y: st.s.at[1], anim: st.s.anim, facing: st.s.face, el: tt - st.walkMs };
        }
        tt -= st.ms;
      }
      var last = c.steps[c.steps.length - 1].s;
      return { x: last.at[0], y: last.at[1], anim: "IDLE", facing: last.face, el: 0 };
    }
    function framesFor(c, view, anim) {
      var f = c.frames[view][anim];
      if (f && f.length) return f;
      f = c.frames[view].IDLE;
      if (f && f.length) return f;
      return c.frames.down.IDLE;
    }
    function drawChar(c, s) {
      var view = s.facing === "left" || s.facing === "right" ? "side" : s.facing;
      var list = framesFor(c, view, s.anim);
      var fr = list[Math.floor(s.el * (W.fps[s.anim] || 4) / 1000) % list.length];
      var x = Math.round(s.x), y = Math.round(s.y);
      ctx.save();
      if (s.facing === "left") { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      ctx.drawImage(c.sheet, fr[0], fr[1], FW, FH, x - FW / 2, y + 1 - FH, FW, FH);
      ctx.restore();
    }
    function glowAlpha(kind, i, t, working) {
      var s = t / 1000;
      switch (kind) {
        case "brain": return 0.32 + 0.14 * Math.sin(s * 1.1);
        case "gate": return 0.22 + 0.10 * Math.sin(s * 0.9 + 1);
        case "monitor": return working ? 0.30 + 0.10 * ((Math.floor(s * 3) + i) % 2) : 0.12;
        default: return 0.20 + 0.06 * Math.sin(s * 1.6 + i * 1.7);
      }
    }

    var cropX = 0;
    function layout() {
      var crop = [0, W.width]; // スマホでも切り出さない
      cropX = crop[0];
      canvas.width = crop[1] - crop[0];
      canvas.height = W.height;
    }
    layout();
    var last = 0;
    if (narrow.addEventListener) narrow.addEventListener("change", function () { layout(); draw(last); });

    function blit(img, r) { ctx.drawImage(img, r[0], r[1], r[2] - r[0], r[3] - r[1], r[0], r[1], r[2] - r[0], r[3] - r[1]); }

    function draw(t) {
      last = t;
      ctx.setTransform(1, 0, 0, 1, -cropX, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(plate, 0, 0);
      var states = chars.map(function (c) { return { c: c, s: stateAt(c, t) }; });
      if (glow && band.glow.length) {
        var working = states.some(function (o) { return o.c.id === "scout" && o.s.anim === "WORK"; });
        ctx.globalCompositeOperation = "lighter";
        band.glow.forEach(function (g, i) {
          ctx.globalAlpha = Math.max(0, Math.min(1, glowAlpha(g.kind, i, t, working)));
          blit(glow, g.rect);
        });
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      // 名札パネルの文字は、キャラクターの頭が重なる間は薄くする（顔を隠さない）
      if (root.getAttribute("data-band") === "upper") {
        (W.ui.plates || []).forEach(function (p) {
          var node = document.getElementById("wu-plate-" + p.id);
          if (!node) return;
          var r = p.rect, hit = states.some(function (o) {
            return o.s.x + 10 > r[0] && o.s.x - 10 < r[2] && o.s.y - 44 < r[3] && o.s.y - 20 > r[1];
          });
          node.style.opacity = hit ? "0.15" : "1";
        });
      }
      // 足元の y と、遮るもの（植木・柱・机）の基準線で手前・奥を並べる
      var list = states.map(function (o) { return { y: o.s.y, char: o }; })
        .concat(occs.map(function (e) { return { y: e.o.baseline - 0.5, occ: e }; }));
      list.sort(function (a, b) { return a.y - b.y; });
      list.forEach(function (e) {
        if (e.char) drawChar(e.char.c, e.char.s);
        else blit(e.occ.img, e.occ.o.rect);
      });
    }

    root.classList.add("world-ready");
    if (reduce) { draw(4000); return; }
    var t0 = null, visible = true;
    function loop(now) {
      if (t0 === null) t0 = now;
      if (visible && !document.hidden) draw(now - t0);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    }
  }
})();
