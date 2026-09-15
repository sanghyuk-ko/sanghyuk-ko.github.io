/* Landing page: intro, gooey hero reveal, pinned ring scene, rendered lists */
(() => {
  const PF = window.PF;
  const D = window.PORTFOLIO;
  if (!PF || !D) return;
  const { reduce, fine } = PF;
  const $ = (s, r = document) => r.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
  const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };

  /* Three rings traced from the Hanwha symbol (source viewBox 168×156) */
  const RINGS = [
    { cx: 75, cy: 62, rx: 80, ry: 43, rot: -39, n: 150, rgb: [243, 115, 33] },
    { cx: 110, cy: 85, rx: 57, ry: 45, rot: 6, n: 110, rgb: [251, 181, 132] },
    { cx: 94, cy: 107, rx: 50, ry: 47, rot: 30, n: 96, rgb: [248, 155, 108] },
  ];
  const CUBES = 5;

  /* ==========================================================================
     Particle field — morphs between formations:
     0 scatter · 1 rings (logo) · 2 gyroscope · 3 block chain · 4 ledger sphere
     ========================================================================== */
  class Field {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = opts;
      this.stage = 0;
      this.highlight = -1;
      this.cubeHi = -1;
      this.time = 0;
      this.mx = 0; this.my = 0; this.tmx = 0; this.tmy = 0;
      this.hl = [0, 0, 0];
      this.hlAny = 0;
      this.parts = [];
      RINGS.forEach((r, ri) => {
        for (let i = 0; i < r.n; i++) this.parts.push({ ri, t: (i / r.n) * TAU, seed: Math.random(), cube: 0 });
      });
      this.build();
      this.resize = this.resize.bind(this);
      this.onMove = e => { this.tmx = e.clientX / innerWidth - 0.5; this.tmy = e.clientY / innerHeight - 0.5; };
      this.resize();
      addEventListener('resize', this.resize);
      if (fine) addEventListener('pointermove', this.onMove, { passive: true });
    }

    destroy() {
      removeEventListener('resize', this.resize);
      removeEventListener('pointermove', this.onMove);
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.mobile = this.w < 860;
      const span = Math.min(this.w * (this.mobile ? 0.92 : 0.5), this.h * (this.mobile ? 0.5 : 0.78));
      this.unit = (span / 200) * (this.o.scale || 1);
    }

    build() {
      const P = this.parts, N = P.length;
      this.F = [[], [], [], [], []];
      const golden = Math.PI * (3 - Math.sqrt(5));
      const zOff = [0, -10, 10];
      const corners = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) corners.push([a, b, c]);
      const edges = [];
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        let d = 0;
        for (let k = 0; k < 3; k++) if (corners[i][k] !== corners[j][k]) d++;
        if (d === 1) edges.push([corners[i], corners[j]]);
      }
      const perEdge = Math.ceil(Math.ceil(N / CUBES) / 12);
      const cubeCount = new Array(CUBES).fill(0);

      P.forEach((p, i) => {
        const r = RINGS[p.ri];
        // scatter
        const u = Math.random() * 2 - 1, th = Math.random() * TAU, rad = 90 + Math.random() * 150, s = Math.sqrt(1 - u * u);
        this.F[0].push([rad * s * Math.cos(th), rad * u * 0.7, rad * s * Math.sin(th)]);
        // rings, as drawn in the logo
        const c = Math.cos(p.t), sn = Math.sin(p.t), ro = (r.rot * Math.PI) / 180, co = Math.cos(ro), so = Math.sin(ro);
        const x = r.cx + r.rx * c * co - r.ry * sn * so;
        const y = r.cy + r.rx * c * so + r.ry * sn * co;
        this.F[1].push([x - 88, y - 80, zOff[p.ri]]);
        // gyroscope: local circle, oriented per frame
        const gr = [92, 70, 50][p.ri];
        this.F[2].push([gr * Math.cos(p.t), gr * Math.sin(p.t), 0]);
        // chain: cube edges, offset per frame
        const cube = i % CUBES, j = cubeCount[cube]++;
        const e = edges[j % 12], f = ((Math.floor(j / 12) % perEdge) + 0.5) / perEdge, half = 17;
        p.cube = cube;
        this.F[3].push([0, 1, 2].map(k => (e[0][k] + (e[1][k] - e[0][k]) * f) * half));
        // ledger sphere (fibonacci)
        const yy = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - yy * yy), a = i * golden, R = 88;
        this.F[4].push([Math.cos(a) * rr * R, yy * R, Math.sin(a) * rr * R]);
      });
    }

    pos(f, i, t) {
      const p = this.parts[i], b = this.F[f][i];
      switch (f) {
        case 0: return [b[0] + Math.sin(t * 0.6 + p.seed * 9) * 6, b[1] + Math.cos(t * 0.5 + p.seed * 7) * 6, b[2]];
        case 1: return [b[0], b[1] + Math.sin(t * 1.2 + p.t) * 0.8, b[2]];
        case 2:
          if (p.ri === 0) return rotY(rotX(b, 1.15), t * 0.55);
          if (p.ri === 1) return rotX(rotY(b, 1.2), t * 0.7 + 1);
          return rotZ(rotY(rotX(b, 0.5), t * 0.9 + 2), 0.6);
        case 3: {
          const k = p.cube - 2;
          const v = rotY(rotX(b, t * 0.5 + p.cube * 0.7), t * 0.4 + p.cube);
          return [v[0] + k * 46, v[1] + Math.sin(t * 1.1 + p.cube) * 5, v[2] - k * 30];
        }
        default: return rotY(rotX(b, 0.35), t * 0.25);
      }
    }

    frame(dt) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      this.time += dt;
      const t = this.time, ctx = this.ctx, W = this.w, H = this.h, U = this.unit;
      this.mx += (this.tmx - this.mx) * 0.04;
      this.my += (this.tmy - this.my) * 0.04;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W * (this.mobile ? 0.5 : this.o.cx ?? 0.5);
      const cy = H * (this.mobile ? this.o.cyMobile ?? 0.5 : this.o.cy ?? 0.5);
      const s = Math.max(0, Math.min(4, this.stage));
      const A = Math.min(3, Math.floor(s)), fr = s - A;
      const ry = this.mx * 0.5 + (this.o.spin ? t * this.o.spin : 0);
      const rx = this.my * 0.35 + (this.o.baseRotX || 0);
      for (let k = 0; k < 3; k++) this.hl[k] += ((this.highlight === k ? 1 : 0) - this.hl[k]) * 0.08;
      this.hlAny += ((this.highlight >= 0 ? 1 : 0) - this.hlAny) * 0.08;
      const chainW = 1 - Math.min(1, Math.abs(s - 3));
      const FOV = 900;

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.parts.length; i++) {
        const p = this.parts[i];
        const k = ease(clamp01((fr - p.seed * 0.35) / 0.65));
        const a = this.pos(A, i, t);
        const b = k > 0 ? this.pos(A + 1, i, t) : a;
        let v = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
        v = rotX(rotY(v, ry), rx);
        const persp = FOV / (FOV + v[2] * U);
        const X = cx + v[0] * U * persp, Y = cy + v[1] * U * persp;

        let [cr, cg, cb] = RINGS[p.ri].rgb;
        let alpha = 0.32 + 0.68 * clamp01((persp - 0.75) / 0.5);
        let size = 1.5 * persp * Math.max(1, U / 2.6);
        if (this.hlAny > 0.01) {
          const h = this.hl[p.ri];
          alpha *= 1 - this.hlAny * 0.7 + h * 0.7;
          size *= 1 + h * 0.6;
        }
        if (chainW > 0) {
          const on = this.cubeHi === p.cube ? 1 : 0;
          const mix = chainW * (1 - on);
          cr += (228 - cr) * mix; cg += (228 - cg) * mix; cb += (226 - cb) * mix;
          size *= 1 + on * chainW * 0.5;
        }
        ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(X, Y, Math.max(0.4, size), 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (chainW > 0.02) {
        const centers = [];
        for (let c = 0; c < CUBES; c++) {
          let v = [(c - 2) * 46, Math.sin(t * 1.1 + c) * 5, -(c - 2) * 30];
          v = rotX(rotY(v, ry), rx);
          const pp = FOV / (FOV + v[2] * U);
          centers.push([cx + v[0] * U * pp, cy + v[1] * U * pp, pp]);
        }
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -t * 24;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(243,115,33,${(0.6 * chainW).toFixed(3)})`;
        ctx.beginPath();
        for (let c = 0; c < CUBES - 1; c++) { ctx.moveTo(centers[c][0], centers[c][1]); ctx.lineTo(centers[c + 1][0], centers[c + 1][1]); }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        centers.forEach(([x, y, pp], c) => {
          ctx.fillStyle = c === this.cubeHi ? `rgba(243,115,33,${chainW})` : `rgba(255,255,255,${(0.5 * chainW).toFixed(3)})`;
          ctx.fillText(`#${String(18200 + c).padStart(6, '0')}`, x, y + 17 * 1.9 * U * pp + 14);
        });
      }
    }
  }

  /* ==========================================================================
     Lists
     ========================================================================== */
  function renderMarquee() {
    const track = $('#marqueeTrack');
    if (!track) return;
    const items = D.marquee.map(t => `<span class="marquee__item">${PF.esc(t)}</span>`).join('');
    track.innerHTML = items + items;
  }

  function renderWork() {
    const grid = $('#workGrid');
    if (!grid) return;
    const total = D.projects.length;
    grid.innerHTML = D.projects.map((p, i) => `
      <a class="card span-${p.span || 4}" href="project.html?id=${encodeURIComponent(p.id)}"
         data-transition="${PF.esc(`${PF.pad(i + 1)}|${p.title}`)}" data-spotlight data-cursor="VIEW" data-reveal style="--d:${((i % 3) * 0.07).toFixed(2)}s">
        <div class="card__visual">${PF.visual(p.visual)}</div>
        <span class="card__index">${PF.pad(i + 1)} / ${PF.pad(total)}</span>
        <span class="card__tag">${PF.esc(p.category)}</span>
        <p class="card__meta">${PF.esc(p.period)} · ${PF.esc(p.org)}</p>
        <h3 class="card__title">${PF.esc(p.title)}</h3>
        <p class="card__desc">${PF.esc(p.oneLiner)}</p>
        <div class="chips">${p.stack.slice(0, 4).map(s => `<span class="chip">${PF.esc(s)}</span>`).join('')}</div>
        <span class="card__go" aria-hidden="true">→</span>
      </a>`).join('');
    const count = $('#workCount');
    if (count) count.textContent = PF.pad(total);
  }

  function renderExperience() {
    const list = $('#xpList');
    if (list) {
      list.innerHTML = D.experience.map((x, i) => `
        <article class="xp" data-reveal style="--d:${(i * 0.04).toFixed(2)}s">
          <div class="xp__date">${PF.esc(x.date)}</div>
          <h3 class="xp__org">${PF.esc(x.org)}<span class="xp__role">${PF.esc(x.role)}</span></h3>
          <div><p class="xp__desc">${PF.rich(x.desc)}</p>${x.badge ? `<span class="xp__badge">${PF.esc(x.badge)}</span>` : ''}</div>
        </article>`).join('');
    }
    const edu = $('#eduGrid');
    if (edu) {
      edu.innerHTML = D.education.map((e, i) => `
        <div class="edu" data-reveal style="--d:${(i * 0.06).toFixed(2)}s"><small>${PF.esc(e.label)}</small><p><b>${PF.esc(e.title)}</b>${PF.esc(e.sub)}</p></div>`).join('');
    }
  }

  /* ==========================================================================
     Intro — dotted rings assemble and spin, then wipe up
     ========================================================================== */
  function runIntro(done) {
    const intro = $('.intro');
    if (!intro) { done(); return; }
    let seen = false;
    try { seen = sessionStorage.getItem('pf-intro') === '1'; } catch (_) { /* ignore */ }
    if (reduce || seen || PF.entering || location.hash) { intro.hidden = true; done(); return; }
    try { sessionStorage.setItem('pf-intro', '1'); } catch (_) { /* ignore */ }

    PF.lock(true);
    const field = new Field(intro.querySelector('canvas'), { scale: 0.55, spin: 0.9, cy: 0.46, cyMobile: 0.44, baseRotX: 0.25 });
    const count = intro.querySelector('.intro__count');
    const DUR = 2000, t0 = performance.now();
    let last = t0, closing = false, alive = true;

    const close = () => {
      if (closing) return;
      closing = true;
      PF.lock(false);
      done();
      intro.classList.add('is-out');
      setTimeout(() => { alive = false; field.destroy(); intro.hidden = true; }, 1000);
    };
    intro.querySelector('.intro__skip')?.addEventListener('click', close);

    const loop = now => {
      if (!alive) return;
      const k = Math.min(1, (now - t0) / DUR);
      field.stage = 0.08 + 0.92 * ease(k);
      field.frame((now - last) / 1000);
      last = now;
      count.textContent = String(Math.round(k * 100)).padStart(3, '0');
      if (k >= 1 && now - t0 > DUR + 380) close();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ==========================================================================
     Hero — metallic headline; a gooey blob trail reveals the orange layer beneath
     ========================================================================== */
  function initHero() {
    const hero = $('.hero'), svg = $('#heroSvg');
    if (!hero || !svg) return null;
    const cfg = D.hero;
    const surface = svg.querySelector('.surface');
    const beneath = svg.querySelector('.beneath-content');
    const blobsG = svg.querySelector('#blobs');
    const blur = svg.querySelector('#gooBlur');
    const mk = (tag, attrs, text) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      if (text != null) el.textContent = text;
      return el;
    };
    let W = 1, H = 1, R = 1, started = false, running = false, visible = true;

    function layout() {
      const box = svg.getBoundingClientRect();
      if (!box.width) return;
      W = box.width; H = box.height; R = Math.min(W, H);
      svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
      blur.setAttribute('stdDeviation', (R * 0.026).toFixed(1));
      const mobile = W < 700;
      const lines = mobile ? cfg.linesMobile : cfg.lines;

      surface.replaceChildren();
      beneath.replaceChildren();
      const probes = lines.map(t => surface.appendChild(mk('text', { x: 0, y: -1000, 'font-size': 100 }, t)));
      const widest = Math.max(...probes.map(el => el.getComputedTextLength())) || 600;
      surface.replaceChildren();

      const fs = Math.min((100 * W * (mobile ? 0.9 : 0.84)) / widest, H * (mobile ? 0.16 : 0.29));
      const lh = fs * 0.95, cap = fs * 0.72;
      const base = H * (mobile ? 0.45 : 0.47) - (lh * (lines.length - 1) + cap) / 2 + cap;
      lines.forEach((t, i) => {
        const a = { x: (W / 2).toFixed(1), y: (base + i * lh).toFixed(1), 'font-size': fs.toFixed(1), 'text-anchor': 'middle' };
        surface.appendChild(mk('text', a, t));
        beneath.appendChild(mk('text', { ...a, class: 'big' }, t));
      });

      const efs = Math.max(10, Math.min(13, W * 0.009));
      const top = base - cap, bottom = base + (lines.length - 1) * lh;
      const slots = [];
      [top - efs * 2.6, top - efs * 4.8, bottom + efs * 3.2, bottom + efs * 5.4].forEach(y => {
        if (mobile) slots.push([W / 2, y, 'middle']);
        else slots.push([W * 0.07, y, 'start'], [W * 0.93, y, 'end']);
      });
      cfg.evidence.slice(0, slots.length).forEach((t, i) => {
        const [x, y, anchor] = slots[i];
        beneath.appendChild(mk('text', { class: 'evi', x: x.toFixed(1), y: y.toFixed(1), 'font-size': efs.toFixed(1), 'text-anchor': anchor }, t));
      });
    }

    const COUNT = 12;
    const blobs = Array.from({ length: COUNT }, () => ({
      el: blobsG.appendChild(mk('circle', { cx: -999, cy: -999, r: 0, fill: '#fff' })), x: 0, y: 0,
    }));
    let px = 0, py = 0, lastMove = -1e9, power = 0, t0 = 0;
    const setPointer = e => {
      const b = svg.getBoundingClientRect();
      px = e.clientX - b.left; py = e.clientY - b.top;
      lastMove = performance.now();
    };
    hero.addEventListener('pointermove', setPointer, { passive: true });
    hero.addEventListener('pointerdown', setPointer, { passive: true });
    hero.addEventListener('pointerleave', () => { lastMove = -1e9; });

    function tick(now) {
      if (!running) return;
      const t = (now - t0) / 1000;
      const live = now - lastMove < 2400;
      const tx = live ? px : W * (0.5 + 0.34 * Math.sin(t * 0.45 - 1.2));
      const ty = live ? py : H * (0.47 + 0.13 * Math.sin(t * 0.83 + 0.6));
      power += ((live ? 1 : 0.82) - power) * 0.04;
      for (let i = 0; i < COUNT; i++) {
        const b = blobs[i], lead = i ? blobs[i - 1] : null;
        const k = i ? 0.36 : live ? 0.24 : 0.05;
        b.x += ((lead ? lead.x : tx) - b.x) * k;
        b.y += ((lead ? lead.y : ty) - b.y) * k;
        const r = R * 0.1 * (1 - (i / COUNT) * 0.72) * power * (1 + 0.1 * Math.sin(t * 2.2 + i * 0.9));
        b.el.setAttribute('cx', b.x.toFixed(1));
        b.el.setAttribute('cy', b.y.toFixed(1));
        b.el.setAttribute('r', Math.max(0, r).toFixed(1));
      }
      requestAnimationFrame(tick);
    }
    const run = () => {
      if (!started || reduce || running || !visible) return;
      running = true;
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) run(); else running = false;
    }).observe(hero);

    layout();
    document.fonts?.ready.then(layout);
    let lastW = innerWidth, lastH = innerHeight, rt;
    addEventListener('resize', () => {
      // mobile URL-bar resizes only change height slightly; skip those
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;
      lastW = innerWidth; lastH = innerHeight;
      clearTimeout(rt);
      rt = setTimeout(layout, 120);
    });

    return {
      start() {
        if (started) return;
        started = true;
        layout();
        requestAnimationFrame(() => hero.classList.add('is-ready'));
        t0 = performance.now();
        blobs.forEach(b => { b.x = W * 0.16; b.y = H * 0.47; });
        setTimeout(run, 700);
      },
    };
  }

  /* ==========================================================================
     Scene — scroll drives formation, chapter, HUD
     ========================================================================== */
  function initScene() {
    const scene = $('.scene');
    if (!scene) return;
    const field = new Field(scene.querySelector('.scene__canvas'), { cx: 0.68, cy: 0.5, cyMobile: 0.33 });
    const chapters = [...scene.querySelectorAll('.chapter')];
    const ranges = chapters.map(c => c.dataset.range.split(',').map(Number));
    const principles = [...scene.querySelectorAll('.principle')];
    const num = scene.querySelector('.hud__num');
    const bar = scene.querySelector('.hud__bar i');
    const hud = key => scene.querySelector(`[data-hud="${key}"]`);
    const hudForm = hud('form'), hudBlock = hud('block'), hudHash = hud('hash');
    const FORMS = ['SCATTER', 'RINGS', 'GYROSCOPE', 'CHAIN', 'LEDGER'];
    const KEYS = [[0, 0.15], [0.12, 1], [0.22, 1], [0.3, 2], [0.47, 2], [0.56, 3], [0.72, 3], [0.82, 4], [1, 4]];
    const stageAt = p => {
      for (let i = 1; i < KEYS.length; i++) {
        if (p <= KEYS[i][0]) {
          const [a, sa] = KEYS[i - 1], [b, sb] = KEYS[i];
          return sa + (sb - sa) * ((p - a) / (b - a));
        }
      }
      return 4;
    };
    const hex = n => {
      let h = 2166136261 ^ n;
      for (let i = 0; i < 4; i++) h = Math.imul(h ^ (h >>> 13), 16777619);
      return (h >>> 0).toString(16).padStart(8, '0');
    };
    const counted = new Set();
    const FADE = 0.035;

    function update() {
      const r = scene.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = total > 0 ? clamp01(-r.top / total) : 0;
      field.stage = stageAt(p);

      let active = 0;
      chapters.forEach((ch, i) => {
        const [a, b] = ranges[i];
        let o = 1, dir = 0;
        if (p < a) { o = i === 0 ? 1 : 1 - (a - p) / FADE; dir = 1; }
        else if (p > b) { o = i === chapters.length - 1 ? 1 : 1 - (p - b) / FADE; dir = -1; }
        o = clamp01(o);
        ch.style.opacity = o.toFixed(3);
        ch.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        ch.style.setProperty('--shift', `${((1 - o) * 36 * dir).toFixed(1)}px`);
        if (o > 0.5) active = i;
        if (o > 0.6 && !counted.has(i)) {
          counted.add(i);
          ch.querySelectorAll('[data-count]').forEach(PF.countUp);
        }
      });

      const [pa, pb] = ranges[1];
      const pIdx = p >= pa - 0.01 && p <= pb + 0.01 ? Math.max(0, Math.min(2, Math.floor(((p - pa) / (pb - pa)) * 3))) : -1;
      field.highlight = pIdx;
      principles.forEach((el, i) => el.classList.toggle('is-on', i === pIdx));

      const [ca, cb] = ranges[2];
      field.cubeHi = p >= ca && p <= cb ? Math.min(CUBES - 1, Math.floor(((p - ca) / (cb - ca)) * CUBES)) : -1;

      num.textContent = PF.pad(active + 1);
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const blk = Math.floor(p * 18204);
      hudBlock.textContent = `#${String(blk).padStart(6, '0')}`;
      hudHash.textContent = `0x${hex(blk)}…${hex(blk + 7).slice(0, 4)}`;
      hudForm.textContent = FORMS[Math.round(field.stage)];
    }
    PF.onScroll(update);

    let visible = false, running = false, last = 0;
    const loop = now => {
      if (!visible) { running = false; return; }
      field.frame((now - last) / 1000);
      last = now;
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }).observe(scene);
  }

  /* ==========================================================================
     Floating contact button
     ========================================================================== */
  function initFab() {
    const fab = $('.fab'), contact = $('#contact'), scene = $('.scene');
    if (!fab) return;
    PF.onScroll(() => {
      // stay out of the way of the hero and the scene HUD; hide again once contact is on screen
      const pastScene = scene ? scene.getBoundingClientRect().bottom < innerHeight * 0.5 : true;
      const cTop = contact ? contact.getBoundingClientRect().top : Infinity;
      fab.classList.toggle('is-on', pastScene && cTop > innerHeight * 0.6);
    });
  }

  /* ---------- boot ---------- */
  renderMarquee();
  renderWork();
  renderExperience();
  PF.observeReveals();
  PF.bindMarquees();
  PF.bindMagnetic();
  const hero = initHero();
  initScene();
  initFab();
  runIntro(() => hero && hero.start());
})();
