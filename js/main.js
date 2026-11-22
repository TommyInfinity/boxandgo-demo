/* Box & Go – nyilvános oldal */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const fmt = n => Math.round(n).toLocaleString('hu-HU').replace(/,/g, ' ');
  const tel = p => 'tel:' + String(p).replace(/[^\d+]/g, '');
  const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24"><use href="#i-${esc(name)}"/></svg>`;
  const safeUrl = u => (/^(https?:|\/|mailto:|tel:|data:image\/|img\/|uploads\/)/i.test(String(u || '')) ? u : '#');
  const DEMO = !!window.__DEMO__; // önálló előnézeti (demó) változat: nincs szerver
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let C; // tartalom

  async function load() {
    if (window.__CONTENT__) { C = window.__CONTENT__; render(); setTimeout(() => $('#loader').classList.add('done'), 250); initInteractions(); if (DEMO) demoBanner(); return; }
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (!r.ok) throw 0;
      C = await r.json();
    } catch {
      C = await (await fetch('/content.json')).json().catch(() => ({})); // statikus tartalék
    }
    render();
    setTimeout(() => $('#loader').classList.add('done'), 250);
    initInteractions();
    if (DEMO) demoBanner();
  }

  function render() {
    // egyszerű kötések
    $$('[data-bind]').forEach(el => {
      const k = el.dataset.bind;
      if (k === 'phone0') el.textContent = C.company.phones[0] || '';
      else if (k === 'phone0-link') el.href = tel(C.company.phones[0] || '');
      else { const v = get(C, k); if (v != null) el.textContent = v; }
    });
    $$('[data-bind-src]').forEach(el => { const v = get(C, el.dataset.bindSrc); if (v) el.src = safeUrl(v); });
    if (C.seo) { document.title = C.seo.title; $('meta[name=description]').content = C.seo.description; }

    // szekciók ki/be
    const sec = C.sections || {};
    $$('[data-section]').forEach(el => el.classList.toggle('hidden-section', sec[el.dataset.section] === false));
    $$('.nav-links a, .footer-list a').forEach(a => {
      const t = $(a.getAttribute('href') || '');
      if (t && t.classList.contains('hidden-section')) a.style.display = 'none';
    });

    // marquee
    const mq = (C.marquee || []).map(t => `<span>${esc(t)}</span>`).join('');
    $('#marquee').innerHTML = mq + mq;

    // statok
    $('#stats').innerHTML = (C.stats || []).map(s =>
      `<div class="stat"><b data-count="${+s.value || 0}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join('');
    $('#stats').classList.add('stagger');

    // szolgáltatások
    $('#services').innerHTML = (C.services || []).map((s, i) => `
      <article class="svc">
        <span class="svc-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="svc-icon">${icon(s.icon)}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.desc)}</p>
        ${s.price ? `<span class="svc-price">${esc(s.price)} ${icon('arrow')}</span>` : ''}
      </article>`).join('');
    $('#services').classList.add('stagger');

    $('#why').innerHTML = (C.why || []).map(w => `
      <div class="why-card"><div class="svc-icon">${icon(w.icon)}</div><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></div>`).join('');
    $('#why').classList.add('stagger');

    $('#steps').innerHTML = (C.steps || []).map(s => `<li><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></li>`).join('');

    // csomagok
    $('#packages').innerHTML = (C.pricing?.packages || []).map(p => `
      <div class="pkg ${p.highlight ? 'hl' : ''}">
        ${p.badge ? `<span class="pkg-badge">${esc(p.badge)}</span>` : ''}
        <h3>${esc(p.name)}</h3>
        <div class="pkg-price">${esc(p.price)}</div>
        <div class="pkg-unit">${esc(p.unit)}</div>
        <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <a href="#ajanlat" class="btn btn-primary" data-pick="${esc(p.name)}">Ezt kérem</a>
      </div>`).join('');
    $('#packages').classList.add('stagger');

    // furgon
    $('#specs').innerHTML = (C.van?.specs || []).map(s => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('');

    // galéria
    $('#gallery').innerHTML = (C.gallery || []).map((g, i) =>
      `<button type="button" data-i="${i}" aria-label="${esc(g.alt)} – nagyítás"><img src="${esc(safeUrl(g.src))}" alt="${esc(g.alt)}" loading="lazy"></button>`).join('');

    // GYIK
    $('#faq').innerHTML = (C.faq || []).map((f, i) =>
      `<details ${i === 0 ? 'open' : ''}><summary>${esc(f.q)}</summary><div class="ans"><div><p>${esc(f.a)}</p></div></div></details>`).join('');

    // kapcsolat
    const cards = [];
    (C.company.phones || []).forEach(p => cards.push(`<a class="c-card" href="${tel(p)}">${icon('phone')}<div><small>Telefon</small><b>${esc(p)}</b></div></a>`));
    if (C.company.email) cards.push(`<a class="c-card" href="mailto:${esc(C.company.email)}">${icon('mail')}<div><small>E-mail</small><b>${esc(C.company.email)}</b></div></a>`);
    if (C.company.facebook) cards.push(`<a class="c-card" href="${esc(safeUrl(C.company.facebook))}" target="_blank" rel="noopener">${icon('fb')}<div><small>Facebook / Messenger</small><b>Írj nekünk üzenetet</b></div></a>`);
    $('#contactCards').innerHTML = cards.join('');
    $('#footerContact').innerHTML = [
      ...(C.company.phones || []).map(p => `<li><a href="${tel(p)}">${esc(p)}</a></li>`),
      C.company.email ? `<li><a href="mailto:${esc(C.company.email)}">${esc(C.company.email)}</a></li>` : '',
      `<li>${esc(C.company.area)}</li>`, `<li>${esc(C.company.hours || '')}</li>`,
    ].join('');
    $('#serviceSelect').innerHTML = (C.contact?.serviceOptions || []).map(o => `<option>${esc(o)}</option>`).join('');
    $('#year').textContent = new Date().getFullYear();

    buildCalculator();
  }

  /* ---------- árkalkulátor ---------- */
  let lastEstimate = '';
  function buildCalculator() {
    const k = C.calculator || {};
    $('#calcSizes').innerHTML = (k.sizes || []).map((s, i) =>
      `<label><input type="radio" name="size" value="${i}" ${i === 1 ? 'checked' : ''}><span>${esc(s.label)}</span></label>`).join('');
    const ids = ['km', 'floors', 'assembly', 'extraHelper', 'packing', 'weekend'];
    $('#calc').addEventListener('input', calc);
    ids.forEach(id => $('#' + id).addEventListener('change', calc));
    calc();
  }
  let shown = 0, raf;
  function calc() {
    const k = C.calculator || {};
    const n = v => Number(v) || 0;
    const sizeIdx = +($('input[name=size]:checked')?.value || 0);
    const size = (k.sizes || [])[sizeIdx] || { hours: 1, label: '' };
    const km = +$('#km').value, floors = +$('#floors').value, asm = +$('#assembly').value;
    const helper = $('#extraHelper').checked, packing = $('#packing').checked, weekend = $('#weekend').checked;

    const hours = n(size.hours);
    const parts = [];
    let total = n(k.baseFee); if (total) parts.push(`kiszállás ${fmt(total)}`);
    const work = hours * n(k.hourlyRate); total += work; parts.push(`${hours} óra munka ${fmt(work)}`);
    if (helper) { const h = hours * n(k.extraHelperHourly); total += h; parts.push(`+1 fő ${fmt(h)}`); }
    const billKm = Math.max(0, km - n(k.freeKm)); if (billKm) { const v = billKm * n(k.perKm); total += v; parts.push(`${billKm} km ${fmt(v)}`); }
    if (floors) { const v = floors * n(k.floorFee); total += v; parts.push(`${floors}. emelet ${fmt(v)}`); }
    if (asm) { const v = asm * n(k.assemblyHourly); total += v; parts.push(`szerelés ${fmt(v)}`); }
    if (packing) { total += n(k.packingMaterial); parts.push(`anyag ${fmt(n(k.packingMaterial))}`); }
    if (weekend && n(k.weekendPercent)) { const v = total * n(k.weekendPercent) / 100; total += v; parts.push(`hétvége +${k.weekendPercent}%`); }
    total = Math.max(total, n(k.minFee));
    total = Math.round(total / 500) * 500;

    $('#kmOut').textContent = km + ' km';
    $('#floorOut').textContent = floors ? floors + '. emelet' : 'földszint / lift';
    $('#asmOut').textContent = asm + ' óra';
    $$('#calc input[type=range]').forEach(r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'));
    $('#calcBreakdown').textContent = parts.join(' · ');

    lastEstimate = `${size.label}, ${km} km, ${floors ? floors + '. emelet' : 'földszint/lift'}${asm ? ', ' + asm + ' óra szerelés' : ''}${helper ? ', +1 fő' : ''}${packing ? ', csomagolóanyag' : ''}${weekend ? ', hétvége' : ''} → kb. ${fmt(total)} Ft`;

    // animált számláló
    cancelAnimationFrame(raf);
    const from = shown, to = total, t0 = performance.now(), d = reduce ? 1 : 500;
    const el = $('#calcTotal');
    el.parentElement.classList.remove('bump'); void el.offsetWidth; el.parentElement.classList.add('bump');
    const step = t => {
      const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3);
      shown = from + (to - from) * e; el.textContent = fmt(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---------- interakciók ---------- */
  function initInteractions() {
    // forgó szavak
    const words = C.hero?.titleRotate || [];
    const rw = $('#rotator .rot-word');
    let wi = 0;
    rw.textContent = words[0] || '';
    if (words.length > 1 && !reduce) setInterval(() => {
      rw.classList.remove('in'); rw.classList.add('out');
      setTimeout(() => { wi = (wi + 1) % words.length; rw.textContent = words[wi]; rw.classList.remove('out'); rw.classList.add('in'); }, 420);
    }, 2600);

    // megjelenés görgetéskor
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      if (el.classList.contains('stagger')) [...el.children].forEach((c, i) => (c.style.animationDelay = i * 90 + 'ms'));
      if (el.id === 'stats') countUp(el);
      io.unobserve(el);
    }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal, .stagger, .polaroid').forEach(el => io.observe(el));

    // navigáció
    const nav = $('#nav'); let lastY = 0;
    const burger = $('#burger'), links = $('#navLinks');
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open); links.classList.toggle('open', open);
    });
    links.addEventListener('click', e => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); links.classList.remove('open'); } });

    const sections = $$('main section[id]');
    const onScroll = () => {
      const y = scrollY;
      nav.classList.toggle('scrolled', y > 30);
      nav.classList.toggle('hide', y > lastY && y > 600 && !links.classList.contains('open'));
      lastY = y;
      let cur = '';
      sections.forEach(s => { if (s.offsetTop - 140 <= y) cur = s.id; });
      $$('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
      routeProgress(); parallax();
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', routeProgress);
    onScroll();

    // 3D dőlés a hero képen
    const card = $('.photo-card');
    if (card && !reduce && matchMedia('(hover:hover)').matches) {
      const vis = $('#heroVisual');
      vis.addEventListener('mousemove', e => {
        const r = vis.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `rotate(3deg) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
      });
      vis.addEventListener('mouseleave', () => (card.style.transform = ''));
      // mágneses gomb
      $$('.magnetic').forEach(b => {
        b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`; });
        b.addEventListener('mouseleave', () => (b.style.transform = ''));
      });
    }

    // galéria lightbox
    const lb = $('#lightbox'), lbImg = $('#lightbox img'); let li = 0;
    const show = i => { const g = C.gallery || []; li = (i + g.length) % g.length; lbImg.src = safeUrl(g[li].src); lbImg.alt = g[li].alt; };
    $('#gallery').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; show(+b.dataset.i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close').focus(); });
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
    $('.lb-close').onclick = close; $('.lb-prev').onclick = () => show(li - 1); $('.lb-next').onclick = () => show(li + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(li - 1); if (e.key === 'ArrowRight') show(li + 1); });

    // GYIK: egyszerre egy nyitva
    $$('#faq details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('#faq details').forEach(o => o !== d && (o.open = false)); }));

    // csomag -> űrlap
    $('#packages').addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const msg = $('#quote [name=message]'); if (!msg.value) msg.value = `A(z) "${b.dataset.pick}" csomag érdekelne.`;
    });
    // kalkulátor -> űrlap
    $('#calcToQuote').addEventListener('click', () => {
      $('#estimateField').value = lastEstimate;
      const chip = $('#estimateChip');
      chip.hidden = false;
      chip.innerHTML = `<span>Kalkuláció: ${esc(lastEstimate)}</span><button type="button" aria-label="Eltávolítás">×</button>`;
      chip.querySelector('button').onclick = () => { chip.hidden = true; $('#estimateField').value = ''; };
    });

    initForm();
  }

  function countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const to = +el.dataset.count, suf = el.dataset.suffix, t0 = performance.now(), d = reduce ? 1 : 1600;
      const step = t => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e) + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  // útvonal kirajzolása és a kis furgon mozgatása görgetésre
  let pathLen = 0;
  function routeProgress() {
    const route = $('#route'), p = $('#routePathFill'), truck = $('#routeTruck');
    if (!route || !p || getComputedStyle(truck).display === 'none') return;
    if (!pathLen) { pathLen = p.getTotalLength(); p.style.strokeDasharray = pathLen; }
    const r = route.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .2)));
    p.style.strokeDashoffset = pathLen * (1 - prog);
    const pt = p.getPointAtLength(pathLen * prog), pt2 = p.getPointAtLength(Math.min(pathLen, pathLen * prog + 1));
    const svg = p.ownerSVGElement.getBoundingClientRect();
    const sx = svg.width / 1000, sy = svg.height / 120;
    const ang = Math.atan2((pt2.y - pt.y) * sy, (pt2.x - pt.x) * sx) * 180 / Math.PI;
    truck.style.transform = `translate(${pt.x * sx - 45}px, ${pt.y * sy - 20}px) rotate(${ang}deg)`;
    $$('#steps li').forEach((li, i, a) => li.classList.toggle('lit', prog >= (i + .5) / a.length));
  }
  function parallax() {
    if (reduce) return;
    $$('.parallax').forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.transform = `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -(+el.dataset.speed || .1)}px)`;
    });
  }

  /* ---------- ajánlatkérő űrlap ---------- */
  function initForm() {
    const f = $('#quote'), msg = $('#formMsg');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f));
      $$('.invalid', f).forEach(x => x.classList.remove('invalid'));
      let bad = false;
      if (!data.name.trim()) { f.name.classList.add('invalid'); bad = true; }
      if (!data.phone.trim() && !data.email.trim()) { f.phone.classList.add('invalid'); bad = true; }
      if (bad) { msg.className = 'form-msg err'; msg.textContent = 'Kérlek, add meg a neved és a telefonszámod (vagy e-mail címed).'; return; }
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      msg.className = 'form-msg'; msg.textContent = 'Küldés…';
      if (DEMO) { // előnézetben nem küldünk semmit
        await new Promise(r => setTimeout(r, 700));
        const kept = window.__demoSaveQuote ? window.__demoSaveQuote(data) : false;
        f.reset(); $('#estimateChip').hidden = true; f.classList.add('sent');
        msg.className = 'form-msg ok';
        msg.textContent = kept
          ? 'Előnézet: az ajánlatkérést NEM küldtük el, csak a demó adminban látható ebben a böngészőben.'
          : 'Előnézet: élesben itt elküldődne az ajánlatkérés. 🚚';
        btn.disabled = false; setTimeout(() => f.classList.remove('sent'), 900);
        return;
      }
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Hiba történt.');
        f.reset(); $('#estimateChip').hidden = true; f.classList.add('sent');
        msg.className = 'form-msg ok'; msg.textContent = 'Köszönjük! Hamarosan visszahívunk. 🚚';
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = (err.message || 'Hiba történt.') + ' Hívj minket: ' + (C.company.phones[0] || '');
      } finally { btn.disabled = false; setTimeout(() => f.classList.remove('sent'), 900); }
    });
  }

  function demoBanner() {
    if (!window.__DEMO_ADMIN__) $$('.admin-link').forEach(a => a.remove());
    const b = document.createElement('div');
    b.className = 'demo-banner';
    b.innerHTML = window.__DEMO_ADMIN__
      ? '<span><b>Demó</b> – minta árakkal · <a href="admin/" style="color:inherit">Admin kipróbálása</a></span><button type="button" aria-label="Bezárás">×</button>'
      : '<span><b>Előnézet</b> – így fog kinézni az élő weboldal</span><button type="button" aria-label="Bezárás">×</button>';
    b.querySelector('button').onclick = () => b.remove();
    document.body.append(b);
  }

  load();
})();
