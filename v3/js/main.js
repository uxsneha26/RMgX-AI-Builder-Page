(function () {
  'use strict';

  const D = window.STUDIO_DATA;
  const { ParticleField, reducedMotion: RM } = window.Resolve;
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
     Selected work — ILLUSTRATIVE placeholder case studies.
     These describe how we would approach a brief. They are not client
     results: replace them with approved case studies before launch.
  ------------------------------------------------------------ */
  const P = [
    {
      name: 'AI career transition platform',
      sector: 'Workforce · Career services',
      line: 'Helping people leaving one career map their experience to the next.',
      flow: ['CVs + work history', 'Skills graph + RAG', 'Matched roles + plan'],
      challenge: [
        'Career changers struggle to describe past experience in terms employers recognise.',
        'Advisors can’t give every user one-to-one guidance.'
      ],
      approach: [
        'Skills extraction from CVs and service records, using an LLM with structured outputs.',
        'Retrieval over role profiles and live job data to suggest realistic next roles.',
        'A guided, conversational planner that explains every recommendation.'
      ],
      measure: ['Time from sign-up to a first career plan', 'Plan completion rate', 'Advisor hours per user'],
      caps: ['LLMs', 'RAG', 'Vector databases', 'Product design']
    },
    {
      name: 'AI lending and risk assessment',
      sector: 'Financial services · SME lending',
      line: 'Faster, explainable credit decisions for small-business loans.',
      flow: ['Applications + documents', 'Extraction + risk scoring', 'Underwriter decision'],
      challenge: [
        'Manual document review stretches decisions to days.',
        'Credit teams need to see why a model scores an applicant the way it does.'
      ],
      approach: [
        'Document intelligence to extract and cross-check financial data.',
        'A risk model alongside existing credit rules, with the reasons shown for every score.',
        'An underwriter workspace where people keep the final say.'
      ],
      measure: ['Time to decision', 'Share of applications processed without re-keying', 'Underwriter override rate'],
      caps: ['Data engineering', 'Model evaluation', 'APIs & integrations', 'Product design']
    },
    {
      name: 'Intelligent logistics workflows',
      sector: 'Logistics · Operations',
      line: 'Fewer manual steps between order, shipment and invoice.',
      flow: ['Emails + carrier documents', 'Agentic workflow', 'Updated TMS / ERP'],
      challenge: [
        'Operations teams re-key data across carrier portals, email and the ERP.',
        'Exceptions such as delays and mismatched invoices are found late.'
      ],
      approach: [
        'Agents that read emails and documents and update the systems of record.',
        'Exception detection that flags at-risk shipments early.',
        'One review queue where staff approve, correct and improve the system.'
      ],
      measure: ['Manual touches per shipment', 'How early exceptions are caught', 'Invoice-matching accuracy'],
      caps: ['AI agents', 'APIs & integrations', 'Cloud infrastructure', 'Model evaluation']
    }
  ];
  const flowHTML = f => `<span class="flow" aria-hidden="true">${f.map((s, j) => `<span class="flow__node"><i class="mono">${String(j + 1).padStart(2, '0')}</i>${esc(s)}</span>`).join('<span class="flow__arrow">→</span>')}</span>`;
  const projWrap = $('[data-cases]');
  projWrap.innerHTML = P.map((p, i) => `
    <article class="case" data-proj="${i}">
      <button class="case__hit" type="button" data-open="${i}" aria-label="Open case study: ${esc(p.name)}">
        <span class="case__top mono"><span>${String(i + 1).padStart(2, '0')} / ${String(P.length).padStart(2, '0')}</span><span class="case__tag">Placeholder · Illustrative</span></span>
        <span class="case__sector mono">${esc(p.sector)}</span>
        <span class="case__name">${esc(p.name)}</span>
        <span class="case__line">${esc(p.line)}</span>
        ${flowHTML(p.flow)}
        <span class="case__measure"><span class="mono">We’d measure</span>${p.measure.map(esc).join(' · ')}</span>
        <span class="case__open mono" aria-hidden="true">Read the approach →</span>
      </button>
    </article>`).join('');

  /* ------------------------------------------------------------
     Drawer (case-study sheet)
  ------------------------------------------------------------ */
  const drawer = $('[data-drawer]'), dBody = $('[data-drawer-body]'), dSheet = $('.drawer__sheet');
  let lastFocus = null, drawerIndex = 0;
  function renderDrawer(i) {
    const p = P[i];
    drawerIndex = i;
    const list = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
    const prev = P[(i - 1 + P.length) % P.length];
    const next = P[(i + 1) % P.length];
    dBody.innerHTML = `
      <p class="drawer__flag mono">Illustrative case study · placeholder content, not a client result</p>
      <div class="drawer__kicker mono"><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(p.sector)}</span></div>
      <h2 id="drawer-title">${esc(p.name)}</h2>
      <p class="drawer__line">${esc(p.line)}</p>
      <div class="drawer__flow">${flowHTML(p.flow)}</div>
      <div class="drawer__grid">
        <div><h3>The problem</h3><ul>${list(p.challenge)}</ul></div>
        <div><h3>Our approach</h3><ul>${list(p.approach)}</ul></div>
      </div>
      <div class="drawer__impact"><h3>What we’d measure</h3><ul>${list(p.measure)}</ul></div>
      <p class="drawer__caps mono">${p.caps.map(esc).join(' · ')}</p>
      <div class="drawer__foot">
        <span class="drawer__src mono">Have a brief like this?</span>
        <a class="link-cta" href="https://calendly.com/rmgx/connect-rds" target="_blank" rel="noopener">Book an AI discovery call</a>
      </div>
      <div class="drawer__foot drawer__nav">
        <button class="link-quiet" type="button" data-drawer-go="${(i - 1 + P.length) % P.length}">← ${esc(prev.name)}</button>
        <button class="link-quiet" type="button" data-drawer-go="${(i + 1) % P.length}">${esc(next.name)} →</button>
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
  jumble($('[data-jumble="close"]'), 19);
  const chips = $$('[data-chip]'), mail = $('[data-mailto]'), starterNote = $('[data-starter-note]');
  const notes = ['Pick a topic and we’ll come prepared.', 'Noted. Mention it when you book and we’ll bring the right people.', 'Two topics. Plenty for a first call.', 'A broad brief. We’ll help you narrow it down.', 'The full picture. Let’s talk.', 'Not sure is a fine place to start.'];
  function updateStarter() {
    const picked = chips.filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.chip);
    const body = `Hi RMgX Design Studio,\n\nWhat we'd like to discuss:\n${picked.map(p => '— ' + p).join('\n') || '— '}\n\nThe idea or problem:\n\n\nThe data and systems involved:\n\n\nWhat a good outcome looks like:\n\n`;
    mail.href = `mailto:contact@rmgx.in?subject=${encodeURIComponent('AI discovery call: ' + (picked.join(', ') || 'new enquiry'))}&body=${encodeURIComponent(body)}`;
    starterNote.textContent = notes[picked.length];
  }
  chips.forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    updateStarter();
  }));
  // service CTAs jump to the contact section with their topic already picked
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => {
    const chip = chips.find(c => c.dataset.chip === a.dataset.pick);
    if (chip) { chip.setAttribute('aria-pressed', 'true'); updateStarter(); }
  }));

  /* ------------------------------------------------------------
     Reveal on view
  ------------------------------------------------------------ */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  $$('.reveal, .case, .steps, .stack__grid').forEach(el => io.observe(el));

  /* ------------------------------------------------------------
     The particle field — one canvas, one pool, the whole page.
     Hero: the v1 Resolve (scatter, lens, scroll to resolve).
     Then each [data-form] slot hosts a formation, and the field
     morphs from one to the next as you read down the page.
     The same canvas paints the light / dark chapters behind it.
  ------------------------------------------------------------ */
  const heroWord = jumble($('[data-jumble]'), 7);
  const hero = $('#top'), stage = $('[data-hero-stage]');
  // 0 → 1 over the first part of the hero's sticky scroll
  const heroProgress = () => {
    const r = hero.getBoundingClientRect();
    const run = Math.max(1, r.height - window.innerHeight);
    return clamp(-r.top / (run * 0.8), 0, 1);
  };
  const shapeOf = { logo: 'logo', design: 'design', audit: 'audit', strategy: 'strategy', upgrade: 'upgrade', process: 'process', 'logo-end': 'logo' };
  const slots = $$('[data-form]').map(el => {
    const key = el.dataset.form;
    const host = el.closest('[data-tone]');
    const slot = { el, shape: shapeOf[key], tone: host ? host.dataset.tone : 'dark' };
    if (key === 'logo') { slot.share = 0.9; slot.anchor = stage; }
    if (key === 'logo-end') slot.share = 0.9;
    if (key === 'process') slot.share = 0.4;
    return slot;
  });
  const bands = $$('[data-tone], [data-shift]');
  document.documentElement.classList.add('has-field');
  const field = new ParticleField($('[data-field]'), slots, { stage, heroProgress, bands });
  // start the intro once fonts are ready, so the fragments render in the brand face
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => field.start());

  // pointer and touch: the lens brings the hero's mess into focus
  window.addEventListener('pointermove', e => field.setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', e => field.setPointer(e.clientX, e.clientY), { passive: true });
  document.addEventListener('pointerleave', () => field.setPointer(null));

  /* ------------------------------------------------------------
     Header: chapter label, page progress and colour; hide on scroll down
  ------------------------------------------------------------ */
  const header = $('[data-header]');
  const chapters = $$('[data-chapter]');
  const chapterLabel = $('[data-chapter-label]'), chapterBar = $('[data-chapter-bar]');
  let ticking = false, lastY = window.scrollY, lastLabel = '';

  function onScroll() {
    ticking = false;
    const vh = window.innerHeight, y = window.scrollY;
    const max = document.documentElement.scrollHeight - vh;
    chapterBar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    // the chapter whose section is under the middle of the screen
    let label = lastLabel;
    for (const s of chapters) {
      const r = s.getBoundingClientRect();
      if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) { label = s.dataset.chapter; break; }
    }
    if (label !== lastLabel) { chapterLabel.textContent = label; lastLabel = label; }
    // header colour follows the page beneath it
    header.dataset.on = field.toneAt(36) === 'dark' ? 'ink' : 'paper';
    header.classList.toggle('is-solid', y > vh * 0.6);
    if (y > vh && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < vh) header.classList.remove('is-hidden');
    lastY = y;
    // the jumbled hero word straightens as the scatter resolves
    heroWord.set(RM.matches ? 0 : clamp(1 - heroProgress() * 1.8, 0, 1));
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);

  window.__studio = { field }; // handy for debugging in the console
  onScroll();
})();
