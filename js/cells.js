/* ------------------------------------------------------------------
   The Resolve — the studio's signature motif.
   A field of small cells (the "pixels" from the RMgX mark) that move
   from scattered noise to an exact grid. Used three times on the page:
   hero (scroll + pointer), capabilities (by stage), contact (on arrival).
------------------------------------------------------------------- */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COL = {
    ink: [18, 18, 22],
    paper: [241, 238, 231],
    violet: [91, 69, 242],
    violetLight: [150, 136, 255],
    verm: [255, 91, 46]
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Seeded random so layouts are stable between resizes
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return (r() + r() + r() + r() - 2) / 2; }

  /* Chevron from the RMgX mark, normalised to a 1 x 1 box. */
  const CHEVRON = [[0.0, 0.0], [0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 1.0], [0.5, 0.5]];
  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  /* ---------------- Base field: canvas, sizing, loop ---------------- */
  class Field {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cells = [];
      this.visible = false;
      this.running = false;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.tick = this.tick.bind(this);
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible) this.wake();
      }, { rootMargin: '100px' }).observe(canvas);
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (Math.abs(r.width - this.w) < 1 && Math.abs(r.height - this.h) < 1) return;
      this.w = r.width; this.h = r.height;
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.layout();
      this.snapAll();
      this.wake();
    }
    update() {}
    snapAll() { for (const c of this.cells) Object.assign(c, { x: c.tx, y: c.ty, s: c.ts, r: c.tr, a: c.ta, k: c.tk }); }
    wake() { if (!this.running && this.visible) { this.running = true; this.lastT = 0; requestAnimationFrame(this.tick); } }
    tick(now) {
      if (!this.visible) { this.running = false; return; }
      this.update(now);
      const moving = this.step();
      this.draw();
      if (moving || this.keepAlive) requestAnimationFrame(this.tick);
      else this.running = false;
    }
    /* Ease every cell toward its target. Returns whether anything is still moving. */
    step() {
      const instant = RM.matches;
      let moving = false;
      const now = performance.now();
      // frame-rate independent easing: a slow frame moves further
      const dt = clamp((now - (this.lastT || now - 16.7)), 1, 250) / 16.7;
      this.lastT = now;
      for (const c of this.cells) {
        if (c.delayUntil && now < c.delayUntil) { moving = true; continue; }
        const f = instant ? 1 : 1 - Math.pow(1 - (c.ease || 0.14), dt);
        c.x += (c.tx - c.x) * f; c.y += (c.ty - c.y) * f;
        c.s += (c.ts - c.s) * f; c.r += (c.tr - c.r) * f;
        c.a += (c.ta - c.a) * f; c.k += (c.tk - c.k) * f;
        if (Math.abs(c.tx - c.x) > 0.15 || Math.abs(c.ty - c.y) > 0.15 || Math.abs(c.ta - c.a) > 0.01 || Math.abs(c.tk - c.k) > 0.01) moving = true;
      }
      return moving;
    }
    color(c) {
      // k: 0 = chaos colour, 1 = order colour
      const a = c.from, b = c.to, k = c.k;
      return `rgba(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))},${c.a.toFixed(3)})`;
    }
    draw() {
      const { ctx, dpr } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawUnder && this.drawUnder(ctx);
      for (const c of this.cells) {
        if (c.a < 0.01) continue;
        const col = this.color(c);
        const hollow = c.hollow && c.k < 0.5;
        const s = c.s;
        if (Math.abs(c.r) < 0.01) {
          if (hollow) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(c.x - s / 2 + 0.5, c.y - s / 2 + 0.5, s - 1, s - 1); }
          else { ctx.fillStyle = col; ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s); }
        } else {
          ctx.save();
          ctx.translate(c.x, c.y); ctx.rotate(c.r);
          if (hollow) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(-s / 2, -s / 2, s, s); }
          else { ctx.fillStyle = col; ctx.fillRect(-s / 2, -s / 2, s, s); }
          ctx.restore();
        }
      }
      this.drawOver && this.drawOver(ctx);
    }
  }

  function inCopy(x, y, w, h, mobile) { return mobile ? y > h * 0.42 : (x < w * 0.42 && y > h * 0.3); }

  function cell(props) {
    return Object.assign({ x: 0, y: 0, s: 6, r: 0, a: 1, k: 0, tx: 0, ty: 0, ts: 6, tr: 0, ta: 1, tk: 0, from: COL.ink, to: COL.violet }, props);
  }

  /* ---------------- Hero + Contact: chaos → chevron ---------------- */
  const FRAGMENTS = ['legacy ERP', '14 user roles', 'edge case #212', 'who approves this?', 'API rate limit', '3 dashboards', 'consent?', 'offline mode', 'carrier rates', 'pending…', 'why?', 'audit trail', 'drop-off at step 4', 'too many clicks', 'compliance', 'final_v2_FINAL', 'Excel export', 'notifications', 'data from 6 systems', 'admin view'];

  class Resolve extends Field {
    constructor(canvas, opts) {
      super(canvas);
      this.opts = Object.assign({ seed: 7, dark: false, fragments: true, place: 'right' }, opts);
      this.p = 0;            // global order 0..1 (scroll)
      this.pointer = null;   // {x,y} in canvas space
      this.lens = 0;         // lens strength (fades when idle)
      this.introStart = performance.now();
      this.frags = [];
      this.keepAlive = true; // runs through the intro, then sleeps until scroll/pointer
      this.resize();
    }
    layout() {
      const { w, h } = this;
      const r = rng(this.opts.seed);
      const mobile = w < 720;
      const g = this.g = Math.round(clamp(w / 105, 8, 15));
      this.R = mobile ? 110 : 170;

      // Chevron box
      let bw, bx, by;
      if (this.opts.place === 'right') {
        bw = mobile ? Math.min(w * 0.62, h * 0.36) : Math.min(w * 0.36, h * 0.66);
        bx = mobile ? w - bw - w * 0.06 : w * 0.6;
        by = mobile ? h * 0.15 : (h - bw) / 2 + h * 0.02;
      } else { // contact: big and to the right, partially off canvas
        bw = mobile ? w * 0.7 : Math.min(w * 0.42, h * 0.8);
        bx = mobile ? w * 0.36 : w - bw - w * 0.04;
        by = mobile ? h * 0.06 : (h - bw) / 2;
      }
      // snap box to grid
      bx = Math.round(bx / g) * g; by = Math.round(by / g) * g; bw = Math.round(bw / g) * g;

      const targets = [];
      for (let y = 0; y < bw; y += g) for (let x = 0; x < bw; x += g) {
        if (inPoly((x + g / 2) / bw, (y + g / 2) / bw, CHEVRON)) targets.push([bx + x + g / 2, by + y + g / 2]);
      }
      // The three loose pixels from the RMgX mark, sitting left of the chevron
      const lp = [[-2.6, 0.30], [-1.7, 0.62], [-3.4, 0.5]];
      const loose = lp.map(([gx, fy]) => [bx + gx * g * 1.6, Math.round((by + fy * bw) / g) * g + g / 2]);

      // Chaos: a few dense knots plus scattered strays
      const knots = Array.from({ length: 6 }, () => [r() * w, (0.1 + r() * 0.8) * h, (0.05 + r() * 0.12) * Math.max(w, h)]);
      const extra = Math.round(targets.length * 0.28);
      const total = targets.length + loose.length + extra;
      const dark = this.opts.dark;
      const chaosCol = dark ? COL.paper : COL.ink;
      const orderCol = dark ? COL.violetLight : COL.violet;

      const old = this.cells;
      this.cells = [];
      for (let i = 0; i < total; i++) {
        let cx, cy;
        if (r() < 0.62) { const k = knots[Math.floor(r() * knots.length)]; cx = k[0] + gauss(r) * k[2]; cy = k[1] + gauss(r) * k[2] * 0.7; }
        else { cx = r() * w; cy = r() * h; }
        // keep the reading column (lower left on desktop, bottom on mobile) mostly clear
        if (this.opts.place === 'right' && inCopy(cx, cy, w, h, mobile) && r() < 0.8) { cx = mobile ? r() * w : w * (0.45 + r() * 0.55); cy = mobile ? r() * h * 0.5 : cy; }
        cx = clamp(cx, 4, w - 4); cy = clamp(cy, 4, h - 4);
        const isTarget = i < targets.length;
        const isLoose = !isTarget && i < targets.length + loose.length;
        const t = isTarget ? targets[i] : isLoose ? loose[i - targets.length] : null;
        const hot = r() < 0.11;
        const c = cell({
          cx, cy, t,
          rot0: (r() - 0.5) * 1.6,
          s0: g * (0.25 + r() * 0.75),
          hollow: r() < 0.22,
          a0: dark ? 0.35 + r() * 0.5 : 0.55 + r() * 0.45,
          from: hot ? COL.verm : chaosCol,
          to: t ? orderCol : (dark ? COL.paper : COL.ink),
          stray: !t,
          lens: 0,
          ease: 0.1 + r() * 0.08,
          seedStart: [cx + (r() - 0.5) * w * 0.5, cy + (r() - 0.5) * h * 0.6]
        });
        // start position (intro)
        const prev = old[i];
        if (prev) { c.x = prev.x; c.y = prev.y; c.s = prev.s; c.r = prev.r; c.a = prev.a; c.k = prev.k; }
        else { c.x = c.seedStart[0]; c.y = c.seedStart[1]; c.s = c.s0; c.r = c.rot0 * 3; c.a = 0; c.k = 0; }
        this.cells.push(c);
      }
      // Fragments of the mess, as text
      this.frags = [];
      if (this.opts.fragments) {
        const n = mobile ? 8 : FRAGMENTS.length;
        for (let i = 0; i < n; i++) {
          this.frags.push({ text: FRAGMENTS[i], x: (mobile ? 0.04 + r() * 0.7 : 0.44 + r() * 0.5) * w, y: (mobile ? 0.12 + r() * 0.36 : 0.12 + r() * 0.78) * h, rot: (r() - 0.5) * 0.5, lens: 0, hot: r() < 0.3 });
        }
      }
      this.updateTargets();
    }
    snapAll() { /* keep intro animation; positions carry over on resize */ this.updateTargets(); }
    setProgress(p) { if (Math.abs(p - this.p) > 0.0005) { this.p = p; this.updateTargets(); this.wake(); } }
    setPointer(x, y) { this.pointer = x == null ? null : { x, y }; this.lastMove = performance.now(); this.keepAlive = true; this.wake(); }
    update(now) {
      // intro fade-in
      const intro = clamp((now - this.introStart) / 1400, 0, 1);
      this.intro = RM.matches ? 1 : intro;
      // lens strength fades if pointer idles for a while
      const idle = this.pointer ? (now - this.lastMove) : 1e9;
      const want = this.pointer && idle < 2600 ? 1 : 0;
      this.lens += (want - this.lens) * 0.08;
      if (!this.pointer && this.lens < 0.01 && intro >= 1) this.keepAlive = false;
      this.updateTargets();
    }
    updateTargets() {
      const g = this.g, P = easeInOut(this.p), R = this.R, pt = this.pointer, L = this.lens;
      const intro = this.intro == null ? 0 : this.intro;
      for (const c of this.cells) {
        // local lens: cells near the pointer snap to the grid where they are
        let lensT = 0;
        if (pt && L > 0.01) {
          const d = Math.hypot(c.cx - pt.x, c.cy - pt.y);
          lensT = smooth(R, R * 0.3, d) * L;
        }
        c.lens += (lensT - c.lens) * 0.2;
        const lo = c.lens;
        const sx = Math.round(c.cx / g) * g + (g / 2), sy = Math.round(c.cy / g) * g + (g / 2);
        const lx = lerp(c.cx, sx, lo), ly = lerp(c.cy, sy, lo);
        const order = Math.max(lo, P);
        if (c.t) {
          // stagger: cells further from target arrive slightly later
          c.tx = lerp(lx, c.t[0], P); c.ty = lerp(ly, c.t[1], P);
          c.ts = lerp(c.s0, g * 0.66, order);
          c.tr = c.rot0 * (1 - order);
          c.tk = order;
          c.ta = lerp(c.a0, 1, order) * intro;
        } else {
          // strays settle onto the grid and fade back to quiet registration marks
          c.tx = lerp(lx, sx, P); c.ty = lerp(ly, sy, P);
          c.ts = lerp(c.s0, g * 0.18, P);
          c.tr = c.rot0 * (1 - order);
          c.tk = lo;
          c.ta = lerp(c.a0, 0.25, P) * intro;
        }
      }
    }
    drawUnder(ctx) {
      // lens ring: a thin crosshair that shows the focus area
      if (this.pointer && this.lens > 0.05 && !RM.matches) {
        const { x, y } = this.pointer, R = this.R * 0.62;
        ctx.strokeStyle = this.opts.dark ? `rgba(150,136,255,${0.5 * this.lens})` : `rgba(91,69,242,${0.45 * this.lens})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
      }
    }
    drawOver(ctx) {
      if (!this.frags.length) return;
      const P = this.p, pt = this.pointer, R = this.R;
      const fade = clamp(1 - P * 2.2, 0, 1) * (this.intro || 0);
      if (fade <= 0) return;
      ctx.font = `500 ${this.w < 720 ? 10 : 11}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      for (const f of this.frags) {
        let lt = 0;
        if (pt && this.lens > 0.01) lt = smooth(R * 1.1, R * 0.3, Math.hypot(f.x - pt.x, f.y - pt.y)) * this.lens;
        f.lens += (lt - f.lens) * 0.2;
        const rot = f.rot * (1 - f.lens);
        ctx.save();
        ctx.translate(f.x, f.y); ctx.rotate(rot);
        const tw = ctx.measureText(f.text).width;
        if (f.lens > 0.05) {
          ctx.fillStyle = `rgba(91,69,242,${0.95 * f.lens * fade})`;
          ctx.fillRect(-6, -9, tw + 12, 18);
        }
        const base = f.hot ? COL.verm : (this.opts.dark ? COL.paper : COL.ink);
        const col = [lerp(base[0], 255, f.lens), lerp(base[1], 255, f.lens), lerp(base[2], 255, f.lens)].map(Math.round);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.75 + 0.25 * f.lens) * fade})`;
        if (f.lens < 0.5 && !f.hot) { ctx.strokeStyle = `rgba(${col},${0.3 * fade})`; }
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      }
    }
  }

  /* ---------------- Capabilities specimen: five states ---------------- */
  class Specimen extends Field {
    constructor(canvas) {
      super(canvas);
      this.stage = 0;
      this.resize();
    }
    layout() {
      const r = rng(21);
      const N = 168;
      if (!this.cells.length) {
        for (let i = 0; i < N; i++) {
          this.cells.push(cell({ rnd: [r(), r(), r(), r(), r()], from: COL.ink, to: COL.violet }));
        }
      }
      this.applyStage(this.stage, true);
    }
    setStage(i) { this.stage = i; this.applyStage(i, false); this.wake(); }
    applyStage(stage, instant) {
      const { w, h } = this, cells = this.cells, N = cells.length;
      const g = Math.max(8, Math.round(Math.min(w, h) / 30));
      this.g = g;
      const pad = g * 2;
      const W = w - pad * 2, H = h - pad * 2;
      const now = performance.now();
      const spots = this.spots(stage, W, H, g, N);
      cells.forEach((c, i) => {
        const s = spots[i];
        c.tx = pad + s.x; c.ty = pad + s.y;
        c.ts = s.s; c.tr = s.r || 0; c.ta = s.a == null ? 1 : s.a; c.tk = s.k == null ? 1 : s.k;
        c.hollow = !!s.hollow;
        c.from = s.from || COL.ink;
        c.to = s.to || COL.violet;
        c.ease = 0.12;
        c.delayUntil = instant || RM.matches ? 0 : now + (c.rnd[4] * 260);
      });
      if (instant) this.snapAll();
      this.annot = stage;
    }
    /* Returns N target "spots" for a stage */
    spots(stage, W, H, g, N) {
      const out = [];
      const grid = (x, y) => ({ x: Math.round(x / g) * g, y: Math.round(y / g) * g });
      if (stage === 0) { // Discover: scattered signals
        this.cells.forEach(c => {
          const [a, b, d, e] = c.rnd;
          out.push({ x: a * W, y: b * H, s: g * (0.25 + d * 0.7), r: (e - 0.5) * 1.6, k: 0, a: 0.4 + d * 0.6, hollow: e < 0.3, from: e > 0.88 ? COL.verm : COL.ink });
        });
      } else if (stage === 1) { // Define: three affinity groups
        const centers = [[W * 0.2, H * 0.5], [W * 0.52, H * 0.42], [W * 0.82, H * 0.56]];
        this.cells.forEach((c, i) => {
          const [a, b, d] = c.rnd;
          const k = i % 3, ang = a * Math.PI * 2, rad = Math.sqrt(b) * Math.min(W, H) * 0.2;
          const p = grid(centers[k][0] + Math.cos(ang) * rad, centers[k][1] + Math.sin(ang) * rad);
          out.push({ x: p.x, y: p.y, s: g * 0.55, r: (d - 0.5) * 0.25, k: 0.35 + k * 0.2, a: 0.9, from: k === 0 ? COL.verm : COL.ink });
        });
      } else { // Design / Prove / Ship: an interface emerges
        // A coarser grid so each cell reads as one interface unit
        const gu = this.gu = Math.max(g, Math.floor(Math.min(W / 16, H / 13)));
        const C = Math.floor(W / gu), R = Math.floor(H / gu);
        const cw = Math.floor((C - 5) / 2);
        // Interface blocks in grid units: [x, y, w, h, role]
        const blocks = [
          [0, 0, C, 1, 'bar'],
          [0, 2, 3, R - 2, 'side'],
          [4, 2, cw, 4, 'card'],
          [5 + cw, 2, C - 5 - cw, 4, 'card'],
          [4, 7, C - 4, R - 9, 'table'],
          [C - 4, R - 1, 4, 1, 'cta']
        ];
        const pts = [];
        blocks.forEach(([bx, by, bw, bh, role]) => {
          if (stage === 2) { // outlines only — wireframe
            for (let x = bx; x < bx + bw; x++) { pts.push([x, by, role]); if (bh > 1) pts.push([x, by + bh - 1, role]); }
            for (let y = by + 1; y < by + bh - 1; y++) { pts.push([bx, y, role]); if (bw > 1) pts.push([bx + bw - 1, y, role]); }
          } else {
            for (let y = by; y < by + bh; y++) {
              if (role === 'table' && (y - by) % 2 === 1) continue; // striped list rows
              for (let x = bx; x < bx + bw; x++) pts.push([x, y, role]);
            }
          }
        });
        this.cells.forEach((c, i) => {
          const visible = i < pts.length;
          const p = pts[visible ? i : Math.floor(c.rnd[0] * pts.length)];
          const role = p[2];
          const j = stage === 3 ? (c.rnd[1] - 0.5) * gu * 0.14 : 0;
          out.push({
            x: p[0] * gu + gu / 2 + j, y: p[1] * gu + gu / 2 + j,
            s: stage === 4 ? gu * 0.84 : stage === 3 ? gu * (0.66 + c.rnd[2] * 0.12) : gu * 0.28,
            r: 0, k: 1, a: visible ? 1 : 0,
            from: COL.ink,
            to: role === 'cta' ? COL.verm : role === 'bar' || role === 'side' ? COL.ink : COL.violet
          });
        });
        this.blocks = blocks;
      }
      return out;
    }
    drawUnder(ctx) {
      // faint baseline grid, stronger as the stage advances
      const g = this.g, pad = g * 2;
      const alpha = [0, 0.04, 0.07, 0.07, 0.12][this.stage];
      if (!alpha) return;
      ctx.fillStyle = `rgba(18,18,22,${alpha})`;
      for (let y = pad; y < this.h - pad; y += g) for (let x = pad; x < this.w - pad; x += g) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }
    drawOver(ctx) {
      if (this.stage < 3 || !this.blocks) return;
      const g = this.gu, pad = this.g * 2;
      if (this.stage === 3) {
        // a cursor heading for the call to action
        const b = this.blocks[5];
        const x = pad + (b[0] + b[2] * 0.6) * g, y = pad + (b[1] + b[3]) * g + 2;
        ctx.fillStyle = '#121216';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.lineTo(x + 4.5, y + 12); ctx.lineTo(x + 11, y + 12); ctx.closePath(); ctx.fill();
      }
      if (this.stage === 4) {
        // redlines: dimension markers
        ctx.strokeStyle = 'rgba(255,91,46,.9)'; ctx.fillStyle = 'rgba(255,91,46,1)';
        ctx.lineWidth = 1;
        ctx.font = '500 10px "JetBrains Mono", monospace';
        const b = this.blocks[2];
        const x0 = pad + b[0] * g, x1 = pad + (b[0] + b[2]) * g, y = pad + (b[1] * g) - g * 0.6;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x0, y - 4); ctx.lineTo(x0, y + 4); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillText(`${b[2]} col`, (x0 + x1) / 2, y - 6); ctx.textAlign = 'start';
        const sb = this.blocks[1];
        const sx = pad + sb[0] * g - this.g * 0.9, sy0 = pad + sb[1] * g, sy1 = pad + (sb[1] + sb[3]) * g;
        ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx, sy1); ctx.moveTo(sx - 4, sy0); ctx.lineTo(sx + 4, sy0); ctx.moveTo(sx - 4, sy1); ctx.lineTo(sx + 4, sy1); ctx.stroke();
        ctx.save(); ctx.translate(sx - 5, (sy0 + sy1) / 2 + 16); ctx.rotate(-Math.PI / 2); ctx.fillText('fill', 0, 0); ctx.restore();
      }
    }
  }

  window.Resolve = { Resolve, Specimen, reducedMotion: RM };
})();
