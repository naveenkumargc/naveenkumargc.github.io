/* Naveen Kumar GC — v2 interactions (no dependencies) */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const reduced = root.classList.contains('rm');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const START = new Date('2014-10-08T09:30:00+05:30');

  let vw = root.clientWidth;
  let vh = window.innerHeight;

  /* ---------------- Uptime ---------------- */
  function addMonths(date, n) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + n);
    return d;
  }
  function uptimeParts(now = new Date()) {
    let months = (now.getFullYear() - START.getFullYear()) * 12 + (now.getMonth() - START.getMonth());
    let anchor = addMonths(START, months);
    if (anchor > now) { months -= 1; anchor = addMonths(START, months); }
    let ms = now - anchor;
    const days = Math.floor(ms / 864e5); ms -= days * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4); ms -= m * 6e4;
    const s = Math.floor(ms / 1e3);
    return { y: Math.floor(months / 12), mo: months % 12, d: days, h, m, s };
  }
  const pad2 = n => String(n).padStart(2, '0');
  const uptimeEls = $$('[data-uptime]');
  function renderUptime() {
    const u = uptimeParts();
    const txt = `${u.y}y ${pad2(u.mo)}m ${pad2(u.d)}d ${pad2(u.h)}:${pad2(u.m)}:${pad2(u.s)}`;
    uptimeEls.forEach(el => { el.textContent = txt; });
  }
  renderUptime();
  setInterval(renderUptime, 1000);
  const years = uptimeParts().y;
  $$('[data-years]').forEach(el => { el.dataset.count = String(years); });
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- Theme & accent ---------------- */
  const ACCENTS = { lime: 'Lime', cyan: 'Cyan', amber: 'Amber', violet: 'Violet', coral: 'Coral' };
  const themeBtn = $('#themeBtn');
  const themeLabel = $('#themeLabel');
  const paletteBtn = $('#paletteBtn');
  const palette = $('#palette');
  const metaTheme = $('meta[name="theme-color"]');

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }

  function syncThemeUI() {
    const theme = root.dataset.theme;
    const accent = root.dataset.accent;
    $$('[data-set-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setTheme === theme)));
    $$('[data-set-accent]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setAccent === accent)));
    $('#accentName').textContent = ACCENTS[accent] || accent;
    themeLabel.textContent = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    metaTheme.setAttribute('content', theme === 'dark' ? '#0A0A0B' : '#F3F0E8');
    readColors();
  }

  function setTheme(theme, x, y) {
    if (theme === root.dataset.theme) return;
    const apply = () => { root.dataset.theme = theme; store('nkgc-theme', theme); syncThemeUI(); };
    if (!document.startViewTransition || reduced) { apply(); return; }
    const cx = x ?? vw - 40;
    const cy = y ?? 40;
    const r = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${r}px at ${cx}px ${cy}px)`] },
        { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }

  function setAccent(accent) {
    if (!ACCENTS[accent]) return;
    root.dataset.accent = accent;
    store('nkgc-accent', accent);
    syncThemeUI();
  }

  themeBtn.addEventListener('click', e => {
    const r = themeBtn.getBoundingClientRect();
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
  });
  $$('[data-set-theme]').forEach(b => b.addEventListener('click', e => setTheme(b.dataset.setTheme, e.clientX, e.clientY)));
  $$('[data-set-accent]').forEach(b => b.addEventListener('click', () => setAccent(b.dataset.setAccent)));

  function togglePalette(open) {
    const isOpen = open ?? palette.hidden;
    palette.hidden = !isOpen;
    paletteBtn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) palette.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }
  paletteBtn.addEventListener('click', e => { e.stopPropagation(); togglePalette(); });
  document.addEventListener('click', e => { if (!palette.hidden && !palette.contains(e.target)) togglePalette(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !palette.hidden) { togglePalette(false); paletteBtn.focus(); } });

  /* ---------------- Canvas colours ---------------- */
  const C = { accent: '#C6FF3D', fg: '#EDEAE3', muted: '#8A8A91', line: 'rgba(255,255,255,.1)', line2: 'rgba(255,255,255,.2)', danger: '#FF5D5D', bg: '#0A0A0B' };
  function readColors() {
    const cs = getComputedStyle(root);
    const get = (n, f) => cs.getPropertyValue(n).trim() || f;
    C.accent = get('--accent', C.accent);
    C.fg = get('--fg', C.fg);
    C.muted = get('--muted', C.muted);
    C.line = get('--line', C.line);
    C.line2 = get('--line-2', C.line2);
    C.danger = get('--danger', C.danger);
    C.bg = get('--bg', C.bg);
    vizzes.forEach(v => { if (reduced) v.drawn = false; });
  }

  /* ---------------- Loader + hero intro ---------------- */
  const loader = $('#loader');
  function heroIntro() {
    if (reduced) return;
    const opts = { duration: 1200, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' };
    $('#heroFirst').animate([{ transform: 'translate3d(0,40%,0)', opacity: 0 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], opts);
    $('#heroLast').animate([{ transform: 'translate3d(0,40%,0)', opacity: 0 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { ...opts, delay: 120 });
    $('#heroFrame').animate([{ clipPath: 'inset(48% 48% 48% 48% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)' }], { duration: 1300, easing: 'cubic-bezier(.7,0,.2,1)', delay: 60, fill: 'backwards' });
    $('#heroMeta').animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { ...opts, delay: 500 });
  }

  function boot() {
    if (!root.classList.contains('booting')) { heroIntro(); return; }
    const log = $('#bootLog');
    const bar = $('#bootBar');
    const pct = $('#bootPct');
    const u = uptimeParts();
    const lines = [
      '$ boot naveen.runtime --since 2014-10-08',
      `› mounting /experience ........ ${u.y}y ${u.mo}m <span class="ok">✓</span>`,
      '› loading c# · .net · oracle · react · angular <span class="ok">✓</span>',
      '› attaching intelligence: rag · agents · skills <span class="ok">✓</span>',
      '› status: <span class="ok">ready</span> — welcome.'
    ];
    const DURATION = 1700;
    const t0 = performance.now();
    let shown = 0;
    const tick = now => {
      const p = clamp((now - t0) / DURATION);
      const target = Math.min(lines.length, Math.floor(p * lines.length) + 1);
      if (target > shown) { shown = target; log.innerHTML = lines.slice(0, shown).join('\n'); }
      bar.style.transform = `scaleX(${easeOut(p)})`;
      pct.textContent = `${Math.round(easeOut(p) * 100)}%`;
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finish, 260);
    };
    const finish = () => {
      try { sessionStorage.setItem('nkgc-booted', '1'); } catch (e) { /* ignore */ }
      loader.classList.add('is-done');
      heroIntro();
      setTimeout(() => root.classList.remove('booting'), 950);
    };
    requestAnimationFrame(tick);
  }

  /* ---------------- Hero (scroll-driven) ---------------- */
  const hero = $('#top');
  const frame = $('#heroFrame');
  const video = $('#heroVideo');
  const shade = $('#heroShade');
  const first = $('#heroFirst');
  const last = $('#heroLast');
  const meta = $('#heroMeta');
  const hint = $('#heroHint');
  const story = $('#heroStory');
  const storyText = $('#storyText');
  const soundBtn = $('#soundBtn');
  let w0 = 0, h0 = 0, words = [];

  function splitWords(el) {
    const out = [];
    const walk = (node, accent) => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
            out.push(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child, true);
        }
      });
    };
    walk(el, false);
    return out;
  }
  if (!reduced) words = splitWords(storyText);

  function measureHero() {
    frame.style.width = '';
    frame.style.height = '';
    const r = frame.getBoundingClientRect();
    w0 = r.width;
    h0 = r.height;
  }

  function updateHero() {
    if (reduced) return;
    const r = hero.getBoundingClientRect();
    const total = Math.max(1, hero.offsetHeight - vh);
    const p = clamp(-r.top / total);
    const e = easeInOut(clamp(p / .36));

    frame.style.width = `${lerp(w0, vw, e)}px`;
    frame.style.height = `${lerp(h0, vh, e)}px`;
    frame.style.borderRadius = `${24 * (1 - e)}px`;

    const shift = vw * .5 * e;
    first.style.transform = `translate3d(${-shift}px,0,0)`;
    last.style.transform = `translate3d(${shift}px,0,0)`;
    first.style.opacity = last.style.opacity = String(clamp(1 - e * 1.4));
    meta.style.opacity = String(clamp(1 - e * 2.5));
    hint.style.opacity = String(clamp(1 - p * 10));

    shade.style.opacity = String(clamp((p - .3) / .18));
    story.style.opacity = String(clamp((p - .38) / .08));
    soundBtn.style.opacity = String(clamp(1 - (p - .3) / .1));

    const wp = clamp((p - .44) / .46);
    const n = words.length;
    for (let i = 0; i < n; i++) {
      const o = clamp(wp * (n + 6) - i);
      words[i].style.opacity = String(.14 + .86 * o);
    }
  }

  function setSound(on) {
    video.muted = !on;
    if (on && video.paused) video.play().catch(() => {});
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('.sound__text').textContent = on ? 'Sound off' : 'Sound on';
    frame.dataset.cursor = on ? 'mute' : 'sound';
  }
  frame.addEventListener('click', () => setSound(video.muted));

  new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { video.play().catch(() => {}); }
      else { video.pause(); }
    });
  }, { threshold: 0 }).observe(hero);

  /* ---------------- Journey ---------------- */
  const journey = $('#journey');
  const track = $('#journeyTrack');
  const fill = $('#journeyFill');
  const milestones = $$('.milestone', track);
  let jWide = false, jDist = 0, jPad = 0;

  function layoutJourney() {
    jWide = !reduced && matchMedia('(min-width: 900px)').matches;
    track.style.transform = '';
    if (jWide) {
      jPad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      jDist = Math.max(0, track.scrollWidth - vw);
      journey.style.height = `${jDist + vh}px`;
    } else {
      journey.style.height = '';
    }
  }

  function updateJourney() {
    if (reduced) { milestones.forEach(m => m.classList.add('is-active')); return; }
    if (jWide) {
      const r = journey.getBoundingClientRect();
      const p = jDist ? clamp(-r.top / jDist) : 0;
      const x = p * jDist;
      track.style.transform = `translate3d(${-x}px,0,0)`;
      const railW = track.scrollWidth - jPad * 2;
      const head = x + vw * .58 - jPad;
      fill.style.transform = `scaleX(${clamp(head / railW)})`;
      milestones.forEach(m => m.classList.toggle('is-active', p > .97 || m.offsetLeft - x < vw * .6));
    } else {
      const r = track.getBoundingClientRect();
      fill.style.transform = `scaleY(${clamp((vh * .62 - r.top) / r.height)})`;
      milestones.forEach(m => m.classList.toggle('is-active', m.getBoundingClientRect().top < vh * .62));
    }
  }

  /* ---------------- Stacking cards ---------------- */
  const cards = $$('.card');
  function updateCards() {
    const stacking = !reduced && matchMedia('(min-width: 900px)').matches;
    const light = root.dataset.theme === 'light';
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const next = cards[i + 1];
      if (!stacking || !next) { card.style.transform = ''; card.style.setProperty('--dim', '0'); continue; }
      const t = clamp((vh - next.getBoundingClientRect().top) / (vh * .85));
      card.style.transform = `scale(${1 - .06 * t})`;
      card.style.setProperty('--dim', String((light ? .5 : .55) * t));
    }
  }

  /* ---------------- Nav, progress, active link ---------------- */
  const nav = $('#nav');
  const bar = $('#progressBar');
  let lastY = window.scrollY;
  function updateChrome() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('is-solid', y > 40);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > vh * .8 && palette.hidden) nav.classList.add('is-hidden');
    else if (goingUp || y < vh * .5) nav.classList.remove('is-hidden');
    lastY = y;
  }
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  const navLinks = $$('.nav__links a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['journey', 'ai', 'work', 'stack', 'proof', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) sectionObserver.observe(s); });

  /* ---------------- Scroll loop ---------------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateHero();
      updateJourney();
      updateCards();
      updateChrome();
      revealPassed();
    });
  }
  function onResize() {
    vw = root.clientWidth;
    vh = window.innerHeight;
    measureHero();
    layoutJourney();
    vizzes.forEach(v => v.resize());
    onScroll();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(onResize, 120); });

  /* ---------------- Reveal & counters ---------------- */
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reduced) { el.textContent = String(target); return; }
    const t0 = performance.now();
    const dur = 1500;
    const step = now => {
      const p = clamp((now - t0) / dur);
      el.textContent = String(Math.round(target * easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const pendingReveals = new Set($$('[data-reveal]'));
  function reveal(el) {
    if (!pendingReveals.has(el)) return;
    pendingReveals.delete(el);
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(countUp);
    revealObserver.unobserve(el);
  }
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) reveal(en.target); });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  pendingReveals.forEach(el => revealObserver.observe(el));
  // Catch elements that were skipped over by a fast jump (anchor links, scrollbar drags).
  function revealPassed() {
    if (!pendingReveals.size) return;
    pendingReveals.forEach(el => { if (el.getBoundingClientRect().top < vh) reveal(el); });
  }

  const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle('is-in', en.isIntersecting));
  }, { threshold: .3 });
  cards.forEach(c => cardObserver.observe(c));

  /* ---------------- Canvas visualisations ---------------- */
  const vizzes = [];
  class Viz {
    constructor(canvas, draw) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.draw = draw;
      this.s = {};
      this.visible = false;
      this.drawn = false;
      this.w = 0;
      this.h = 0;
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = r.width;
      this.h = r.height;
      this.c.width = Math.round(r.width * dpr);
      this.c.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.s = {};
      this.drawn = false;
    }
  }

  const MONO = '500 10px "JetBrains Mono", ui-monospace, monospace';

  function drawOrders(v, t, dt) {
    const { ctx, w, h, s } = v;
    const lanes = 7;
    const top = h * .2;
    const bottom = h * .78;
    const gap = (bottom - top) / (lanes - 1);
    const gates = [.3, .58, .84];
    const names = ['VALIDATE', 'MCR / MU', 'SHIP'];
    const spawn = init => ({
      x: init ? Math.random() * w : -Math.random() * w * .5,
      lane: Math.floor(Math.random() * lanes),
      v: 1.1 + Math.random() * 1.7,
      len: 8 + Math.random() * 20,
      bad: Math.random() < .12,
      a: 1, dy: 0, vy: 0, falling: false, counted: false
    });
    if (!s.p) { s.p = Array.from({ length: Math.round(w / 9) }, () => spawn(true)); s.count = 1048576; }

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.line;
    for (let i = 0; i < lanes; i++) {
      const y = top + i * gap;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.font = MONO;
    ctx.textAlign = 'center';
    ctx.setLineDash([3, 5]);
    gates.forEach((g, i) => {
      ctx.strokeStyle = C.line2;
      ctx.beginPath(); ctx.moveTo(g * w, top - 18); ctx.lineTo(g * w, bottom + 18); ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.fillText(names[i], g * w, top - 28);
    });
    ctx.setLineDash([]);

    s.p.forEach((p, idx) => {
      p.x += p.v * dt;
      if (p.bad && !p.falling && p.x > gates[0] * w) p.falling = true;
      if (p.falling) { p.vy += .22 * dt; p.dy += p.vy * dt; p.a -= .018 * dt; p.v *= .96; }
      if (!p.counted && p.x > gates[2] * w) { p.counted = true; s.count += 1; }
      if (p.x - p.len > w || p.a <= 0) { s.p[idx] = spawn(false); return; }
      const y = top + p.lane * gap + p.dy;
      ctx.globalAlpha = clamp(p.a);
      ctx.fillStyle = p.falling ? C.danger : (p.x > gates[2] * w ? C.fg : C.accent);
      ctx.fillRect(p.x - p.len, y - 1.5, p.len, 3);
      ctx.beginPath(); ctx.arc(p.x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.muted;
    ctx.fillText(`${s.count.toLocaleString('en-IN')} orders processed`, w - 16, h - 16);
  }

  function drawMedia(v, t) {
    const { ctx, w, h } = v;
    ctx.clearRect(0, 0, w, h);
    const cy = h * .34;
    const step = 6;
    const n = Math.floor((w - 32) / step);
    const head = (t * .00007) % 1;
    for (let i = 0; i < n; i++) {
      const x = 16 + i * step;
      const a = (Math.sin(i * .33 + t * .0028) * .5 + .5) * (Math.sin(i * .09 - t * .0015) * .5 + .5);
      const bh = 4 + a * h * .3;
      ctx.fillStyle = i / n < head ? C.accent : C.line2;
      ctx.fillRect(x, cy - bh / 2, 3, bh);
    }
    ctx.fillStyle = C.fg;
    ctx.fillRect(16 + head * n * step, cy - h * .2, 1.5, h * .4);

    const labels = ['INGEST', 'TRANSCODE', 'DELIVER'];
    ctx.font = MONO;
    labels.forEach((label, k) => {
      const y = h * .62 + k * 26;
      const x0 = 104;
      const x1 = w - 60;
      const f = (t * .00009 * (1 + k * .4) + k * .31) % 1;
      ctx.textAlign = 'left';
      ctx.fillStyle = C.muted;
      ctx.fillText(label, 16, y + 4);
      ctx.fillStyle = C.line;
      ctx.fillRect(x0, y, x1 - x0, 3);
      ctx.fillStyle = C.accent;
      ctx.fillRect(x0, y, (x1 - x0) * f, 3);
      ctx.textAlign = 'right';
      ctx.fillStyle = C.fg;
      ctx.fillText(`${Math.round(f * 100)}%`, w - 16, y + 4);
    });
  }

  function drawContour(v, t) {
    const { ctx, w, h, s } = v;
    const step = 14;
    const cols = Math.ceil(w / step) + 1;
    const rows = Math.ceil(h / step) + 1;
    if (!s.f || s.f.length !== cols * rows) s.f = new Float32Array(cols * rows);
    const f = s.f;
    const cx = w * .62, cy = h * .42;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * step, y = j * step;
        f[j * cols + i] =
          Math.sin(x * .011 + t * .00055) +
          Math.cos(y * .016 - t * .00045) +
          Math.sin((x + y) * .007 + t * .0004) +
          Math.cos(Math.hypot(x - cx, y - cy) * .022 - t * .0008);
      }
    }
    ctx.clearRect(0, 0, w, h);
    const levels = [-1.8, -1.2, -.6, 0, .6, 1.2, 1.8];
    levels.forEach((L, li) => {
      const isTop = li === levels.length - 1 || li === levels.length - 2;
      ctx.strokeStyle = isTop ? C.accent : C.line2;
      ctx.lineWidth = isTop ? 1.6 : 1;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = f[j * cols + i], b = f[j * cols + i + 1];
          const c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
          const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x = i * step, y = j * step;
          const T = [x + step * (L - a) / (b - a), y];
          const R = [x + step, y + step * (L - b) / (c - b)];
          const B = [x + step * (L - d) / (c - d), y + step];
          const Lf = [x, y + step * (L - a) / (d - a)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (idx) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, R); break;
            case 3: case 12: seg(Lf, R); break;
            case 4: case 11: seg(T, R); break;
            case 5: seg(T, R); seg(Lf, B); break;
            case 6: case 9: seg(T, B); break;
            case 7: case 8: seg(Lf, T); break;
            case 10: seg(Lf, T); seg(B, R); break;
          }
        }
      }
      ctx.stroke();
    });
  }

  const DRAWERS = { orders: drawOrders, media: drawMedia, contour: drawContour };
  $$('canvas[data-viz]').forEach(c => {
    const fn = DRAWERS[c.dataset.viz];
    if (fn) vizzes.push(new Viz(c, fn));
  });
  const vizObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const v = vizzes.find(z => z.c === en.target);
      if (!v) return;
      v.visible = en.isIntersecting;
      if (v.visible && !v.w) v.resize();
    });
  }, { rootMargin: '100px' });
  vizzes.forEach(v => vizObserver.observe(v.c));

  let lastT = performance.now();
  function vizLoop(now) {
    const dt = Math.min(48, now - lastT) / 16.667;
    lastT = now;
    for (const v of vizzes) {
      if (!v.visible || !v.w) continue;
      if (reduced) {
        if (!v.drawn) { v.draw(v, 4000, 0); v.drawn = true; }
      } else {
        v.draw(v, now, dt);
      }
    }
    requestAnimationFrame(vizLoop);
  }

  /* ---------------- Shipment-guard demo ---------------- */
  const demo = $('#demo');
  const demoStatus = $('#demoStatus');
  const STEPS = [
    { label: 'idle', ms: 500 },
    { label: 'scanning…', ms: 1900 },
    { label: 'conflicts', ms: 1000 },
    { label: 'flagged', ms: 1700 },
    { label: 'resolved', ms: 2800 }
  ];
  let demoStep = 0, demoTimer = null, demoVisible = false;
  function setDemo(step) {
    demoStep = step;
    demo.dataset.step = String(step);
    demoStatus.textContent = STEPS[step].label;
  }
  function runDemo() {
    clearTimeout(demoTimer);
    if (!demoVisible) return;
    demoTimer = setTimeout(() => { setDemo((demoStep + 1) % STEPS.length); runDemo(); }, STEPS[demoStep].ms);
  }
  if (reduced) setDemo(4);
  else {
    setDemo(0);
    new IntersectionObserver(entries => {
      entries.forEach(en => {
        demoVisible = en.isIntersecting;
        if (demoVisible) runDemo(); else clearTimeout(demoTimer);
      });
    }, { threshold: .35 }).observe(demo);
  }

  /* ---------------- Self-typing C# ---------------- */
  const CODE = [
    '// Naveen.cs — compiled daily since 2014-10-08',
    'public sealed class Naveen : ISeniorEngineer',
    '{',
    '    public DateOnly Since => new(2014, 10, 8);',
    '    public string   Base  => "Bengaluru, India";',
    '',
    '    public string[] Backend  => ["C#", ".NET", "ASP.NET MVC", "Web API", "WCF"];',
    '    public string[] Data     => ["MS SQL", "Oracle", "LINQ", "Entity Framework", "SSRS"];',
    '    public string[] Frontend => ["React", "Angular", "jQuery", "Kendo UI", "d3", "SVG"];',
    '    public string[] AI       => ["RAG", "Agents", "Skills", "LLMs", "Google Flow"];',
    '    public string[] Platform => ["Azure", "Docker", "IIS", "TFS / ADO", "Git"];',
    '    public string[] Practice => ["TDD", "Agile", "Architecture", "Mentoring"];',
    '',
    '    public async Task<Impact> ShipAsync(Problem problem)',
    '    {',
    '        var plan = await Understand(problem);   // listen first',
    '        var code = Simplify(plan).Automate();',
    '        return code.AddIntelligence(where: Earned);',
    '    }',
    '}'
  ].join('\n');

  const KEYWORDS = new Set(['public', 'sealed', 'class', 'new', 'string', 'var', 'return', 'async', 'await', 'private', 'static', 'readonly']);
  function tokenize(src) {
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([\s\S])/g;
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      if (m[1]) out.push({ c: 'c', t: m[1] });
      else if (m[2]) out.push({ c: 's', t: m[2] });
      else if (m[3]) out.push({ c: 'n', t: m[3] });
      else if (m[4]) {
        const word = m[4];
        const rest = src.slice(re.lastIndex);
        let c = '';
        if (KEYWORDS.has(word)) c = 'k';
        else if (/^\s*\(/.test(rest)) c = 'm';
        else if (/^[A-Z]/.test(word)) c = 't';
        out.push({ c, t: word });
      } else if (m[5]) out.push({ c: '', t: m[5] });
      else out.push({ c: 'p', t: m[6] });
    }
    return out;
  }

  const codeOut = $('#codeOut');
  const codeSkip = $('#codeSkip');
  const tokens = tokenize(CODE);
  let typing = { ti: 0, ci: 0, node: null, done: false, started: false };

  function renderAll() {
    codeOut.textContent = '';
    tokens.forEach(tk => {
      if (tk.c) { const s = document.createElement('span'); s.className = `tk-${tk.c}`; s.textContent = tk.t; codeOut.appendChild(s); }
      else codeOut.appendChild(document.createTextNode(tk.t));
    });
    typing.done = true;
    codeSkip.hidden = true;
  }
  function typeStep() {
    if (typing.done) return;
    let budget = 3;
    while (budget > 0 && typing.ti < tokens.length) {
      const tk = tokens[typing.ti];
      if (!typing.node) {
        if (tk.c) { typing.node = document.createElement('span'); typing.node.className = `tk-${tk.c}`; }
        else typing.node = document.createTextNode('');
        codeOut.appendChild(typing.node);
      }
      if (!tk.c && /^\s+$/.test(tk.t)) {
        typing.node.textContent = tk.t;
        typing.ti += 1; typing.ci = 0; typing.node = null;
        continue;
      }
      typing.node.textContent += tk.t[typing.ci];
      typing.ci += 1;
      budget -= 1;
      if (typing.ci >= tk.t.length) { typing.ti += 1; typing.ci = 0; typing.node = null; }
    }
    if (typing.ti >= tokens.length) { typing.done = true; codeSkip.hidden = true; return; }
    requestAnimationFrame(typeStep);
  }
  codeSkip.addEventListener('click', renderAll);
  if (reduced) renderAll();
  else {
    const codeObserver = new IntersectionObserver(entries => {
      if (entries.some(en => en.isIntersecting) && !typing.started) {
        typing.started = true;
        codeObserver.disconnect();
        requestAnimationFrame(typeStep);
      }
    }, { threshold: .35 });
    codeObserver.observe($('#codePre'));
  }

  /* ---------------- Stack Overflow (live) ---------------- */
  const soRep = $('#soRep');
  const soMeta = $('#soMeta');
  fetch('https://api.stackexchange.com/2.3/users/4226224?site=stackoverflow')
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(data => {
      const u = data && data.items && data.items[0];
      if (!u) throw new Error('no user');
      soRep.dataset.count = String(u.reputation);
      soRep.textContent = '0';
      countUp(soRep);
      const b = u.badge_counts || {};
      soMeta.textContent = `Reputation · ${b.gold || 0} gold · ${b.silver || 0} silver · ${b.bronze || 0} bronze badges — live from Stack Exchange.`;
      const fmt = () => { soRep.textContent = Number(u.reputation).toLocaleString('en-IN'); };
      setTimeout(fmt, reduced ? 0 : 1600);
    })
    .catch(() => { soRep.textContent = 'Contributor'; });

  /* ---------------- Greetings ---------------- */
  const GREET = [['Hello', 'en'], ['ನಮಸ್ಕಾರ', 'kn'], ['నమస్కారం', 'te'], ['नमस्ते', 'hi']];
  const helloWord = $('#helloWord');
  const langItems = $$('.hello__langs li');
  let gi = 0, greetTimer = null;
  function showGreeting(i) {
    langItems.forEach((li, k) => li.classList.toggle('is-current', k === i));
    if (reduced) { helloWord.textContent = GREET[i][0]; helloWord.lang = GREET[i][1]; return; }
    helloWord.classList.remove('is-in');
    helloWord.classList.add('is-out');
    setTimeout(() => {
      helloWord.textContent = GREET[i][0];
      helloWord.lang = GREET[i][1];
      helloWord.classList.remove('is-out');
      void helloWord.offsetWidth;
      helloWord.classList.add('is-in');
    }, 430);
  }
  langItems[0].classList.add('is-current');
  new IntersectionObserver(entries => {
    entries.forEach(en => {
      clearInterval(greetTimer);
      if (en.isIntersecting) greetTimer = setInterval(() => { gi = (gi + 1) % GREET.length; showGreeting(gi); }, 2000);
    });
  }, { threshold: .3 }).observe($('.hello'));

  /* ---------------- Copy email & toast ---------------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
  }
  $('#copyEmail').addEventListener('click', e => {
    const email = e.currentTarget.dataset.email;
    const fallback = () => { window.location.href = `mailto:${email}`; };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email).then(() => showToast('Email copied ✓ — talk soon.'), fallback);
    } else fallback();
  });

  /* ---------------- Cursor & magnetic ---------------- */
  if (finePointer && !reduced) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let mx = vw / 2, my = vh / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      cursor.classList.remove('is-out');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-out'));
    const loop = () => {
      rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', e => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, summary, [role="button"]');
      if (labelled && (!interactive || labelled.contains(interactive) || interactive === labelled)) {
        label.textContent = labelled.dataset.cursor;
        cursor.classList.add('is-label');
        cursor.classList.remove('is-hover');
      } else if (interactive) {
        cursor.classList.add('is-hover');
        cursor.classList.remove('is-label');
      } else {
        cursor.classList.remove('is-hover', 'is-label');
      }
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .25}px, ${dy * .35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- Init ---------------- */
  syncThemeUI();
  measureHero();
  layoutJourney();
  onScroll();
  requestAnimationFrame(vizLoop);
  boot();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  window.addEventListener('load', onResize);
})();
