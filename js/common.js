/* Shared runtime: smooth scroll, header, cursor, reveals, counters, page transitions, visuals */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const PF = (window.PF = window.PF || {});
  Object.assign(PF, { reduce, fine });

  /* ---------- helpers ---------- */
  PF.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PF.rich = s => PF.esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
  PF.pad = n => String(n).padStart(2, '0');

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.1, touchMultiplier: 1.3 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  PF.lenis = lenis;

  const scrollFns = [];
  const emit = () => { const y = window.scrollY; for (const fn of scrollFns) fn(y); };
  PF.onScroll = fn => { scrollFns.push(fn); fn(window.scrollY); };
  addEventListener('scroll', emit, { passive: true });
  addEventListener('resize', emit);

  PF.lock = on => {
    document.body.classList.toggle('is-locked', on);
    if (lenis) on ? lenis.stop() : lenis.start();
  };
  PF.scrollTo = target => {
    if (lenis) { lenis.scrollTo(target, { duration: 1.4 }); return; }
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const el = hash.length > 1 && document.querySelector(hash);
    if (!el) return;
    e.preventDefault();
    PF.scrollTo(el);
    history.replaceState(null, '', hash);
  });

  /* ---------- header ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    let last = window.scrollY;
    PF.onScroll(y => {
      header.classList.toggle('is-hidden', y > last && y > 240);
      header.classList.toggle('is-scrolled', y > 40);
      last = y;
    });
  }

  const navLinks = [...document.querySelectorAll('.pill-nav a[href^="#"]')];
  if (navLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => a.classList.remove('is-active'));
        byId.get(en.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- cursor ---------- */
  if (fine && !reduce) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor__ring"><span class="cursor__label">VIEW</span></div><div class="cursor__dot"></div>';
    document.body.appendChild(c);
    root.classList.add('has-cursor');
    const ring = c.firstElementChild, dot = c.lastElementChild, label = ring.firstElementChild;
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener('pointermove', e => {
      if (!c.classList.contains('is-on')) { rx = e.clientX; ry = e.clientY; c.classList.add('is-on'); }
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    const tick = () => {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor], a, button');
      c.classList.remove('is-link', 'is-view');
      if (!t) return;
      if (t.dataset.cursor) { label.textContent = t.dataset.cursor; c.classList.add('is-view'); }
      else c.classList.add('is-link');
    });
  }

  /* card spotlight */
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('[data-spotlight]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* magnetic */
  PF.bindMagnetic = (scope = document) => {
    if (!fine || reduce) return;
    scope.querySelectorAll('[data-magnetic]').forEach(el => {
      const k = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * k}px, ${(e.clientY - r.top - r.height / 2) * k}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  };

  /* ---------- reveals & counters ---------- */
  PF.countUp = el => {
    const raw = el.dataset.count;
    const target = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(target)) return;
    const dec = (raw.split('.')[1] || '').length;
    const comma = raw.includes(',');
    const fmt = v => comma
      ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec);
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  PF.observeReveals = (scope = document) => {
    const els = [...scope.querySelectorAll('[data-reveal]:not(.is-in), [data-reveal-lines]:not(.is-in)')];
    const onIn = el => {
      el.classList.add('is-in');
      el.querySelectorAll('[data-count]').forEach(PF.countUp);
    };
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(onIn); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { onIn(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(el => io.observe(el));
  };

  /* ---------- marquee (speeds up with scroll velocity) ---------- */
  PF.bindMarquees = () => {
    document.querySelectorAll('[data-marquee]').forEach(m => {
      const track = m.querySelector('.marquee__track');
      if (!track || reduce) return;
      const dir = m.dataset.marquee === 'right' ? 1 : -1;
      let x = 0, v = 0, lastY = window.scrollY, visible = false;
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(m);
      PF.onScroll(y => { v += Math.abs(y - lastY) * 0.08; lastY = y; });
      const loop = () => {
        v *= 0.9;
        if (visible) {
          const half = track.scrollWidth / 2;
          x += dir * (0.6 + Math.min(v, 14));
          if (x <= -half) x += half;
          if (x > 0) x -= half;
          track.style.transform = `translate3d(${x}px,0,0)`;
        }
        requestAnimationFrame(loop);
      };
      loop();
    });
  };

  /* ---------- page transitions ---------- */
  const wipe = document.createElement('div');
  wipe.className = 'wipe';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<div class="wipe__fill"></div><div class="wipe__label"></div>';
  document.body.appendChild(wipe);
  const fill = wipe.firstElementChild, wlabel = wipe.lastElementChild;
  const setLabel = raw => {
    const [num, title] = String(raw || '').split('|');
    wlabel.innerHTML = title ? `<small>${PF.esc(num)} —</small>${PF.esc(title)}` : PF.esc(num);
  };

  PF.navigate = (href, x = innerWidth / 2, y = innerHeight / 2, label = '') => {
    if (reduce) { location.href = href; return; }
    try { sessionStorage.setItem('pf-wipe', label || ' '); } catch (_) { /* storage unavailable */ }
    setLabel(label);
    wipe.classList.add('is-active');
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const anim = fill.animate(
      [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }],
      { duration: 800, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
    );
    wlabel.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }],
      { duration: 600, delay: 380, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    anim.onfinish = () => { location.href = href; };
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-transition]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    PF.navigate(a.href, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, a.dataset.transition);
  });

  let entering = null;
  try { entering = sessionStorage.getItem('pf-wipe'); sessionStorage.removeItem('pf-wipe'); } catch (_) { /* ignore */ }
  PF.entering = !!entering && !reduce;
  root.classList.remove('pf-entering');
  if (PF.entering) {
    setLabel(entering.trim());
    wipe.classList.add('is-active');
    fill.style.clipPath = 'inset(0 0 0 0)';
    wlabel.style.opacity = '1';
    setTimeout(() => {
      const out = fill.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
        { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      wlabel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-30px)' }],
        { duration: 450, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = resetWipe;
    }, 280);
  }
  function resetWipe() {
    wipe.classList.remove('is-active');
    fill.getAnimations().forEach(a => a.cancel());
    wlabel.getAnimations().forEach(a => a.cancel());
    fill.style.clipPath = '';
    wlabel.style.opacity = '';
  }
  addEventListener('pageshow', e => { if (e.persisted) resetWipe(); });

  /* ---------- code highlighting ---------- */
  const KEYWORDS = 'function|returns?|if|else|for|while|require|revert|emit|event|error|mapping|struct|enum|contract|modifier|override|internal|external|public|private|view|pure|memory|storage|calldata|uint256|uint8|uint64|address|bool|bytes32|string|const|let|var|async|await|new|class|extends|import|from|export|interface|type|void|null|true|false|this|super|try|catch|finally|throw|static|final|synchronized|volatile|implements|package|delete|typeof|in|of|break|continue';
  const TOKEN = new RegExp(`(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(@\\w+)|\\b(${KEYWORDS})\\b`, 'g');
  PF.highlight = code => {
    let out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += PF.esc(code.slice(last, m.index));
      const cls = m[1] ? 'tok-c' : m[2] ? 'tok-s' : m[3] ? 'tok-n' : 'tok-k';
      out += `<span class="${cls}">${PF.esc(m[0])}</span>`;
      last = TOKEN.lastIndex;
    }
    return out + PF.esc(code.slice(last));
  };

  /* ---------- visuals (inline SVG per project) ---------- */
  let uid = 0;
  const O = '#F37321';
  const VIS = {
    tranche: u => `
      <defs><linearGradient id="tg${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${O}" stop-opacity=".9"/><stop offset="1" stop-color="${O}" stop-opacity=".06"/></linearGradient></defs>
      <text x="40" y="30">ART-ABS POOL</text>
      <rect class="box" x="40" y="44" width="96" height="172" rx="12"/>
      <rect x="40" y="92" width="96" height="124" rx="12" fill="url(#tg${u})"/>
      <line class="ln" x1="40" x2="136" y1="126" y2="126"/><line class="ln" x1="40" x2="136" y1="160" y2="160"/><line class="ln" x1="40" x2="136" y1="192" y2="192"/>
      <path class="flow" d="M136 106 C196 106 196 66 252 66"/>
      <path class="flow" d="M136 140 C196 140 196 130 252 130" style="animation-delay:-.45s"/>
      <path class="flow" d="M136 176 C196 176 196 194 252 194" style="animation-delay:-.9s"/>
      <rect class="box" x="252" y="44" width="116" height="44" rx="10"/>
      <rect class="grow" x="252" y="44" width="116" height="44" rx="10" fill="${O}" fill-opacity=".9" style="--gd:.3s"/>
      <text class="t-d" x="264" y="70">SENIOR</text><text class="t-d" x="356" y="70" text-anchor="end">6%</text>
      <rect class="box" x="252" y="108" width="116" height="44" rx="10"/>
      <rect class="grow" x="252" y="108" width="76" height="44" rx="10" fill="${O}" fill-opacity=".5" style="--gd:.6s"/>
      <text class="t-w" x="264" y="134">MEZZANINE</text><text x="356" y="134" text-anchor="end">9%</text>
      <rect class="box" x="252" y="172" width="116" height="44" rx="10"/>
      <rect class="grow" x="252" y="172" width="34" height="44" rx="10" fill="${O}" fill-opacity=".28" style="--gd:.9s"/>
      <text class="t-w" x="264" y="198">EQUITY</text><text x="356" y="198" text-anchor="end">REST</text>
      <text x="40" y="244">WATERFALL</text><text class="t-o" x="368" y="244" text-anchor="end">2-OF-3 ORACLE</text>`,

    screening: () => {
      const rows = [['KR-0192', .31], ['NS-00481', .12], ['SDN-12093', .94], ['UN-QDi.412', .46], ['KR-3310', .08]];
      return `<text x="40" y="30">SCREENING · OFAC / UN</text><text class="t-o" x="360" y="30" text-anchor="end">FATF</text>` +
        rows.map(([id, s], i) => {
          const y = 44 + i * 36, hit = s > .9;
          return `<rect class="${hit ? 'box-o' : 'box'}" x="40" y="${y}" width="320" height="28" rx="8"/>
            <text class="${hit ? 't-o' : 't-w'}" x="54" y="${y + 18}">${id}</text>
            <rect x="170" y="${y + 11}" width="120" height="6" rx="3" fill="rgba(255,255,255,.08)"/>
            <rect class="grow" x="170" y="${y + 11}" width="${(s * 120).toFixed(0)}" height="6" rx="3" fill="${hit ? O : 'rgba(255,255,255,.34)'}" style="--gd:${(.2 + i * .12).toFixed(2)}s"/>
            <text class="${hit ? 't-o' : ''}" x="346" y="${y + 18}" text-anchor="end">${s.toFixed(2)}</text>
            ${hit ? `<circle class="pulse" cx="30" cy="${y + 14}" r="3" fill="${O}"/>` : ''}`;
        }).join('') +
        `<rect class="scan" x="40" y="44" width="320" height="1.5" fill="${O}" opacity=".55"/>
         <text x="40" y="236">FALSE POSITIVE</text><text class="t-o" x="360" y="236" text-anchor="end">2.7% → 0.27%</text>`;
    },

    latency: () => `
      <text x="40" y="30">QUOTE LATENCY</text><text class="t-o" x="360" y="30" text-anchor="end">&lt;1ms</text>
      <line class="ln" x1="40" y1="84" x2="360" y2="84" stroke-dasharray="2 5"/><line class="ln" x1="40" y1="148" x2="360" y2="148" stroke-dasharray="2 5"/>
      <line class="ln" x1="40" y1="212" x2="360" y2="212"/>
      <text x="40" y="76">300ms</text><text x="40" y="140">150ms</text>
      <line x1="238" y1="48" x2="238" y2="212" stroke="rgba(243,115,33,.45)" stroke-dasharray="2 4"/>
      <text class="t-o" x="246" y="60">CACHE 1s</text>
      <path class="ln-o draw" pathLength="1" d="M40 110 L62 132 L84 96 L106 124 L128 90 L150 118 L172 100 L194 136 L216 98 L234 116 L246 208 L360 208"/>
      <circle class="pulse" cx="246" cy="208" r="4" fill="${O}"/>
      <text x="40" y="240">@Scheduled · AtomicReference</text>`,

    pipeline: u => {
      const d = 'M50 130 C100 58 150 58 200 130 S300 202 350 130';
      const nodes = [[50, 130, 'RECEIVED', -18], [118, 80, 'FETCH', -18], [200, 130, 'SANDBOX', 30], [282, 180, 'EXEC', 30], [350, 130, 'DONE', -18]];
      return `<path id="pp${u}" class="ln" d="${d}"/><path class="flow" d="${d}"/>` +
        nodes.map(([x, y, l, dy], i) => `<circle cx="${x}" cy="${y}" r="8" fill="${i === 4 ? O : '#0f0f10'}" stroke="${O}" stroke-width="1.4"/>
          <text class="${i === 4 ? 't-o' : 't-w'}" x="${x}" y="${y + dy}" text-anchor="middle">${l}</text>`).join('') +
        `<circle r="4.5" fill="#fff"><animateMotion dur="3.4s" repeatCount="indefinite"><mpath href="#pp${u}"/></animateMotion></circle>
         <text x="40" y="244">SSE STREAM</text><text class="t-o" x="360" y="244" text-anchor="end">≥ 2s / STAGE</text>`;
    },

    accounts: () => `
      <text class="t-o" x="200" y="38" text-anchor="middle">QUICK CREATE LINK →</text>
      <rect class="box" x="30" y="56" width="140" height="150" rx="14"/>
      <text x="46" y="82">PLATFORM</text><text class="t-w" x="46" y="98">D-LIGHT</text>
      <rect class="box" x="46" y="124" width="108" height="26" rx="13"/><text x="100" y="141" text-anchor="middle">TOKEN</text>
      <rect class="box" x="46" y="160" width="108" height="26" rx="13"/><text x="100" y="177" text-anchor="middle">EXTERNAL ID</text>
      <rect class="box-o" x="230" y="56" width="140" height="150" rx="14"/>
      <text class="t-o" x="246" y="82">YOUR AWS</text><text class="t-w" x="246" y="98">ACCOUNT</text>
      <rect class="box" x="262" y="120" width="76" height="16" rx="4"/>
      <rect class="box" x="262" y="142" width="76" height="16" rx="4"/>
      <rect x="262" y="164" width="76" height="16" rx="4" fill="${O}" class="pulse"/>
      <path class="flow" d="M170 112 L230 112"/>
      <path class="flow" d="M230 168 L170 168" style="animation-direction:reverse"/>
      <text x="200" y="232" text-anchor="middle">← CALLBACK · ROLE ARN</text>`,

    migration: () => `
      <text x="40" y="36">E2E RUNTIME</text><text class="t-o" x="360" y="36" text-anchor="end">−70%</text>
      <text class="t-w" x="40" y="84">KATALON</text>
      <rect x="40" y="94" width="320" height="24" rx="6" fill="rgba(255,255,255,.06)"/>
      <rect class="grow" x="40" y="94" width="320" height="24" rx="6" fill="rgba(255,255,255,.3)" style="--gd:.2s"/>
      <text class="t-o" x="40" y="156">PLAYWRIGHT</text>
      <rect x="40" y="166" width="320" height="24" rx="6" fill="none" stroke="rgba(255,255,255,.12)" stroke-dasharray="3 4"/>
      <rect class="grow" x="40" y="166" width="96" height="24" rx="6" fill="${O}" style="--gd:.8s"/>
      <text x="40" y="232">LICENSE −$2,000 / YR</text><text x="360" y="232" text-anchor="end">LANES ∥</text>`,

    signature: () => {
      const steps = [[70, 'NONCE', '#'], [160, 'SIGN', '✎'], [250, 'VERIFY', '✓'], [340, 'BURN', '×']];
      return `<text x="40" y="36">WALLET LOGIN · ONE-TIME NONCE</text>
        <line class="ln" x1="70" y1="112" x2="340" y2="112"/><line class="flow" x1="70" y1="112" x2="340" y2="112"/>` +
        steps.map(([x, l, g], i) => `<circle cx="${x}" cy="112" r="24" fill="${i === 3 ? O : '#0f0f10'}" stroke="${i === 2 ? O : 'rgba(255,255,255,.2)'}" stroke-width="1.2"/>
          <text x="${x}" y="117" text-anchor="middle" style="font-size:15px;fill:${i === 3 ? '#0a0a0a' : i === 2 ? O : 'rgba(255,255,255,.85)'}">${g}</text>
          <text class="${i === 2 ? 't-o' : ''}" x="${x}" y="164" text-anchor="middle">${l}</text>`).join('') +
        `<text class="t-w" x="40" y="220">0x9f3c…a1e4</text><text class="t-o" x="360" y="220" text-anchor="end">recover == address</text>`;
    },

    regulation: () => {
      const widths = [150, 128, 142, 120, 150, 96, 136, 150, 110, 70];
      return `<rect class="box" x="40" y="30" width="190" height="204" rx="12"/>` +
        widths.map((w, i) => {
          const hot = i === 3 || i === 7;
          return `<rect x="58" y="${54 + i * 17}" width="${w}" height="5" rx="2.5" fill="rgba(255,255,255,.13)"/>` +
            (hot ? `<rect class="grow" x="58" y="${54 + i * 17}" width="${w}" height="5" rx="2.5" fill="${O}" style="--gd:${i === 3 ? .4 : .9}s"/>` : '');
        }).join('') +
        `<rect class="scan" x="48" y="42" width="174" height="1.5" fill="${O}" opacity=".55"/>
        <rect class="box-o" x="252" y="40" width="112" height="30" rx="8"/><text class="t-o" x="266" y="59">HIGH</text><circle cx="350" cy="55" r="3" fill="${O}" class="pulse"/>
        <rect class="box" x="252" y="80" width="112" height="30" rx="8"/><text class="t-w" x="266" y="99">MEDIUM</text>
        <rect class="box" x="252" y="120" width="112" height="30" rx="8"/><text x="266" y="139">LOW</text>
        <text x="252" y="182">KR · VN LAWS</text><text class="t-w" x="252" y="198">718 ARTICLES</text>
        <text class="t-o" x="252" y="230">RECALL 1.00</text>`;
    },

    hub: () => {
      const nodes = [[200, 34, 'API'], [326, 82, 'WORKER'], [326, 178, 'WEBHOOK'], [200, 226, 'JOB DIR'], [74, 178, 'SQLITE'], [74, 82, 'CALLER']];
      return nodes.map(([x, y]) => `<line class="ln" x1="200" y1="130" x2="${x}" y2="${y}"/><path class="flow" d="M200 130 L${x} ${y}"/>`).join('') +
        `<circle cx="200" cy="130" r="36" fill="#0f0f10" stroke="${O}" stroke-width="1.3"/>
         <circle cx="200" cy="130" r="46" fill="none" stroke="rgba(243,115,33,.25)" class="pulse"/>
         <text class="t-o" x="200" y="127" text-anchor="middle">JOB</text><text x="200" y="142" text-anchor="middle">202</text>` +
        nodes.map(([x, y, l]) => `<rect x="${x - 38}" y="${y - 12}" width="76" height="24" rx="12" fill="#0f0f10" stroke="rgba(255,255,255,.2)"/>
          <text class="t-w" x="${x}" y="${y + 4}" text-anchor="middle">${l}</text>`).join('');
    },

    orbit: u => `
      <defs><radialGradient id="sg${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#8a8a8a"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient></defs>
      <g transform="translate(200 128)">
        <g transform="rotate(-16)"><path id="o1${u}" class="ln" d="M-150 0 a150 48 0 1 0 300 0 a150 48 0 1 0 -300 0"/>
          <circle r="5" fill="${O}"><animateMotion dur="7s" repeatCount="indefinite"><mpath href="#o1${u}"/></animateMotion></circle></g>
        <g transform="rotate(26)"><path id="o2${u}" class="ln" d="M-118 0 a118 38 0 1 0 236 0 a118 38 0 1 0 -236 0"/>
          <circle r="4" fill="#fff"><animateMotion dur="5s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#o2${u}"/></animateMotion></circle></g>
        <circle r="36" fill="url(#sg${u})"/>
      </g>
      <text class="t-w" x="40" y="44">ALLOW</text><text x="360" y="44" text-anchor="end">MASKED</text>
      <text class="t-o" x="40" y="226">HUMAN REVIEW</text><text x="360" y="226" text-anchor="end">DENY</text>`,
  };

  PF.visual = type => {
    const fn = VIS[type];
    if (!fn) return '';
    const u = `v${++uid}`;
    return `<svg class="viz" viewBox="0 0 400 260" role="img" aria-hidden="true">${fn(u)}</svg>`;
  };
})();
