/* ------------------------------------------------------------------
   The Resolve — one continuous particle system for the whole page.

   The hero is the v1/v2 Resolve, unchanged in spirit: square cells
   scattered over the warm white page (knots plus strays, the reading
   column kept clear), a pointer lens that snaps nearby cells to the
   grid and lights up the fragments of mess, and a scroll that resolves
   the scatter into the RMgX Design Studio symbol.

   From there the same pool of cells carries the story down the page:

     • one fixed canvas, one particle pool, never recreated on scroll
     • formations are point sets sampled from SVG silhouettes, ordered
       along a Hilbert curve, so particle i sits in the same region of
       every shape — a morph is a short, local, coordinated move, never
       a burst across the screen
     • neighbouring formations morph with a gentle staggered flow;
       far-apart ones hand over quietly (fade out, then resolve again)
     • the canvas also paints the page's light / dark chapters, with
       soft gradients between them, so the cells always sit on the
       right ground and the text above stays readable
------------------------------------------------------------------- */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Brand palette (plus v1's warm white for the light chapters)
  const COL = {
    warm: [241, 238, 231],     // v1 paper — the light chapters
    navy: [5, 17, 25],         // Dark Blue — the dark chapters
    ink: [25, 31, 39],         // Neutral Black — the mess on light
    mist: [218, 231, 240],     // Light Blue
    violet: [84, 62, 250],     // Design Studio Purple
    violetDeep: [59, 39, 217],
    violetLift: [124, 106, 255],
    blue: [9, 159, 250]        // RMgX Blue
  };
  const BG = { light: COL.warm, dark: COL.navy };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

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
  const gauss = r => (r() + r() + r() + r() - 2) / 2;

  /* ------------------------------------------------------------------
     Shapes. Each is a viewBox plus parts; a part is a filled path
     (evenodd) or a stroked path with a line width. Tones colour the
     sampled points: 'grad' runs RMgX Blue → Design Studio Purple across
     the shape (the logo's own gradient), 'dot' is purple, 'accent' is
     the one detail that carries the meaning.
  ------------------------------------------------------------------ */
  const SHAPES = {
    // RMgX Design Studio symbol — read from the inline sprite (one source of truth)
    logo: () => {
      const els = document.querySelectorAll('#rds-symbol path[data-part]');
      return {
        vb: [80, 47, 950, 575],
        parts: Array.from(els).map(p => ({ d: p.getAttribute('d'), tone: p.dataset.part === 'chevron' ? 'grad' : 'dot' }))
      };
    },
    // AI Product Design — an interface coming together
    design: () => ({
      vb: [0, 0, 120, 92],
      parts: [
        { d: 'M6 6H114V86H6Z', stroke: 4, tone: 'grad' },
        { d: 'M6 6H114V18H6Z', tone: 'grad' },
        { d: 'M14 26H36V78H14Z', tone: 'grad' },
        { d: 'M44 26H72V50H44Z', tone: 'grad' },
        { d: 'M78 26H106V50H78Z', tone: 'grad' },
        { d: 'M44 58H106V63H44Z', tone: 'grad' },
        { d: 'M44 70H90V75H44Z', tone: 'grad' },
        { d: 'M92 30L94.5 36L100 38.5L94.5 41L92 47L89.5 41L84 38.5L89.5 36Z', tone: 'accent' }
      ]
    }),
    // AI Audit — inspection: a lens with a verified mark
    audit: () => ({
      vb: [0, 0, 100, 100],
      parts: [
        { d: 'M14 42A28 28 0 1 0 70 42A28 28 0 1 0 14 42Z', stroke: 8, tone: 'grad' },
        { d: 'M63 63L90 90', stroke: 11, tone: 'grad' },
        { d: 'M29 43L38 52L56 33', stroke: 6, tone: 'accent' }
      ]
    }),
    // AI Strategy — direction: a chosen route, the option not taken, and the destination
    strategy: () => ({
      vb: [0, 0, 120, 92],
      parts: [
        { d: 'M12 80C40 80 40 48 64 48S88 22 102 16', stroke: 6, tone: 'grad' },
        { d: 'M12 80C50 88 78 74 104 64', stroke: 2.5, tone: 'grad' },
        { d: 'M4 80A8 8 0 1 0 20 80A8 8 0 1 0 4 80Z', tone: 'dot' },
        { d: 'M57 48A7 7 0 1 0 71 48A7 7 0 1 0 57 48Z', tone: 'dot' },
        { d: 'M116 8L94 10L110 28Z', tone: 'accent' }
      ]
    }),
    // AI Business Upgrade — upward transformation
    upgrade: () => ({
      vb: [0, 0, 100, 100],
      parts: [
        { d: 'M8 72H22V92H8Z', tone: 'grad' },
        { d: 'M29 60H43V92H29Z', tone: 'grad' },
        { d: 'M50 46H64V92H50Z', tone: 'grad' },
        { d: 'M71 30H85V92H71Z', tone: 'grad' },
        { d: 'M8 54L34 38L52 44L82 14', stroke: 5, tone: 'accent' },
        { d: 'M94 4L74 8L90 24Z', tone: 'accent' }
      ]
    }),
    // How we build — one continuous line from discovery to optimisation
    process: () => ({
      vb: [0, 0, 200, 24],
      parts: [
        { d: 'M2 12C26 2 50 22 74 12S124 2 148 12S186 22 198 12', stroke: 2.4, tone: 'grad' },
        ...[17, 50, 83, 117, 150, 183].map(x => ({ d: `M${x - 4} 12A4 4 0 1 0 ${x + 4} 12A4 4 0 1 0 ${x - 4} 12Z`, tone: 'accent' }))
      ]
    })
  };

  const probe = document.createElement('canvas').getContext('2d');
  probe.lineCap = 'round'; probe.lineJoin = 'round';

  /* Sample a shape on a regular grid so that it yields roughly `want` points.
     Points are in normalised box space (u 0..1, v 0..aspect). */
  function sampleShape(shape, want) {
    const [vx, vy, vw, vh] = shape.vb;
    const parts = shape.parts.map(p => ({ ...p, path: new Path2D(p.d) }));
    const inside = (x, y) => {
      for (const p of parts) {
        if (p.stroke) { probe.lineWidth = p.stroke; if (probe.isPointInStroke(p.path, x, y)) return p; }
        else if (probe.isPointInPath(p.path, x, y, 'evenodd')) return p;
      }
      return null;
    };
    let hits = 0; const C = 80;
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) if (inside(vx + (i + 0.5) * vw / C, vy + (j + 0.5) * vh / C)) hits++;
    const area = (hits / (C * C)) * vw * vh;
    const step = Math.sqrt(area / want);
    const pts = [];
    for (let y = vy + step / 2; y < vy + vh; y += step) {
      for (let x = vx + step / 2; x < vx + vw; x += step) {
        const p = inside(x, y);
        if (p) pts.push({ u: (x - vx) / vw, v: (y - vy) / vw, tone: p.tone });
      }
    }
    return { pts, aspect: vh / vw, step: step / vw };
  }

  /* Hilbert index of (x, y) on an n × n grid: nearby points get nearby indices */
  function hilbert(n, x, y) {
    let d = 0;
    for (let s = n >> 1; s > 0; s >>= 1) {
      const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) {
        if (rx === 1) { x = n - 1 - x; y = n - 1 - y; }
        const t = x; x = y; y = t;
      }
    }
    return d;
  }

  function colourFor(pt, tone) {
    const t = clamp((pt.u + pt.v) / 1.4, 0, 1);
    if (tone === 'light') {
      if (pt.tone === 'dot') return COL.violet;
      if (pt.tone === 'accent') return COL.violetDeep;
      return mix(COL.blue, COL.violet, t);
    }
    if (pt.tone === 'dot') return COL.violetLift;
    if (pt.tone === 'accent') return COL.mist;
    return mix(COL.blue, COL.violetLift, t);
  }

  /* A formation: every particle gets a point. Points are ordered along a
     Hilbert curve and particle i maps to point ⌊i·n/N⌋, so particle i lives
     in the same part of every shape. Where a shape has fewer points than
     particles, the extra particles share a neighbour's point, invisibly. */
  function buildFormation(key, N, share, tone) {
    const s = sampleShape(SHAPES[key](), Math.max(24, Math.round(N * share)));
    let pts = s.pts.slice(0, N);
    const H = 256;
    for (const p of pts) {
      p.h = hilbert(H, Math.floor(clamp(p.u, 0, 0.999) * H), Math.floor(clamp(p.v / s.aspect, 0, 0.999) * H));
      p.col = colourFor(p, tone);
    }
    pts.sort((a, b) => a.h - b.h);
    const n = pts.length, map = new Int32Array(N), primary = new Uint8Array(N);
    let prev = -1;
    for (let i = 0; i < N; i++) { const k = Math.min(n - 1, Math.floor(i * n / N)); map[i] = k; primary[i] = k !== prev ? 1 : 0; prev = k; }
    return { pts, map, primary, aspect: s.aspect, step: s.step, tone };
  }

  // Fragments of the mess, shown in the hero; the lens brings them into focus
  const FRAGMENTS = ['legacy ERP', '14 user roles', 'edge case #212', 'who approves this?', 'API rate limit', '3 dashboards', 'hallucinations?', 'offline mode', 'model drift', 'pending…', 'why?', 'audit trail', 'drop-off at step 4', 'too many clicks', 'compliance', 'final_v2_FINAL', 'data from 6 systems', 'prompt v14'];

  // the reading column (lower left on desktop, bottom on mobile) stays mostly clear
  const inCopy = (x, y, w, h, mobile) => mobile ? y > h * 0.5 : (x < w * 0.56 && y > h * 0.2);

  /* ------------------------------------------------------------------
     The field
  ------------------------------------------------------------------ */
  class ParticleField {
    /**
     * @param canvas  fixed full-viewport canvas
     * @param slots   [{ el, shape, tone, share?, anchor? }] page elements that host formations
     * @param opts    { stage, heroProgress(), bands: [elements with data-tone / data-shift] }
     */
    constructor(canvas, slots, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.slots = slots;
      this.opts = opts;
      this.bands = opts.bands || [];
      this.pointer = null;
      this.lens = 0;
      this.introStart = null;
      this.parts = [];
      this.frags = [];
      this.F = 1400;
      this.t0 = performance.now();
      this.tick = this.tick.bind(this);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.run(); });
      this.run();
    }

    start() { if (this.introStart == null) this.introStart = performance.now(); }
    run() { if (!this.running) { this.running = true; this.lastT = 0; requestAnimationFrame(this.tick); } }
    setPointer(x, y) {
      this.pointer = x == null ? null : { x, y };
      this.lastMove = performance.now();
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      // mobile URL bars change the height a little while scrolling: ignore that
      if (w === this.w && Math.abs(h - this.h) < 120) return;
      this.w = w; this.h = h;
      this.mobile = w < 720;
      this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.N = this.mobile ? 560 : 950;
      this.forms = this.slots.map(s => buildFormation(s.shape, this.N, s.share || 0.78, s.tone || 'dark'));
      this.layoutChaos();
    }

    /* The hero scatter, as in v1: a few dense knots plus strays, in stage space */
    layoutChaos() {
      const { w, h, N, mobile } = this;
      const r = rng(11);
      this.R = mobile ? 110 : 170;
      // the lens grid matches the cell size of the logo
      const hero = this.slots[0];
      const hb = hero.el.getBoundingClientRect();
      const bw = Math.min(hb.width, hb.height / this.forms[0].aspect) || w * 0.4;
      this.g = Math.max(6, this.forms[0].step * bw);
      const knots = Array.from({ length: 6 }, () => [r() * w, (0.1 + r() * 0.8) * h, (0.05 + r() * 0.12) * Math.max(w, h)]);
      const old = this.parts;
      this.parts = [];
      for (let i = 0; i < N; i++) {
        let cx, cy;
        if (r() < 0.62) { const k = knots[Math.floor(r() * knots.length)]; cx = k[0] + gauss(r) * k[2]; cy = k[1] + gauss(r) * k[2] * 0.7; }
        else { cx = r() * w; cy = r() * h; }
        if (inCopy(cx, cy, w, h, mobile) && r() < 0.86) { cx = mobile ? r() * w : w * (0.56 + r() * 0.44); cy = mobile ? r() * h * 0.5 : cy; }
        cx = clamp(cx, 4, w - 4); cy = clamp(cy, 4, h - 4);
        const hot = r() < 0.09;
        const p = {
          cx, cy,
          rot0: (r() - 0.5) * 1.6,
          s0: this.g * (0.3 + r() * 0.7),
          hollow: r() < 0.22,
          a0: 0.4 + r() * 0.4,
          chaosCol: hot ? COL.blue : COL.ink,
          ease: 0.1 + r() * 0.08,
          lag: r(), arc: 0.6 + r() * 0.4,
          ph: r() * Math.PI * 2, drift: 2 + r() * 4,
          ux: r(), uy: r(),
          seed: [(r() - 0.5) * w * 0.5, (r() - 0.5) * h * 0.6],
          lens: 0
        };
        const prev = old[i];
        if (prev) Object.assign(p, { x: prev.x, y: prev.y, s: prev.s, r: prev.r, a: prev.a, col: prev.col, ord: prev.ord });
        else Object.assign(p, { x: cx + p.seed[0], y: cy + p.seed[1], s: p.s0, r: p.rot0 * 3, a: 0, col: p.chaosCol, ord: 0 });
        this.parts.push(p);
      }
      this.frags = FRAGMENTS.slice(0, mobile ? 8 : FRAGMENTS.length).map(text => ({
        text,
        x: (mobile ? 0.04 + r() * 0.7 : 0.44 + r() * 0.5) * w,
        y: (mobile ? 0.1 + r() * 0.3 : 0.12 + r() * 0.6) * h,
        rot: (r() - 0.5) * 0.5, lens: 0, hot: r() < 0.3
      }));
    }

    /* Where each slot's formation sits on screen right now ("contain" fit) */
    measure() {
      return this.slots.map((s, i) => {
        const r = s.el.getBoundingClientRect();
        const f = this.forms[i];
        const bw = Math.min(r.width, r.height / f.aspect);
        const a = s.anchor ? s.anchor.getBoundingClientRect() : r;
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, bw, bh: bw * f.aspect, ay: a.top + a.height / 2, f };
      });
    }

    /* Formation-space → screen for particle i in box b, written into `out` */
    formPos(b, i, t, cosA, sinA, ph, reduced, out) {
      const f = b.f, q = f.pts[f.map[i]];
      const lx = (q.u - 0.5) * b.bw, ly = (q.v - f.aspect / 2) * b.bw;
      const rz = lx * sinA, fs = this.F / (this.F + rz);
      const wob = reduced ? 0 : 0.5;
      out.x = b.cx + lx * cosA * fs + Math.sin(t * 1.1 + ph) * wob;
      out.y = b.cy + ly * fs + Math.cos(t * 0.9 + ph) * wob;
      out.s = Math.max(1.6, f.step * b.bw * 0.78) * fs;
      out.a = f.primary[i] ? 0.94 : 0;
      out.col = q.col;
      out.r = 0; out.ord = 1;
      return out;
    }

    tick(now) {
      if (document.hidden) { this.running = false; return; }
      const reduced = RM.matches;
      const dt = this.lastT ? clamp((now - this.lastT) / 16.7, 0.25, 4) : 1;
      this.lastT = now;
      const t = (now - this.t0) / 1000;
      const { w, h } = this;
      const mid = h / 2;
      const intro = this.introStart == null ? 0 : reduced ? 1 : clamp((now - this.introStart) / 1400, 0, 1);
      const hp = this.opts.heroProgress ? this.opts.heroProgress() : 1;
      const stage = this.opts.stage ? this.opts.stage.getBoundingClientRect() : { left: 0, top: 0 };
      const ox = stage.left, oy = stage.top;

      // lens strength: on while the pointer moves, fades when idle or once resolved
      const pt = this.pointer;
      const idle = pt ? now - this.lastMove : 1e9;
      const want = pt && idle < 2600 && !reduced ? 1 - smooth(0.25, 0.6, hp) : 0;
      this.lens += (want - this.lens) * (1 - Math.pow(0.92, dt));
      const L = this.lens, R = this.R, g = this.g;

      /* Choreography: A is the formation we are leaving, B the one we are heading to */
      const boxes = this.measure();
      const last = boxes.length - 1;
      let iA = 0, iB = 0, k = 0;
      if (mid >= boxes[last].ay) { iA = iB = last; }
      else if (mid > boxes[0].ay) {
        for (let j = 0; j < last; j++) {
          if (boxes[j].ay <= mid && mid < boxes[j + 1].ay) { iA = j; iB = j + 1; k = (mid - boxes[j].ay) / (boxes[j + 1].ay - boxes[j].ay); break; }
        }
      }
      let A = boxes[iA], B = boxes[iB];
      const near = (B.ay - A.ay) / h < 1.9;
      const dA = (mid - A.ay) / h, dB = (B.ay - mid) / h;
      // keep a morph on screen: the outgoing shape waits in the upper third,
      // the incoming one is met in the lower third, so nothing leaves and comes back
      if (near && iA !== iB) {
        A = Object.assign({}, A, { cy: Math.max(A.cy, h * 0.34) });
        B = Object.assign({}, B, { cy: Math.min(B.cy, h * 0.66) });
      }
      // the morph happens in the middle of the gap, so each symbol holds beside its copy
      const K = reduced ? smooth(0.2, 0.8, k) : smooth(0.14, 0.86, k);
      // direction of travel, for the stagger (leading edge moves first) and the gentle arc
      let ux = B.cx - A.cx, uy = B.cy - A.cy;
      const dist = Math.hypot(ux, uy) || 1; ux /= dist; uy /= dist;
      const arcAmp = Math.min(dist * 0.05, 60);
      // formations breathe a little once settled
      const sway = reduced ? 0 : Math.sin(t * 0.3) * 0.1;
      const cosA = Math.cos(sway), sinA = Math.sin(sway);
      const heroIn = oy + h > 0;

      const PA = this._pa || (this._pa = {}), PB = this._pb || (this._pb = {}), PH = this._ph || (this._ph = {});
      for (let i = 0; i < this.parts.length; i++) {
        const p = this.parts[i];

        // A: the hero's chaos → logo resolve, or a plain formation
        const posA = iA === 0 ? this.heroPos(p, i, A, t, cosA, sinA, hp, intro, ox, oy, pt, L, R, g, reduced, heroIn, PH, PA)
          : this.formPos(A, i, t, cosA, sinA, p.ph, reduced, PA);

        let tx, ty, ts, ta, tr, tord, tcol;
        if (iA === iB) {
          ({ x: tx, y: ty, s: ts, a: ta, r: tr, ord: tord, col: tcol } = posA);
        } else if (near) {
          const posB = this.formPos(B, i, t, cosA, sinA, p.ph, reduced, PB);
          // leading edge first: how far forward this particle sits along the direction of travel
          const front = clamp(((posA.x - A.cx) * ux + (posA.y - A.cy) * uy) / (A.bw * 0.6 + 1), -1, 1);
          const lag = (1 - front) * 0.35 + p.lag * 0.3;          // 0 … 1
          const W = reduced ? 0 : 0.14;                           // a short, gentle stagger
          const kk = easeInOut(smooth(lag * W, lag * W + 1 - W, K));
          const bend = Math.sin(Math.PI * kk) * arcAmp * p.arc;  // one shared, gentle curve
          tx = lerp(posA.x, posB.x, kk) - uy * bend;
          ty = lerp(posA.y, posB.y, kk) + ux * bend;
          ts = lerp(posA.s, posB.s, kk);
          ta = lerp(posA.a, posB.a, kk);
          tr = posA.r * (1 - kk);
          tord = lerp(posA.ord, 1, kk);
          tcol = mix(posA.col, posB.col, kk);
        } else if (dA < dB) {
          // far apart: the formation leaves with its section and fades out quietly
          ({ x: tx, y: ty, s: ts, r: tr, ord: tord, col: tcol } = posA);
          ta = posA.a * (1 - smooth(0.35, 0.75, dA));
        } else {
          // …and the next one resolves from a local scatter as its section arrives
          const posB = this.formPos(B, i, t, cosA, sinA, p.ph, reduced, PB);
          const conv = easeInOut(1 - smooth(0.08, 0.7, dB - p.lag * 0.06));
          const drift = reduced ? 0 : p.drift;
          const sx = B.cx + (p.ux - 0.5) * B.bw * 1.25 + Math.sin(t * 0.4 + p.ph) * drift;
          const sy = B.cy + (p.uy - 0.5) * B.bh * 1.7 + Math.cos(t * 0.33 + p.ph) * drift;
          tx = lerp(sx, posB.x, conv); ty = lerp(sy, posB.y, conv);
          tord = conv;
          ts = lerp(p.s0 * 0.8, posB.s, conv);
          tr = p.rot0 * (1 - conv);
          ta = lerp(p.a0 * 0.8, posB.a, conv) * (1 - smooth(0.55, 0.95, dB));
          tcol = mix(B.f.tone === 'light' ? p.chaosCol : COL.mist, posB.col, conv);
        }

        // ease toward the target (frame-rate independent); hidden particles jump
        if (ta < 0.01 && p.a < 0.02) { p.x = tx; p.y = ty; }
        else {
          const e = reduced ? 1 : 1 - Math.pow(1 - (iA === 0 ? p.ease : p.ease + 0.08), dt);
          p.x += (tx - p.x) * e; p.y += (ty - p.y) * e;
        }
        const e2 = reduced ? 1 : 1 - Math.pow(0.84, dt);
        p.s += (ts - p.s) * e2; p.a += (ta - p.a) * e2; p.r += (tr - p.r) * e2; p.ord += (tord - p.ord) * e2;
        p.col = tcol;
      }

      this.draw(hp, intro, ox, oy, heroIn, reduced);
      requestAnimationFrame(this.tick);
    }

    /* The hero, as in v1: scattered cells, a lens that snaps them to the grid,
       and a scroll (hp) that resolves them into the symbol */
    heroPos(p, i, b, t, cosA, sinA, hp, intro, ox, oy, pt, L, R, g, reduced, heroIn, PH, out) {
      const logo = this.formPos(b, i, t, cosA, sinA, p.ph, reduced, PH);
      // ambient movement: a slow drift around each cell's place
      const dr = reduced ? 0 : p.drift;
      const cx = p.cx + Math.sin(t * 0.35 + p.ph) * dr, cy = p.cy + Math.cos(t * 0.29 + p.ph * 1.3) * dr;
      // lens: cells near the pointer snap to the grid where they are
      let lensT = 0;
      if (pt && L > 0.01 && heroIn) lensT = smooth(R, R * 0.3, Math.hypot(ox + cx - pt.x, oy + cy - pt.y)) * L;
      p.lens += (lensT - p.lens) * 0.2;
      const lo = p.lens;
      const gx = Math.round(cx / g) * g + g / 2, gy = Math.round(cy / g) * g + g / 2;
      const lx = ox + lerp(cx, gx, lo), ly = oy + lerp(cy, gy, lo);
      // scroll: staggered resolve into the symbol
      const P = easeInOut(smooth(p.lag * 0.3, p.lag * 0.3 + 0.7, hp));
      const order = Math.max(lo, P);
      out.x = lerp(lx, logo.x, P);
      out.y = lerp(ly, logo.y, P);
      out.s = lerp(p.s0, logo.s, order);
      out.r = p.rot0 * (1 - order);
      out.ord = order;
      out.col = mix(p.chaosCol, logo.col, order);
      out.a = lerp(lerp(p.a0, 1, lo), logo.a, P) * intro;
      return out;
    }

    draw(hp, intro, ox, oy, heroIn, reduced) {
      const { ctx, dpr, w, h } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1 — the page's light / dark chapters
      ctx.fillStyle = `rgb(${BG.light})`;
      ctx.fillRect(0, 0, w, h);
      for (const el of this.bands) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h || !r.height) continue;
        const top = Math.max(r.top, -1), bot = Math.min(r.bottom, h + 1);
        if (el.dataset.shift) {
          const a = BG[el.dataset.from], b = BG[el.dataset.to];
          const grd = ctx.createLinearGradient(0, r.top, 0, r.bottom);
          for (let s = 0; s <= 8; s++) { const u = s / 8, m = smooth(0, 1, u); grd.addColorStop(u, `rgb(${mix(a, b, m).map(Math.round)})`); }
          ctx.fillStyle = grd;
        } else ctx.fillStyle = `rgb(${BG[el.dataset.tone] || BG.light})`;
        ctx.fillRect(0, top, w, bot - top);
      }

      // 2 — the lens ring (hero only)
      const pt = this.pointer;
      if (pt && this.lens > 0.05 && heroIn && !reduced) {
        const R = this.R * 0.62;
        ctx.strokeStyle = `rgba(84,62,250,${0.45 * this.lens})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pt.x - 6, pt.y); ctx.lineTo(pt.x + 6, pt.y); ctx.moveTo(pt.x, pt.y - 6); ctx.lineTo(pt.x, pt.y + 6); ctx.stroke();
      }

      // 3 — the cells: squares, hollow while they are still part of the mess
      for (const p of this.parts) {
        if (p.a < 0.01 || p.y < -20 || p.y > h + 20) continue;
        const c = p.col, s = p.s;
        const style = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.min(1, p.a).toFixed(3)})`;
        const hollow = p.hollow && p.ord < 0.5;
        if (Math.abs(p.r) < 0.02) {
          if (hollow) { ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.strokeRect(p.x - s / 2 + 0.5, p.y - s / 2 + 0.5, s - 1, s - 1); }
          else { ctx.fillStyle = style; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
        } else {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.r);
          if (hollow) { ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.strokeRect(-s / 2, -s / 2, s, s); }
          else { ctx.fillStyle = style; ctx.fillRect(-s / 2, -s / 2, s, s); }
          ctx.restore();
        }
      }

      // 4 — fragments of the mess (hero only); the lens highlights the ones near the pointer
      const fade = clamp(1 - hp * 2.2, 0, 1) * intro;
      if (fade > 0 && heroIn && this.frags.length) {
        const R = this.R;
        ctx.font = `500 ${this.mobile ? 11 : 12}px "Open Sauce One", system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        for (const f of this.frags) {
          const fx = ox + f.x, fy = oy + f.y;
          let lt = 0;
          if (pt && this.lens > 0.01) lt = smooth(R * 1.1, R * 0.3, Math.hypot(fx - pt.x, fy - pt.y)) * this.lens;
          f.lens += (lt - f.lens) * 0.2;
          ctx.save();
          ctx.translate(fx, fy); ctx.rotate(f.rot * (1 - f.lens));
          const tw = ctx.measureText(f.text).width;
          if (f.lens > 0.05) {
            ctx.fillStyle = `rgba(84,62,250,${0.95 * f.lens * fade})`;
            ctx.fillRect(-6, -9, tw + 12, 18);
          }
          const base = f.hot ? COL.blue : COL.ink;
          const col = mix(base, [255, 255, 255], f.lens).map(Math.round);
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.75 + 0.25 * f.lens) * fade})`;
          ctx.fillText(f.text, 0, 0);
          ctx.restore();
        }
      }
    }

    /* The colour of the page at a given screen y (used for the header) */
    toneAt(y) {
      for (const el of this.bands) {
        const r = el.getBoundingClientRect();
        if (y >= r.top && y < r.bottom) return el.dataset.shift ? (y - r.top < r.height / 2 ? el.dataset.from : el.dataset.to) : el.dataset.tone;
      }
      return 'light';
    }
  }

  window.Resolve = { ParticleField, reducedMotion: RM };
})();
