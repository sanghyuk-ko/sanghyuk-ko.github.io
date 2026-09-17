/* Project detail page — rendered from PORTFOLIO.projects by ?id=
   Layout: hero → one-glance summary (problem → approach → result) → approach cards → structure → code → lesson */
(() => {
  const PF = window.PF;
  const D = window.PORTFOLIO;
  const main = document.getElementById('main');
  if (!PF || !D || !main) return;

  const list = D.projects;
  const id = new URLSearchParams(location.search).get('id');
  const idx = list.findIndex(p => p.id === id);
  if (idx < 0) { location.replace('index.html#work'); return; }

  const p = list[idx];
  const ni = (idx + 1) % list.length;
  const next = list[ni];
  const E = PF.esc, R = PF.rich, pad = PF.pad;

  document.title = `${p.title} — 고상혁 포트폴리오`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', p.oneLiner);

  const isNum = v => /^[\d.,]+$/.test(v);
  const metric = m => `
    <div class="metric">
      ${m.from ? `<span class="metric__from">기존 <s>${E(m.from)}</s></span>` : ''}
      <div class="metric__v">${E(m.prefix || '')}<span${m.count !== false && isNum(m.value) ? ` data-count="${E(m.value)}"` : ''}>${E(m.value)}</span>${m.unit ? `<small>${E(m.unit)}</small>` : ''}</div>
      <div class="metric__l">${R(m.label)}</div>
    </div>`;

  const s = p.snapshot;
  const snapCol = (n, label, text, extra = '') => `
    <article class="snap__col${extra}"><span class="snap__k"><b>${n}</b>${label}</span><p>${R(text)}</p></article>`;
  const snapshot = `
    <section class="wrap p-snap" aria-label="한눈에 보기">
      <div class="snap" data-reveal>
        ${snapCol('01', '문제', s.problem)}
        <span class="snap__arrow" aria-hidden="true"></span>
        ${snapCol('02', '해결 방향', s.approach)}
        <span class="snap__arrow" aria-hidden="true"></span>
        ${snapCol('03', '결과', s.result, ' is-result')}
      </div>
      ${p.metrics && p.metrics.length ? `<div class="metrics" data-reveal>${p.metrics.map(metric).join('')}</div>` : ''}
    </section>`;

  const sections = [];
  const add = (title, sub, body) => sections.push({ title, sub, body });

  add('해결 방향', 'Approach', `<div class="approach">${p.decisions.map(d => `
    <article class="approach__item" data-reveal><h3>${R(d.title)}</h3><p>${R(d.body)}</p></article>`).join('')}</div>`);

  add('구조', 'Architecture', `
    <div class="flow" data-reveal>${p.flow.map((f, i) => `${i ? '<span class="flow__arrow" aria-hidden="true"></span>' : ''}
      <div class="flow__node${f.key ? ' is-key' : ''}"><span class="k">${E(f.k)}</span><b>${E(f.b)}</b>${f.s ? `<span>${E(f.s)}</span>` : ''}</div>`).join('')}
    </div>`);

  if (p.code && p.code.length) {
    add('핵심 코드', 'Code', `<div class="code-stack">${p.code.map(c => `
      <figure class="code" data-reveal style="margin:0">
        <figcaption class="code__head"><span class="code__dots" aria-hidden="true"><i></i><i></i><i></i></span><b>${E(c.file)}</b></figcaption>
        <pre><code>${PF.highlight(c.snippet)}</code></pre>
        <div class="code__caption">${R(c.caption)}</div>
      </figure>`).join('')}</div>`);
  }

  const links = p.links && p.links.length
    ? `<div class="p-links">${p.links.map(l => `<a class="btn" href="${E(l.url)}" target="_blank" rel="noopener">${E(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>`
    : '';
  if (p.lesson || p.note || links) {
    add(p.lesson ? '배운 점' : '참고', p.lesson ? 'Lesson' : 'Note', `
      ${p.lesson ? `<blockquote class="lesson" data-reveal>${R(p.lesson)}</blockquote>` : ''}
      ${p.note ? `<p class="note">${R(p.note)}</p>` : ''}
      ${links}`);
  }

  main.innerHTML = `
    <header class="p-hero wrap">
      <div class="p-hero__glow" aria-hidden="true"></div>
      <div class="p-hero__visual">${PF.visual(p.visual)}</div>
      <div>
        <a class="p-back" href="index.html#work" data-transition="00|All Work">← All work</a>
        <p class="p-eyebrow"><span>${pad(idx + 1)} / ${pad(list.length)}</span><span>${E(p.category)}</span><span>${E(p.org)}</span></p>
        <h1 class="p-title">${E(p.title)}</h1>
        <p class="p-summary">${R(p.summary)}</p>
        <dl class="p-meta">${[['기간', p.period], ['역할', p.role], ['팀', p.team], ['스택', p.stack.join(' · ')]]
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
      </div>
    </header>

    ${snapshot}

    <div class="wrap">${sections.map((sec, i) => `
      <section class="p-section">
        <div class="p-section__label"><span class="num">${pad(i + 1)} — ${E(sec.sub)}</span><h2>${E(sec.title)}</h2></div>
        <div>${sec.body}</div>
      </section>`).join('')}
    </div>

    <a class="next" href="project.html?id=${encodeURIComponent(next.id)}" data-transition="${E(`${pad(ni + 1)}|${next.title}`)}" data-cursor="NEXT">
      <div class="wrap">
        <span class="next__label">Next project — ${pad(ni + 1)} / ${pad(list.length)}</span>
        <span class="next__title">${E(next.title)}</span>
      </div>
      <span class="next__arrow" aria-hidden="true">→</span>
    </a>

    <footer class="wrap site-footer" style="margin-top:0;padding-bottom:28px">
      <span>© 2026 Sanghyuk Ko</span>
      <a href="index.html#contact" data-transition="00|Contact">Contact ↗</a>
    </footer>`;

  const bar = document.querySelector('.progress-bar');
  PF.onScroll(y => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar?.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');
  });

  PF.observeReveals(main);
  PF.bindMagnetic(main);
  const viz = main.querySelector('.p-hero__visual .viz');
  setTimeout(() => viz?.classList.add('is-in'), PF.entering ? 700 : 150);
})();
