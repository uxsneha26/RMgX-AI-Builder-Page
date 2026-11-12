(function () {
  'use strict';

  const D = window.STUDIO_DATA;
  const { Resolve, Specimen, reducedMotion: RM } = window.Resolve;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------
     Jumbled words — letters out of order until you look closer
  ------------------------------------------------------------ */
  function jumble(el, seed) {
    const text = el.textContent;
    el.textContent = '';
    let s = seed;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const letters = [...text].map((ch, i) => {
      const sp = document.createElement('span');
      sp.className = 'ch';
      sp.setAttribute('aria-hidden', 'true');
      sp.textContent = ch;
      sp.style.setProperty('--dx', ((r() - 0.5) * 0.16).toFixed(3));
      sp.style.setProperty('--dy', ((r() - 0.5) * 0.2).toFixed(3));
      sp.style.setProperty('--rot', ((r() - 0.5) * 26).toFixed(1));
      sp.style.setProperty('--w', (r()).toFixed(2));
      sp.style.setProperty('--wt', Math.round((r() - 0.6) * 500));
      sp.style.setProperty('--hot', i % 4 === 1 && r() > 0.3 ? 1 : 0);
      el.appendChild(sp);
      return sp;
    });
    const state = { base: 1, local: letters.map(() => 0) };
    const apply = () => letters.forEach((sp, i) => sp.style.setProperty('--j', (state.base * (1 - state.local[i])).toFixed(3)));
    // pointer: letters near the cursor straighten
    if (hover.matches) {
      window.addEventListener('pointermove', e => {
        const rr = el.getBoundingClientRect();
        if (e.clientY < rr.top - 140 || e.clientY > rr.bottom + 140) {
          if (state.local.some(v => v)) { state.local.fill(0); apply(); }
          return;
        }
        letters.forEach((sp, i) => {
          const b = sp.getBoundingClientRect();
          const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
          state.local[i] = clamp(1 - (d - 40) / 180, 0, 1);
        });
        apply();
      }, { passive: true });
    }
    apply();
    return { set(v) { state.base = v; apply(); } };
  }

  /* ------------------------------------------------------------
     Projects + archive
  ------------------------------------------------------------ */
  const projWrap = $('[data-projects]');
  projWrap.innerHTML = D.projects.map((p, i) => `
    <article class="proj proj--${p.layout} proj--${p.fit}" style="--plate:${p.plate};--plate-ink:${p.plateInk}" data-proj="${i}">
      <button class="proj__hit" type="button" data-open="${i}" aria-label="Open ${esc(p.name)} project sheet">
        <span class="proj__plate">
          <span class="proj__idx mono">${String(i + 1).padStart(2, '0')} / ${String(D.projects.length).padStart(2, '0')}</span>
          ${p.award ? '<span class="proj__badge mono">Winner · IBDA 2024</span>' : ''}
          <img class="proj__img" src="${p.image}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async">
          <span class="proj__sector mono">${esc(p.sector)}</span>
          <span class="proj__open" aria-hidden="true">Open</span>
        </span>
      </button>
      <div class="proj__meta">
        <h3 class="proj__name"><button type="button" data-open="${i}">${esc(p.name)}</button></h3>
        <span class="proj__years mono">${esc(p.engagement)}</span>
        <p class="proj__line">${esc(p.line)}</p>
        <p class="proj__outcome"><b>${esc(p.outcome)}</b><span>${esc(p.outcomeNote)}</span></p>
      </div>
    </article>`).join('');

  const archive = $('[data-archive]');
  archive.innerHTML = D.archive.map(a => {
    const inner = `<img class="arch__thumb" src="${a.img}" alt="" loading="lazy"><span class="arch__name">${esc(a.name)}</span><span class="arch__what">${esc(a.what)}</span><span class="arch__tag mono">${esc(a.tag)}</span>`;
    return `<li>${a.link
      ? `<a class="arch" href="${a.link}" target="_blank" rel="noopener" data-peek-src="${a.img}">${inner}</a>`
      : `<div class="arch" data-peek-src="${a.img}">${inner}</div>`}</li>`;
  }).join('');

  // Cursor-following preview for the archive
  const peek = $('[data-peek]'), peekImg = $('[data-peek-img]');
  if (hover.matches) {
    let px = 0, py = 0, cx = 0, cy = 0, raf = 0, on = false;
    const loop = () => {
      cx += (px - cx) * 0.18; cy += (py - cy) * 0.18;
      peek.style.transform = `translate(${cx + 24}px, ${cy - 120}px)`;
      if (on || Math.abs(px - cx) > 0.5) raf = requestAnimationFrame(loop); else raf = 0;
    };
    archive.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    archive.addEventListener('pointerover', e => {
      const row = e.target.closest('[data-peek-src]');
      if (!row) return;
      if (peekImg.getAttribute('src') !== row.dataset.peekSrc) peekImg.src = row.dataset.peekSrc;
      if (!on) { cx = e.clientX; cy = e.clientY; }
      on = true; peek.classList.add('is-on');
    });
    archive.addEventListener('pointerleave', () => { on = false; peek.classList.remove('is-on'); });
  }

  /* ------------------------------------------------------------
     Drawer (project sheet)
  ------------------------------------------------------------ */
  const drawer = $('[data-drawer]'), dBody = $('[data-drawer-body]'), dSheet = $('.drawer__sheet');
  let lastFocus = null, drawerIndex = 0;
  function renderDrawer(i) {
    const p = D.projects[i];
    drawerIndex = i;
    const list = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
    const prev = D.projects[(i - 1 + D.projects.length) % D.projects.length];
    const next = D.projects[(i + 1) % D.projects.length];
    dBody.innerHTML = `
      <div class="drawer__plate ${p.fit === 'shot' ? 'is-shot' : ''}" style="--plate:${p.plate};--plate-ink:${p.plateInk}">
        <img src="${p.image}" alt="${esc(p.imageAlt)}">
      </div>
      <div class="drawer__kicker mono"><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(p.sector)}</span><span>${esc(p.years)}</span><span>${esc(p.engagement)}</span></div>
      <h2 id="drawer-title">${esc(p.name)}</h2>
      <p class="drawer__line">${esc(p.line)}</p>
      <div class="drawer__grid">
        <div><h3>The knot</h3><ul>${list(p.challenge)}</ul></div>
        <div><h3>How we untied it</h3><ul>${list(p.solution)}</ul></div>
      </div>
      <div class="drawer__impact"><h3>What changed</h3><ul>${list(p.impact)}</ul></div>
      <div class="drawer__foot">
        <span class="drawer__src mono">Source: ${esc(p.source)}</span>
        ${p.link ? `<a class="link-cta" href="${p.link}" target="_blank" rel="noopener">Full case study</a>` : ''}
      </div>
      <div class="drawer__foot drawer__nav">
        <button class="link-quiet" type="button" data-drawer-go="${(i - 1 + D.projects.length) % D.projects.length}">← ${esc(prev.name)}</button>
        <button class="link-quiet" type="button" data-drawer-go="${(i + 1) % D.projects.length}">${esc(next.name)} →</button>
      </div>`;
    dSheet.scrollTop = 0;
  }
  function openDrawer(i) {
    lastFocus = document.activeElement;
    renderDrawer(i);
    drawer.hidden = false;
    document.body.classList.add('is-locked');
    void drawer.offsetWidth; // commit the closed state so the transition runs
    drawer.classList.add('is-open');
    dSheet.focus({ preventScroll: true });
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { drawer.hidden = true; }, RM.matches ? 0 : 700);
    lastFocus && lastFocus.focus({ preventScroll: true });
  }
  projWrap.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openDrawer(+b.dataset.open); });
  drawer.addEventListener('click', e => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
    const go = e.target.closest('[data-drawer-go]');
    if (go) renderDrawer(+go.dataset.drawerGo);
  });

  /* ------------------------------------------------------------
     Menu
  ------------------------------------------------------------ */
  const menu = $('[data-menu]'), openBtn = $('[data-menu-open]'), note = $('[data-menu-note]');
  const defaultNote = note.textContent;
  function openMenu() {
    menu.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    void menu.offsetWidth;
    menu.classList.add('is-open');
    setTimeout(() => $('.menu__nav a', menu).focus({ preventScroll: true }), RM.matches ? 0 : 450);
  }
  function closeMenu(then) {
    menu.classList.add('is-closing');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    setTimeout(() => {
      menu.classList.remove('is-open', 'is-closing');
      menu.hidden = true;
      note.textContent = defaultNote;
      then ? then() : openBtn.focus({ preventScroll: true });
    }, RM.matches ? 0 : 900);
  }
  openBtn.addEventListener('click', openMenu);
  $('[data-menu-close]').addEventListener('click', () => closeMenu());
  // The menu art: the Design Studio symbol (white on navy, per the brand combos).
  // Built from the sprite's own paths; the four dots drift in and settle as the menu opens.
  (function buildMenuArt() {
    const drift = [['-40%', '-30%', '-35deg'], ['-10%', '-55%', '40deg'], ['-55%', '25%', '25deg'], ['-20%', '50%', '-30deg']];
    let d = 0;
    const parts = $$('#rds-symbol path[data-part]').map(p => {
      const isDot = p.dataset.part === 'dot';
      const style = isDot ? ` style="--fx:${drift[d][0]};--fy:${drift[d][1]};--fr:${drift[d][2]};--i:${d++}"` : '';
      return `<path class="part-${p.dataset.part}" fill-rule="evenodd" d="${p.getAttribute('d')}"${style}/>`;
    });
    $('[data-menu-art]').innerHTML = `<svg viewBox="80 47 950 575">${parts.join('')}</svg>`;
  })();
  $$('.menu__nav a').forEach(a => {
    const show = () => { note.textContent = a.dataset.note; };
    a.addEventListener('pointerenter', show);
    a.addEventListener('focus', show);
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = $(a.getAttribute('href'));
      closeMenu(() => { target.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); });
    });
  });

  // Escape + focus trap for menu and drawer
  document.addEventListener('keydown', e => {
    const layer = !menu.hidden ? menu : !drawer.hidden ? drawer : null;
    if (!layer) return;
    if (e.key === 'Escape') { layer === menu ? closeMenu() : closeDrawer(); return; }
    if (e.key === 'Tab') {
      const f = $$('a[href], button:not([disabled]), [tabindex="0"]', layer).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------
     Hero: the resolve
  ------------------------------------------------------------ */
  const hero = $('[data-hero]');
  const heroField = new Resolve($('[data-cells="hero"]'), { seed: 11, place: 'right' });
  const heroWord = jumble($('[data-jumble]'), 7);
  const resNum = $('[data-resolution-num]'), resBar = $('[data-resolution-bar]'), resWrap = $('[data-resolution]');
  const stage = $('.hero__stage');

  function pointerTo(field, el) {
    const move = e => {
      const r = el.getBoundingClientRect();
      field.setPointer(e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', move, { passive: true });
    el.addEventListener('pointerleave', () => field.setPointer(null));
  }
  pointerTo(heroField, stage);

  /* ------------------------------------------------------------
     Approach: the thread straightens
  ------------------------------------------------------------ */
  const threadPath = $('[data-thread]');
  const THREAD_N = 140;
  const tangle = (() => {
    // A deterministic scribble: loops that drift left to right
    const pts = [];
    let s = 3;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const loops = [[150, 70, 60], [330, 130, 70], [520, 80, 55], [690, 150, 45], [820, 90, 30]];
    for (let i = 0; i < THREAD_N; i++) {
      const t = i / (THREAD_N - 1);
      const x = t * 1200;
      let y = 110 + Math.sin(t * 19) * 46 * (1 - t) + (r() - 0.5) * 18 * (1 - t);
      let dx = 0;
      loops.forEach(([lx, ly, rad]) => {
        const d = (x - lx) / (rad * 1.6);
        if (Math.abs(d) < 1) {
          const a = (d + 1) * Math.PI * 2;
          dx += Math.sin(a) * rad * 0.9 * (1 - Math.abs(d));
          y = lerp(y, ly + Math.cos(a) * rad, 1 - Math.abs(d));
        }
      });
      pts.push([x + dx, y]);
    }
    return pts;
  })();
  function lerp(a, b, t) { return a + (b - a) * t; }
  function drawThread(p) {
    // p: 0 tangled → 1 straight. The right end straightens first.
    let d = '';
    for (let i = 0; i < THREAD_N; i++) {
      const t = i / (THREAD_N - 1);
      const local = clamp((p * 1.6) - (1 - t) * 0.6, 0, 1);
      const e = local * local * (3 - 2 * local);
      const x = lerp(tangle[i][0], t * 1200, e);
      const y = lerp(tangle[i][1], 110, e);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    threadPath.setAttribute('d', d);
  }
  drawThread(0);

  /* ------------------------------------------------------------
     Capabilities
  ------------------------------------------------------------ */
  const tabsEl = $('[data-caps-tabs]'), panel = $('[data-caps-panel]'), specLabel = $('[data-caps-label]');
  const lastEnd = tabsEl.lastElementChild;
  D.stages.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'caps__tab';
    b.setAttribute('role', 'tab');
    b.id = `cap-tab-${i}`;
    b.setAttribute('aria-controls', 'cap-panel');
    b.innerHTML = `<span class="mono">0${i + 1}</span><b>${s.name}</b>`;
    b.addEventListener('click', () => setStage(i, true));
    tabsEl.insertBefore(b, lastEnd);
  });
  panel.id = 'cap-panel';
  const tabs = $$('.caps__tab', tabsEl);
  const spec = new Specimen($('[data-cells="caps"]'));
  let capIndex = 0;
  function setStage(i, focus) {
    capIndex = i;
    const s = D.stages[i];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tabs[i].focus();
    panel.setAttribute('aria-labelledby', tabs[i].id);
    panel.innerHTML = `<div class="panel-enter">
        <h3>${esc(s.worry)}</h3>
      </div>
      <div class="caps__cols panel-enter" style="animation-delay:.08s">
        <div><h4>What we do</h4><ul>${s.doing.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>What you walk away with</h4><ul>${s.getting.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="caps__step panel-enter" style="animation-delay:.14s">
        <button type="button" data-cap-step="-1" ${i === 0 ? 'disabled' : ''}>← Less clear</button>
        <button type="button" data-cap-step="1" ${i === D.stages.length - 1 ? 'disabled' : ''}>Clearer →</button>
      </div>`;
    specLabel.textContent = `${String(i + 1).padStart(2, '0')} · ${s.label}`;
    spec.setStage(i);
  }
  panel.addEventListener('click', e => { const b = e.target.closest('[data-cap-step]'); if (b) setStage(clamp(capIndex + +b.dataset.capStep, 0, D.stages.length - 1)); });
  tabsEl.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); setStage((capIndex + k + tabs.length) % tabs.length, true); }
    if (e.key === 'Home') { e.preventDefault(); setStage(0, true); }
    if (e.key === 'End') { e.preventDefault(); setStage(tabs.length - 1, true); }
  });
  setStage(0, false);

  /* ------------------------------------------------------------
     Design × Engineering lab
  ------------------------------------------------------------ */
  const lab = $('[data-lab]'), labStage = $('[data-lab-stage]'), seam = $('[data-seam]');
  const designFrame = $('[data-lab-render="design"]'), codeFrame = $('[data-lab-render="code"]');
  const STATES = {
    ready: {
      note: 'Lead with the ETA — it’s the question people open this card to answer.',
      net: '<b>200</b> GET /shipments/48213 · 182 ms',
      body: mode => `
        <div class="sc__row" ${c(mode, '<ShipmentCard id={48213}>')}><span class="sc__id">#48213 · 2 parcels</span><span class="sc__chip">In transit</span></div>
        <p class="sc__route" ${c(mode, '{origin} → {destination}')}>Toronto, ON → Vancouver, BC</p>
        <p class="sc__eta" ${c(mode, 'formatETA(eta, user.tz)')}><small>Arrives</small>Thu, 14:20</p>
        <div class="sc__steps" ${c(mode, '<Progress steps={5} at={3} />')}><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div>
        <div class="sc__row" ${c(mode, '<Actions track share />')}><span class="sc__btns"><span class="sc__btn">Track</span><span class="sc__btn sc__btn--ghost">Share</span></span></div>`,
      type: 'Display / 28 · 600'
    },
    loading: {
      note: 'The skeleton matches the final layout, so nothing jumps when data lands.',
      net: '<b class="wait">…</b> GET /shipments/48213 · pending',
      body: mode => `
        <div class="sc__row" ${c(mode, '<Skeleton.Header />')}><span class="sc__skel" style="width:40%"></span><span class="sc__skel" style="width:22%"></span></div>
        <div class="sc__skelwrap" ${c(mode, 'aria-busy="true"')}><span class="sc__skel" style="display:block;width:65%"></span></div>
        <div class="sc__skelwrap" ${c(mode, '<Skeleton lines={2} />')}><span class="sc__skel" style="display:block;width:45%;height:26px"></span></div>
        <div class="sc__steps" ${c(mode, 'reserve height: 4px')}><i></i><i></i><i></i><i></i><i></i></div>
        <div class="sc__row" ${c(mode, 'actions disabled')}><span class="sc__skel" style="width:46%;height:34px"></span></div>`,
      type: 'Skeleton / 1.4s shimmer'
    },
    empty: {
      note: 'Empty is a first-run moment, not a dead end. Give one obvious next step.',
      net: '<b>200</b> GET /shipments · [] · 96 ms',
      body: mode => `
        <div class="sc__empty" ${c(mode, 'shipments.length === 0')}>
          <span class="sc__empty-ico">+</span>
          <p class="sc__eta" style="font-size:1.25rem">No shipments yet</p>
          <p class="sc__note">Get a rate and book your first pickup in about two minutes.</p>
        </div>
        <div class="sc__row" ${c(mode, '<Button primary onClick={newShipment} />')}><span class="sc__btns"><span class="sc__btn">Create a shipment</span></span></div>`,
      type: 'Heading / 20 · 600'
    },
    error: {
      note: 'Say what happened, keep what we know, offer the next move.',
      net: '<b class="bad">504</b> carrier gateway timeout · retry in 5 s',
      body: mode => `
        <div class="sc__row" ${c(mode, 'catch(err) → keep last known')}><span class="sc__id">#48213 · 2 parcels</span><span class="sc__chip sc__chip--warn">Update delayed</span></div>
        <p class="sc__route" ${c(mode, 'cached: route')}>Toronto, ON → Vancouver, BC</p>
        <p class="sc__eta" ${c(mode, 'cached: eta · stale=true')}><small>Last known ETA · 12 min ago</small>Thu, 14:20</p>
        <p class="sc__note" ${c(mode, 'err.userMessage')}>We couldn’t reach the carrier just now. Your shipment is fine — we’ll keep trying.</p>
        <div class="sc__row" ${c(mode, '<Button onClick={retry} />')}><span class="sc__btns"><span class="sc__btn">Retry now</span></span></div>`,
      type: 'Body / 15 · 400'
    }
  };
  function c(mode, code) { return mode === 'code' ? `data-code="${esc(code)}"` : ''; }
  function renderLab(key) {
    const s = STATES[key];
    designFrame.innerHTML = `<div class="sc sc--design">${s.body('design')}
        <span class="redline redline--pad">24</span>
        <span class="redline redline--type">${s.type}</span>
        <p class="redline redline--note">${esc(s.note)}</p>
      </div>`;
    codeFrame.innerHTML = `<div class="sc sc--code">${s.body('code')}</div>`;
    let net = $('.net', labStage);
    if (!net) { net = document.createElement('p'); net.className = 'net'; $('[data-lab-code]').appendChild(net); }
    net.innerHTML = s.net;
    $('[data-lab-note]').textContent = s.note;
  }
  $$('[data-state]', lab).forEach(b => b.addEventListener('click', () => {
    $$('[data-state]', lab).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderLab(b.dataset.state);
  }));
  renderLab('ready');

  function setSeam(pct) {
    pct = clamp(pct, 4, 96);
    lab.style.setProperty('--seam', pct + '%');
    seam.setAttribute('aria-valuenow', Math.round(pct));
    seam.setAttribute('aria-valuetext', `${Math.round(pct)}% design intent visible`);
  }
  let dragging = false;
  const fromEvent = e => { const r = labStage.getBoundingClientRect(); setSeam(((e.clientX - r.left) / r.width) * 100); };
  seam.addEventListener('pointerdown', e => { dragging = true; lab.classList.add('is-dragging'); seam.setPointerCapture(e.pointerId); fromEvent(e); });
  seam.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  const stopDrag = () => { dragging = false; lab.classList.remove('is-dragging'); };
  seam.addEventListener('pointerup', stopDrag);
  seam.addEventListener('pointercancel', stopDrag);
  // click anywhere on the stage moves the seam there
  labStage.addEventListener('click', e => { if (!e.target.closest('[data-seam]')) fromEvent(e); });
  seam.addEventListener('keydown', e => {
    const now = parseFloat(seam.getAttribute('aria-valuenow'));
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setSeam(now - step); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setSeam(now + step); }
    if (e.key === 'Home') { e.preventDefault(); setSeam(4); }
    if (e.key === 'End') { e.preventDefault(); setSeam(96); }
  });
  setSeam(50);

  /* ------------------------------------------------------------
     Testimonials
  ------------------------------------------------------------ */
  const voices = $$('.voice'), vCount = $('[data-voice-count]');
  let vi = 0;
  $$('[data-voice]').forEach(b => b.addEventListener('click', () => {
    voices[vi].classList.remove('is-active');
    vi = (vi + +b.dataset.voice + voices.length) % voices.length;
    voices[vi].classList.add('is-active');
    vCount.textContent = `${vi + 1} / ${voices.length}`;
  }));

  /* ------------------------------------------------------------
     Close: chips compose the email
  ------------------------------------------------------------ */
  const closeSec = $('[data-close]');
  const closeField = new Resolve($('[data-cells="close"]'), { seed: 29, dark: true, fragments: false, place: 'close' });
  jumble($('[data-jumble="close"]'), 19);
  pointerTo(closeField, closeSec);
  const chips = $$('[data-chip]'), mail = $('[data-mailto]'), starterNote = $('[data-starter-note]');
  const notes = ['A person reads every message. Usually within a working day.', 'Good start. Hit write — we’ll take it from there.', 'Two threads. We like it already.', 'Plenty to untangle. Perfect.', 'The full knot. Let’s talk.'];
  let chipBoost = 0;
  chips.forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    const picked = chips.filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.chip);
    const body = `Hi RMgX Design Studio,\n\nWhat we're bringing:\n${picked.map(p => '— ' + p).join('\n') || '— '}\n\nA little about the product:\n\n\nWhat a good outcome looks like:\n\n`;
    mail.href = `mailto:contact@rmgx.in?subject=${encodeURIComponent('Project enquiry for RMgX Design Studio')}&body=${encodeURIComponent(body)}`;
    starterNote.textContent = notes[picked.length];
    chipBoost = picked.length / chips.length;
    onScroll();
  }));

  /* ------------------------------------------------------------
     Reveal on view
  ------------------------------------------------------------ */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  $$('.reveal, [data-reframe], .proj, .relay').forEach(el => io.observe(el));

  /* ------------------------------------------------------------
     One scroll loop for everything scroll-linked
  ------------------------------------------------------------ */
  const header = $('[data-header]');
  const themed = $$('section[data-theme]');
  const slants = $$('.slant');
  const threadEl = $('.thread');
  let ticking = false, lastY = window.scrollY;

  function onScroll() {
    ticking = false;
    const vh = window.innerHeight, y = window.scrollY;

    // hero progress
    const hr = hero.getBoundingClientRect();
    const hp = clamp(-hr.top / (hr.height - vh), 0, 1);
    heroField.setProgress(hp);
    heroWord.set(RM.matches ? 0 : clamp(1 - hp * 1.8, 0, 1));
    resNum.textContent = String(Math.round(hp * 100)).padStart(2, '0');
    resBar.style.transform = `scaleX(${hp})`;
    resWrap.classList.toggle('is-off', hr.bottom < vh * 0.5);

    // header colour follows the section beneath it
    const probe = 30;
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { header.dataset.on = s.dataset.theme; break; }
    }
    header.classList.toggle('is-solid', y > vh * 0.9 && hr.bottom < 0);
    // hide on scroll down, show on scroll up (never while menu open)
    if (y > vh && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < vh) header.classList.remove('is-hidden');
    lastY = y;

    // slanted tops flatten as the section arrives
    for (const s of slants) {
      const r = s.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * 0.9), 0, 1);
      s.style.setProperty('--cut', ((1 - t) * 7).toFixed(2) + 'vw');
    }

    // approach thread
    const tr = threadEl.getBoundingClientRect();
    if (tr.top < vh && tr.bottom > 0) drawThread(RM.matches ? 1 : clamp((vh - tr.top) / (vh * 0.7), 0, 1));

    // closing resolve
    const cr = closeSec.getBoundingClientRect();
    if (cr.top < vh && cr.bottom > 0) {
      const cp = clamp((vh - cr.top) / (vh * 0.95), 0, 1);
      closeField.setProgress(clamp(cp * 0.75 + chipBoost * 0.25, 0, 1));
    }
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  window.__studio = { heroField, spec, closeField }; // handy for debugging in the console
  onScroll();
})();
