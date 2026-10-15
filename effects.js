// ===== Animated effects for the display screens =====
// The display pages call FFEffects.set(effect, displayElement) whenever the background changes.
// An effect is chosen in backgrounds.js with:   effect: { type: 'slime', color: '#7dff2a' }
//
// Effects available:
//   slime   Slime hangs from the top of the screen, drips, and some drops land on the
//           boxes (question, answers, team scores, X boxes) and slide off.
//           color      main slime color (default green). Pink example: '#ff5fb8'
//           dark       (optional) outline color. Leave out and it is worked out from color.
//           amount     (optional) 0.5 = fewer drips, 2 = lots. Default 1.
//
// To add a brand new kind of effect, add a function to EFFECTS below.

(function () {
  var TARGETS = '.question, .answer-card, .strike-box, .team-score-left, .team-score-right';
  var state = null; // the running effect, or null

  function hexToRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    if (isNaN(n)) return [125, 255, 42];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function startSlime(display, cfg) {
    var rgb = hexToRgb(cfg.color || '#7dff2a');
    var color = 'rgba(' + rgb.join(',') + ',1)';
    var dark = cfg.dark || 'rgb(' + rgb.map(function (v) { return Math.round(v * 0.42); }).join(',') + ')';
    var amount = cfg.amount || 1;

    var cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    display.appendChild(cvs);
    var ctx = cvs.getContext('2d');
    var W = 0, H = 0, U = 1, raf = 0, last = 0, t = 0;
    var drips = [], drops = [], sliders = [], trails = [], bits = [], splats = [];
    var targets = [], targetClock = 0;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = display.clientWidth; H = display.clientHeight; U = H / 1080;
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(3, Math.round(W / (210 * U) * amount));
      while (drips.length < n) drips.push(newDrip(true));
      drips.length = n;
    }

    function refreshTargets() {
      var host = display.getBoundingClientRect();
      var els = display.querySelectorAll(TARGETS);
      targets = [];
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.width < 20 || r.height < 10) continue;
        targets.push({ el: els[i], l: r.left - host.left, r: r.right - host.left, t: r.top - host.top, b: r.bottom - host.top });
      }
    }

    function pickX() {
      // Often aim at a box so drops land on something, otherwise anywhere
      if (targets.length && Math.random() < 0.6) {
        var tg = targets[Math.floor(Math.random() * targets.length)];
        return rnd(tg.l + (tg.r - tg.l) * 0.12, tg.r - (tg.r - tg.l) * 0.12);
      }
      return rnd(W * 0.02, W * 0.98);
    }

    function newDrip(first) {
      return {
        x: first ? rnd(0, W || 1000) : pickX(),
        w: rnd(5, 9.5) * U,
        len: first ? rnd(0, 60) * U : 0,
        max: rnd(100, 300) * U,
        speed: rnd(14, 34) * U,
        mode: 'grow', wait: first ? rnd(0, 5) : rnd(0.2, 2)
      };
    }

    function curtainH(x) {
      return (16 + 9 * Math.sin(x * 0.009 + t * 0.5) + 5 * Math.sin(x * 0.031 - t * 0.8)) * U;
    }

    function spawnDrop(x, y, r, vy, gen) {
      drops.push({ x: x, y: y, r: r, vy: vy || 0, gen: gen || 0, life: 1, ghost: 0 });
    }

    function hit(d, tg) {
      var r = d.r;
      splats.push({ x: d.x, y: tg.t, r: r, age: 0 });
      for (var i = 0; i < 6; i++) {
        var a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
        var sp = rnd(120, 330) * U;
        bits.push({ x: d.x, y: tg.t, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(2, 5) * U, life: 1 });
      }
      sliders.push({
        x: d.x, y: tg.t, v: 22 * U, r: Math.max(r * 1.05, 8 * U), el: tg.el,
        gen: d.gen + 1, pts: [{ y: tg.t, w: r * 0.2 }], bottom: tg.b
      });
    }

    function step(dt) {
      t += dt;
      targetClock -= dt;
      if (targetClock <= 0) { refreshTargets(); targetClock = 0.4; }

      // drips
      drips.forEach(function (p) {
        if (p.mode === 'grow') {
          if (p.wait > 0) { p.wait -= dt; return; }
          p.len += p.speed * dt * (1 + 1.5 * p.len / p.max);
          if (p.len >= p.max) {
            spawnDrop(p.x, curtainH(p.x) + p.len, p.w * 1.05, 40 * U, 0);
            p.mode = 'retract';
          }
        } else {
          p.len -= 520 * U * dt;
          if (p.len <= 0) {
            var nd = newDrip(false);
            for (var k in nd) p[k] = nd[k];
          }
        }
      });

      // falling drops
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        var prevBottom = d.y + d.r;
        d.vy += 1500 * U * dt;
        d.y += d.vy * dt;
        d.ghost += dt;
        var gone = false;
        if (d.gen < 2 && d.ghost > 0.05) {
          for (var j = 0; j < targets.length; j++) {
            var tg = targets[j];
            if (d.x > tg.l + d.r * 0.4 && d.x < tg.r - d.r * 0.4 && prevBottom <= tg.t + 1 && d.y + d.r >= tg.t) {
              hit(d, tg); gone = true; break;
            }
          }
        }
        if (d.gen >= 2) d.life -= dt * 2.2;
        if (gone || d.y - d.r > H || d.life <= 0) drops.splice(i, 1);
      }

      // sliders running down a box
      for (var s = sliders.length - 1; s >= 0; s--) {
        var sl = sliders[s];
        if (sl.el && sl.el.isConnected) {
          var host = display.getBoundingClientRect(), br = sl.el.getBoundingClientRect();
          sl.bottom = br.bottom - host.top;
        }
        sl.v = Math.min(sl.v + 120 * U * dt, 150 * U);
        sl.y += sl.v * dt;
        sl.pts.push({ y: sl.y, w: sl.r * 0.6 });
        if (sl.y >= sl.bottom) {
          spawnDrop(sl.x, sl.bottom + sl.r * 0.2, sl.r * 0.8, sl.v, sl.gen);
          drops[drops.length - 1].ghost = -0.4; // brief grace so it does not hit the box it is leaving
          trails.push({ x: sl.x, pts: sl.pts, a: 1 });
          sliders.splice(s, 1);
        }
      }
      for (var q = trails.length - 1; q >= 0; q--) {
        trails[q].a -= dt * 0.45;
        if (trails[q].a <= 0) trails.splice(q, 1);
      }
      for (var b = bits.length - 1; b >= 0; b--) {
        var bt = bits[b];
        bt.vy += 1700 * U * dt; bt.x += bt.vx * dt; bt.y += bt.vy * dt; bt.life -= dt * 1.4;
        if (bt.life <= 0 || bt.y > H) bits.splice(b, 1);
      }
      for (var sp2 = splats.length - 1; sp2 >= 0; sp2--) {
        splats[sp2].age += dt;
        if (splats[sp2].age > 0.45) splats.splice(sp2, 1);
      }
    }

    function paint(path, alpha) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4.5 * U; ctx.lineJoin = 'round';
      ctx.strokeStyle = dark; ctx.stroke(path);
      ctx.fillStyle = color; ctx.fill(path);
      ctx.globalAlpha = 1;
    }
    function dropShape(path, x, y, r) {
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, Math.PI * 2);
      // pointed tail upward
      path.moveTo(x - r * 0.92, y - r * 0.25);
      path.quadraticCurveTo(x - r * 0.2, y - r * 1.2, x, y - r * 2.4);
      path.quadraticCurveTo(x + r * 0.2, y - r * 1.2, x + r * 0.92, y - r * 0.25);
      path.closePath();
    }
    function shine(x, y, r, alpha) {
      ctx.globalAlpha = 0.38 * alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.28, r * 0.24, r * 0.4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // faded trails
      trails.forEach(function (tr) {
        var p = new Path2D();
        tr.pts.forEach(function (pt) { p.moveTo(tr.x + pt.w, pt.y); p.arc(tr.x, pt.y, pt.w, 0, Math.PI * 2); });
        paint(p, Math.max(0, tr.a) * 0.9);
      });

      // sliders (trail + head)
      sliders.forEach(function (sl) {
        var p = new Path2D();
        sl.pts.forEach(function (pt) { p.moveTo(sl.x + pt.w, pt.y); p.arc(sl.x, pt.y, pt.w, 0, Math.PI * 2); });
        p.moveTo(sl.x + sl.r, sl.y); p.arc(sl.x, sl.y, sl.r, 0, Math.PI * 2);
        paint(p, 0.95);
        shine(sl.x, sl.y, sl.r, 1);
      });

      // splats
      splats.forEach(function (sp) {
        var k = sp.age / 0.45, p = new Path2D();
        var rx = sp.r * (1.2 + 2.4 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5)) * (1 - k * 0.5);
        var ry = sp.r * 0.55 * (1 - k * 0.6);
        p.ellipse(sp.x, sp.y - ry * 0.4, Math.max(rx, 1), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
        paint(p, 1 - k * 0.6);
      });

      // curtain and drips as one shape
      var cp = new Path2D();
      cp.moveTo(-20, -20);
      cp.lineTo(W + 20, -20);
      cp.lineTo(W + 20, curtainH(W + 20));
      for (var x = W + 20; x >= -20; x -= 10) cp.lineTo(x, curtainH(x));
      cp.closePath();
      drips.forEach(function (p) {
        var top = curtainH(p.x) - 4 * U, tip = curtainH(p.x) + p.len, w = p.w;
        if (p.len < 3 * U) return;
        var bulb = w * (1 + 0.35 * Math.min(1, p.len / p.max));
        var neck = top + Math.min(p.len, 70 * U), mid = top + Math.min(p.len * 0.5, 50 * U);
        // drawn clockwise, same direction as the curtain, so overlaps merge instead of cutting holes
        cp.moveTo(p.x + w * 2.2, top);
        cp.quadraticCurveTo(p.x + w * 0.7, mid, p.x + w * 0.62, neck);
        cp.lineTo(p.x + w * 0.62, tip);
        cp.lineTo(p.x - w * 0.62, tip);
        cp.lineTo(p.x - w * 0.62, neck);
        cp.quadraticCurveTo(p.x - w * 0.7, mid, p.x - w * 2.2, top);
        cp.closePath();
        cp.moveTo(p.x + bulb, tip);
        cp.arc(p.x, tip, bulb, 0, Math.PI * 2);
      });
      paint(cp, 1);
      drips.forEach(function (p) {
        if (p.len < 14 * U) return;
        var bulb = p.w * (1 + 0.35 * Math.min(1, p.len / p.max));
        shine(p.x, curtainH(p.x) + p.len, bulb, 1);
      });

      // falling drops
      drops.forEach(function (d) {
        var p = new Path2D();
        dropShape(p, d.x, d.y, d.r);
        paint(p, Math.max(0, Math.min(1, d.life)));
        shine(d.x, d.y, d.r, Math.max(0, d.life));
      });

      // splash bits
      bits.forEach(function (b) {
        var p = new Path2D();
        p.moveTo(b.x + b.r, b.y); p.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        paint(p, Math.max(0, b.life));
      });
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      step(dt); draw();
    }

    resize();
    refreshTargets();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return {
      key: JSON.stringify(cfg),
      stop: function () {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
      }
    };
  }

  var EFFECTS = { slime: startSlime };

  window.FFEffects = {
    // effect: the object from backgrounds.js (or nothing to switch effects off)
    set: function (effect, display) {
      var key = effect ? JSON.stringify(effect) : '';
      if (state && state.key === key) return;
      if (state) { state.stop(); state = null; }
      if (effect && EFFECTS[effect.type]) {
        try { state = EFFECTS[effect.type](display, effect); } catch (e) { state = null; }
      }
    }
  };
})();
