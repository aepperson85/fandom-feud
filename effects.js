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
//         Slime gathers along the top, drips now and then, and only a few drips are aimed at a box.
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
    var AIM = 0.14; // share of drips that are aimed at a box (most just fall behind the boxes)

    // Two layers: slime that hangs and lands on boxes goes in FRONT; ordinary falling drops go BEHIND the boxes
    function makeLayer(z) {
      var c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:' + z + ';';
      return c;
    }
    var backCvs = makeLayer(0), frontCvs = makeLayer(5);
    display.insertBefore(backCvs, display.firstChild);
    display.appendChild(frontCvs);
    var ctxB = backCvs.getContext('2d'), ctxF = frontCvs.getContext('2d');
    var ctx = ctxF;
    var W = 0, H = 0, U = 1, raf = 0, last = 0, t = 0;
    var drips = [], drops = [], sliders = [], trails = [];
    var targets = [], targetClock = 0;
    var STEP = 8, mass = [], cap = [], grow = [], ph = [rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6)];

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = display.clientWidth; H = display.clientHeight; U = H / 1080;
      [backCvs, frontCvs].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      ctxB.setTransform(dpr, 0, 0, dpr, 0, 0); ctxF.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.ceil((W + 60) / STEP) + 2;
      mass = []; cap = []; grow = [];
      for (var i = 0; i < n; i++) {
        cap[i] = Math.max(7, 13 + 16 * (0.5 + 0.5 * Math.sin(i * 0.045 + ph[3])) + 6 * Math.sin(i * 0.13 + ph[4])) * U;
        grow[i] = (0.6 + 0.8 * Math.random());
        mass[i] = cap[i] * rnd(0.25, 0.65);
      }
      var nd = Math.max(2, Math.round(W / (380 * U) * amount));
      while (drips.length < nd) drips.push(newDrip(true));
      drips.length = nd;
    }
    function col(x) { return Math.max(0, Math.min(mass.length - 1.001, (x + 30) / STEP)); }
    function massAt(x) { var c = col(x), i = Math.floor(c), f = c - i; return mass[i] * (1 - f) + mass[i + 1] * f; }
    function capAt(x) { var c = col(x), i = Math.floor(c), f = c - i; return cap[i] * (1 - f) + cap[i + 1] * f; }
    function bump(x, amt) {
      for (var i = 0; i < mass.length; i++) {
        var dx = (i * STEP - 30 - x) / (28 * U);
        mass[i] = Math.max(2 * U, mass[i] - amt * Math.exp(-dx * dx));
      }
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

    // Where a new drip forms: the thickest spot of a few random tries (slime gathers and then drips),
    // or, now and then, above a box on purpose.
    function pickSpot() {
      if (targets.length && Math.random() < AIM) {
        var tg = targets[Math.floor(Math.random() * targets.length)];
        return { x: rnd(tg.l + (tg.r - tg.l) * 0.15, tg.r - (tg.r - tg.l) * 0.15), aimed: true };
      }
      var best = null, bs = -1;
      for (var k = 0; k < 8; k++) {
        var x = rnd(W * 0.015, W * 0.985), s = massAt(x) / capAt(x) + Math.random() * 0.15;
        if (s > bs) { bs = s; best = x; }
      }
      return { x: best, aimed: false };
    }

    function dropSize() {
      var r = Math.random();
      if (r < 0.5) return rnd(2.8, 5.5) * U;
      if (r < 0.85) return rnd(5.5, 9.5) * U;
      return rnd(10, 16) * U;
    }

    function newDrip(first) {
      var sp = pickSpot(), r = dropSize();
      return {
        x: sp.x, aimed: sp.aimed, r: r, w: r / 1.1,
        len: 0, max: (60 + r / U * 14) * U * rnd(0.8, 1.4),
        speed: rnd(8, 20) * U, mode: 'wait', wait: first ? rnd(0, 7) : rnd(1, 6),
        ph: rnd(0, 6.28)
      };
    }

    function curtainH(x) {
      var base = 8 + 5 * Math.sin(x * 0.007 + ph[0] + t * 0.15) + 4 * Math.sin(x * 0.019 + ph[1] - t * 0.25) + 2.5 * Math.sin(x * 0.047 + ph[2] + t * 0.4);
      return base * U + massAt(x);
    }

    function spawnDrop(x, y, r, vy, sticky) {
      var bumps = [];
      for (var i = 0; i < 12; i++) bumps.push(rnd(-0.13, 0.13));
      drops.push({
        x: x, y: y, r: r, vy: vy || 0, sticky: !!sticky, hold: 0, bumps: bumps,
        tail: rnd(1.4, 3.1), lean: rnd(-0.25, 0.25), wob: rnd(0, 6.28)
      });
    }

    function hit(d, tg) {
      var r = Math.max(d.r * 1.05, 8 * U);
      sliders.push({
        x: d.x, y: tg.t, v: 14 * U, tv: 30 * U, retarget: 0, vx: 0, r: r, el: tg.el,
        l: tg.l, rr: tg.r, bottom: tg.b, ph: rnd(0, 6.28), pts: [{ x: d.x, y: tg.t, w: r * 0.25 }], since: 0
      });
    }

    function step(dt) {
      t += dt;
      targetClock -= dt;
      if (targetClock <= 0) { refreshTargets(); targetClock = 0.4; }

      // slime slowly gathers along the top
      for (var m = 0; m < mass.length; m++) {
        if (mass[m] < cap[m]) mass[m] = Math.min(cap[m], mass[m] + 1.3 * U * grow[m] * dt);
      }

      // drips: wait until slime has gathered, then stretch, then let go
      drips.forEach(function (p) {
        if (p.mode === 'wait') {
          p.wait -= dt;
          if (p.wait <= 0 && massAt(p.x) >= capAt(p.x) * 0.55) p.mode = 'grow';
        } else if (p.mode === 'grow') {
          p.len += p.speed * dt * (1 + 1.6 * p.len / p.max);
          bump(p.x, 0.5 * U * p.speed / U * dt * 0.12);
          if (p.len >= p.max) {
            var tipY = curtainH(p.x) + p.len;
            spawnDrop(p.x, tipY, p.r, 30 * U, p.aimed);
            if (Math.random() < 0.4) spawnDrop(p.x + rnd(-2, 2) * U, tipY + rnd(14, 30) * U, Math.max(2 * U, p.r * rnd(0.25, 0.45)), 0, false);
            bump(p.x, 0.45 * capAt(p.x));
            p.mode = 'retract';
          }
        } else {
          p.len -= 480 * U * dt;
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
        var gone = false;
        if (d.sticky) {
          for (var j = 0; j < targets.length; j++) {
            var tg = targets[j];
            if (d.x > tg.l + d.r * 0.4 && d.x < tg.r - d.r * 0.4 && prevBottom <= tg.t + 1 && d.y + d.r >= tg.t) {
              hit(d, tg); gone = true; break;
            }
          }
        }
        if (gone || d.y - d.r * 3 > H) drops.splice(i, 1);
      }

      // slime running down a box: wanders sideways, speeds up, slows down, nearly stops, thickens when slow
      for (var s = sliders.length - 1; s >= 0; s--) {
        var sl = sliders[s];
        if (sl.el && sl.el.isConnected) {
          var host = display.getBoundingClientRect(), br = sl.el.getBoundingClientRect();
          sl.bottom = br.bottom - host.top;
        }
        sl.retarget -= dt;
        if (sl.retarget <= 0) {
          sl.retarget = rnd(0.25, 1.1);
          sl.tv = Math.random() < 0.18 ? rnd(3, 9) * U : rnd(22, 135) * U;
        }
        sl.v += (sl.tv - sl.v) * Math.min(1, dt * 2.2);
        sl.vx += rnd(-1, 1) * 70 * U * dt;
        sl.vx *= Math.max(0, 1 - dt * 1.5);
        sl.vx = Math.max(-12 * U, Math.min(12 * U, sl.vx));
        sl.x = Math.max(sl.l + sl.r, Math.min(sl.rr - sl.r, sl.x + sl.vx * dt));
        sl.y += sl.v * dt;
        sl.since += dt;
        var slow = Math.max(0, 1 - sl.v / (60 * U));
        var wv = sl.r * (0.55 + 0.16 * Math.sin(sl.since * 5 + sl.ph) + 0.1 * Math.sin(sl.since * 13.7 + sl.ph * 2) + 0.3 * slow);
        var lp = sl.pts[sl.pts.length - 1];
        if (Math.abs(sl.y - lp.y) > 1.2 || Math.abs(sl.x - lp.x) > 1.2) sl.pts.push({ x: sl.x, y: sl.y, w: wv });
        sl.head = sl.r * (0.85 + 0.15 * Math.sin(sl.since * 3 + sl.ph) + 0.2 * slow);
        if (sl.y >= sl.bottom) {
          spawnDrop(sl.x, sl.bottom + sl.head * 0.2, sl.head * 0.85, sl.v, false);
          trails.push({ pts: sl.pts, a: 0.85 });
          sliders.splice(s, 1);
        }
      }
      for (var q = trails.length - 1; q >= 0; q--) {
        trails[q].a -= dt * 0.16;
        if (trails[q].a <= 0) trails.splice(q, 1);
      }
    }

    function paint(path, alpha) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4 * U; ctx.lineJoin = 'round';
      ctx.strokeStyle = dark; ctx.stroke(path);
      ctx.fillStyle = color; ctx.fill(path);
      ctx.globalAlpha = 1;
    }
    // Lumpy teardrop that stretches as it speeds up and wobbles a little
    function dropShape(path, d) {
      var N = 14, pts = [], stretch = 1 + Math.min(0.5, d.vy / (U * 2600));
      var cl = Math.cos(d.lean), sn = Math.sin(d.lean);
      for (var k = 0; k < N; k++) {
        var a = (k / N) * Math.PI * 2 - Math.PI / 2;      // start at the top
        var near = Math.abs(a + Math.PI / 2);              // distance from top (a wraps below)
        if (k > N / 2) near = Math.abs(a - 1.5 * Math.PI);
        var rr = d.r * (1 + d.bumps[k % 12] + 0.05 * Math.sin(t * 13 + d.wob + k));
        rr += d.r * d.tail * Math.exp(-(near * near) / 0.22);
        var px = Math.cos(a) * rr, py = Math.sin(a) * rr * stretch;
        pts.push([d.x + px * cl - py * sn, d.y + px * sn + py * cl]);
      }
      var mid = function (i, j) { return [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2]; };
      var m0 = mid(N - 1, 0);
      path.moveTo(m0[0], m0[1]);
      for (var i2 = 0; i2 < N; i2++) {
        var nx = mid(i2, (i2 + 1) % N);
        path.quadraticCurveTo(pts[i2][0], pts[i2][1], nx[0], nx[1]);
      }
      path.closePath();
    }
    function shine(x, y, r, alpha) {
      ctx.globalAlpha = 0.38 * alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.28, r * 0.22, r * 0.38, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    function circlesPath(pts, p) {
      pts.forEach(function (pt) { p.moveTo(pt.x + pt.w, pt.y); p.arc(pt.x, pt.y, pt.w, 0, Math.PI * 2); });
    }

    function dripSegment(cp, p) {
      var base = curtainH(p.x), top = base - 4 * U, tip = base + p.len, w = p.w;
      var sway = Math.sin(t * 0.6 + p.ph) * 3 * U * Math.min(1, p.len / p.max);
      var xs = function (y) { return p.x + sway * Math.min(1, (y - top) / Math.max(1, p.len)); };
      var hw = function (y) {
        var d = y - top;
        return w * (0.56 + 0.15 * Math.sin(d / (20 * U) + p.ph) + 0.07 * Math.sin(d / (7 * U) + p.ph * 2)) + w * 1.9 * Math.exp(-d / (26 * U));
      };
      var bulb = w * (1 + 0.4 * Math.min(1, p.len / p.max));
      var y, stepY = 7 * U;
      cp.moveTo(xs(top) + hw(top), top);
      for (y = top + stepY; y < tip; y += stepY) cp.lineTo(xs(y) + hw(y), y);
      for (y = tip; y > top; y -= stepY) cp.lineTo(xs(y) - hw(y), y);
      cp.closePath();
      cp.moveTo(xs(tip) + bulb, tip);
      cp.arc(xs(tip), tip, bulb, 0, Math.PI * 2);
      p._tipX = xs(tip); p._tipY = tip; p._bulb = bulb;
    }

    function draw() {
      // BACK layer: ordinary falling drops (they fall behind the boxes)
      ctx = ctxB;
      ctx.clearRect(0, 0, W, H);
      drops.forEach(function (d) {
        if (d.sticky) return;
        var p = new Path2D(); dropShape(p, d); paint(p, 1); shine(d.x, d.y, d.r, 1);
      });

      // FRONT layer
      ctx = ctxF;
      ctx.clearRect(0, 0, W, H);
      trails.forEach(function (tr) {
        var p = new Path2D(); circlesPath(tr.pts, p);
        paint(p, Math.max(0, tr.a));
      });
      sliders.forEach(function (sl) {
        var p = new Path2D(); circlesPath(sl.pts, p);
        p.moveTo(sl.x + sl.head, sl.y); p.arc(sl.x, sl.y, sl.head, 0, Math.PI * 2);
        paint(p, 0.97);
        shine(sl.x, sl.y, sl.head, 1);
      });

      var cp = new Path2D();
      cp.moveTo(-STEP * 2, -20);
      cp.lineTo(W + STEP * 2, -20);
      cp.lineTo(W + STEP * 2, curtainH(W + STEP * 2));
      for (var x = W + STEP * 2; x >= -STEP * 2; x -= STEP) cp.lineTo(x, curtainH(x));
      cp.closePath();
      drips.forEach(function (p) {
        if (p.mode === 'wait' || p.len < 2 * U) return;
        dripSegment(cp, p);
      });
      paint(cp, 1);
      drips.forEach(function (p) {
        if (p.mode === 'wait' || p.len < 10 * U || p._tipY === undefined) return;
        shine(p._tipX, p._tipY, p._bulb, 1);
      });

      drops.forEach(function (d) {
        if (!d.sticky) return;
        var p = new Path2D(); dropShape(p, d); paint(p, 1); shine(d.x, d.y, d.r, 1);
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
        [backCvs, frontCvs].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
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
