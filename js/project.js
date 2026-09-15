/* Project detail page — rendered from PORTFOLIO.projects by ?id= */
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

  const sections = [];
  const add = (title, sub, body) => sections.push({ title, sub, body });

  add('개요', 'Overview', `<div class="prose" data-reveal>${p.overview.map(t => `<p>${R(t)}</p>`).join('')}</div>`);

  add('문제', 'Problem', `<ol class="problem-list">${p.problem.map(t => `<li data-reveal>${R(t)}</li>`).join('')}</ol>`);

  add('설계 결정', 'Decisions', `<div class="decisions">${p.decisions.map(d => `
    <article class="decision" data-reveal>
      <h3>${R(d.title)}</h3>
      <p>${R(d.body)}</p>
      ${d.why ? `<span class="why">${R(d.why)}</span>` : ''}
    </article>`).join('')}</div>`);

  add('구조', 'Architecture', `
    <div class="flow" data-reveal>${p.flow.map((f, i) => `${i ? '<span class="flow__arrow" aria-hidden="true"></span>' : ''}
      <div class="flow__node${f.key ? ' is-key' : ''}"><span class="k">${E(f.k)}</span><b>${E(f.b)}</b>${f.s ? `<span>${E(f.s)}</span>` : ''}</div>`).join('')}
    </div>
    ${p.flowNote ? `<p class="note">${R(p.flowNote)}</p>` : ''}`);

  if (p.code && p.code.length) {
    add('핵심 구현', 'Code', `<div class="code-stack">${p.code.map(c => `
      <figure class="code" data-reveal style="margin:0">
        <figcaption class="code__head"><span class="code__dots" aria-hidden="true"><i></i><i></i><i></i></span><b>${E(c.file)}</b></figcaption>
        <pre><code>${PF.highlight(c.snippet)}</code></pre>
        <div class="code__caption">${R(c.caption)}</div>
      </figure>`).join('')}</div>`);
  }

  add('결과', 'Result', `
    <div class="results">${p.results.map(r => `<div class="result" data-reveal><b>${R(r.b)}</b>${R(r.t)}</div>`).join('')}</div>
    ${p.note ? `<p class="note">${R(p.note)}</p>` : ''}
    ${p.links && p.links.length ? `<div class="p-links">${p.links.map(l => `<a class="btn" href="${E(l.url)}" target="_blank" rel="noopener">${E(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>` : ''}`);

  if (p.lessons && p.lessons.length) {
    add('회고', 'Retrospective', `<ul class="lessons">${p.lessons.map(t => `<li data-reveal>${R(t)}</li>`).join('')}</ul>`);
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

    <section class="wrap" aria-label="핵심 수치">
      <div class="metrics" data-reveal>${p.metrics.map(metric).join('')}</div>
    </section>

    <div class="wrap">${sections.map((s, i) => `
      <section class="p-section">
        <div class="p-section__label"><span class="num">${pad(i + 1)} — ${E(s.sub)}</span><h2>${E(s.title)}</h2></div>
        <div>${s.body}</div>
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
