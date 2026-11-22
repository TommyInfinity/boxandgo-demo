/* Box & Go – admin felület */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    kids.flat().forEach(k => k != null && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  };
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] ??= {}), o); t[last] = v; };

  const ICONS = { truck: 'Furgon', cart: 'Bevásárlókocsi', wrench: 'Csavarkulcs', trash: 'Kuka', tag: 'Címke', map: 'Térkép', box: 'Doboz', shield: 'Pajzs', bolt: 'Villám', heart: 'Szív', sparkle: 'Csillogás', clock: 'Óra', star: 'Csillag', home: 'Ház', phone: 'Telefon' };

  /* ---------- séma: mit lehet szerkeszteni ---------- */
  const TABS = [
    { id: 'prices', icon: '💰', title: 'Árak & kalkulátor', cards: [
      { title: 'Árcsomagok', hint: 'Az „Árak” szekció kártyái. A kiemelt csomag sötét háttérrel, nagyobban jelenik meg.', fields: [
        { type: 'text', key: 'pricing.title', label: 'Szekció címe', wide: true },
        { type: 'textarea', key: 'pricing.note', label: 'Megjegyzés az árak alatt', wide: true },
        { type: 'list', key: 'pricing.packages', label: 'Csomagok', itemTitle: 'name', newItem: () => ({ name: 'Új csomag', price: '0', unit: 'Ft-tól', highlight: false, badge: '', features: [] }), fields: [
          { type: 'text', key: 'name', label: 'Név' },
          { type: 'text', key: 'price', label: 'Ár', hint: 'pl. 45 000' },
          { type: 'text', key: 'unit', label: 'Egység', hint: 'pl. Ft-tól, Ft / óra' },
          { type: 'text', key: 'badge', label: 'Szalag felirat (opcionális)', hint: 'pl. Legnépszerűbb' },
          { type: 'check', key: 'highlight', label: 'Kiemelt csomag' },
          { type: 'strlist', key: 'features', label: 'Mit tartalmaz', wide: true },
        ] },
      ] },
      { title: 'Árkalkulátor díjai', hint: 'Ezekből számol a weboldal árkalkulátora. A végösszeg 500 Ft-ra kerekít.', fields: [
        { type: 'text', key: 'calculator.title', label: 'Cím' },
        { type: 'text', key: 'calculator.subtitle', label: 'Alcím', wide: true },
        { type: 'number', key: 'calculator.baseFee', label: 'Kiszállási alapdíj', unit: 'Ft' },
        { type: 'number', key: 'calculator.hourlyRate', label: 'Óradíj (furgon + 2 fő)', unit: 'Ft/óra' },
        { type: 'number', key: 'calculator.extraHelperHourly', label: '+1 fő segítő', unit: 'Ft/óra' },
        { type: 'number', key: 'calculator.perKm', label: 'Kilométerdíj', unit: 'Ft/km' },
        { type: 'number', key: 'calculator.freeKm', label: 'Ingyenes km', unit: 'km' },
        { type: 'number', key: 'calculator.floorFee', label: 'Emeletenkénti felár (lift nélkül)', unit: 'Ft' },
        { type: 'number', key: 'calculator.assemblyHourly', label: 'Bútorszerelés', unit: 'Ft/óra' },
        { type: 'number', key: 'calculator.packingMaterial', label: 'Csomagolóanyag', unit: 'Ft' },
        { type: 'number', key: 'calculator.weekendPercent', label: 'Hétvégi felár', unit: '%' },
        { type: 'number', key: 'calculator.minFee', label: 'Minimum díj', unit: 'Ft' },
        { type: 'list', key: 'calculator.sizes', label: 'Méret opciók (becsült munkaórával)', itemTitle: 'label', newItem: () => ({ label: 'Új opció', hours: 2 }), fields: [
          { type: 'text', key: 'label', label: 'Felirat' },
          { type: 'number', key: 'hours', label: 'Becsült idő', unit: 'óra', step: 0.5 },
        ] },
      ] },
      { title: 'Szolgáltatások melletti árak', hint: 'A szolgáltatás-kártyák alján megjelenő „…-tól” árak a Szolgáltatások fülön szerkeszthetők.', fields: [] },
    ] },
    { id: 'services', icon: '🚚', title: 'Szolgáltatások', cards: [
      { title: 'Szolgáltatások', fields: [
        { type: 'list', key: 'services', itemTitle: 'title', newItem: () => ({ icon: 'box', title: 'Új szolgáltatás', desc: '', price: '' }), fields: [
          { type: 'icon', key: 'icon', label: 'Ikon' },
          { type: 'text', key: 'title', label: 'Cím' },
          { type: 'text', key: 'price', label: 'Ár felirat', hint: 'pl. 12 000 Ft-tól – üresen hagyva nem jelenik meg' },
          { type: 'textarea', key: 'desc', label: 'Leírás', wide: true },
        ] },
      ] },
      { title: '„Miért mi?” kártyák', fields: [
        { type: 'list', key: 'why', itemTitle: 'title', newItem: () => ({ icon: 'star', title: 'Új előny', desc: '' }), fields: [
          { type: 'icon', key: 'icon', label: 'Ikon' },
          { type: 'text', key: 'title', label: 'Cím' },
          { type: 'textarea', key: 'desc', label: 'Leírás', wide: true },
        ] },
      ] },
      { title: 'Folyamat lépései', fields: [
        { type: 'list', key: 'steps', itemTitle: 'title', newItem: () => ({ title: 'Új lépés', desc: '' }), fields: [
          { type: 'text', key: 'title', label: 'Cím' },
          { type: 'textarea', key: 'desc', label: 'Leírás', wide: true },
        ] },
      ] },
    ] },
    { id: 'home', icon: '🏠', title: 'Kezdőképernyő', cards: [
      { title: 'Nyitó rész (hero)', fields: [
        { type: 'text', key: 'hero.badge', label: 'Kis címke felül', wide: true },
        { type: 'text', key: 'hero.titleTop', label: 'Cím 1. sora' },
        { type: 'text', key: 'hero.titleBottom', label: 'Cím utolsó sora' },
        { type: 'strlist', key: 'hero.titleRotate', label: 'Váltakozó szavak (narancs sor)', wide: true },
        { type: 'textarea', key: 'hero.subtitle', label: 'Bevezető szöveg', wide: true },
        { type: 'text', key: 'hero.ctaPrimary', label: 'Fő gomb felirata' },
        { type: 'text', key: 'hero.ctaSecondary', label: 'Második gomb felirata' },
        { type: 'image', key: 'hero.image', label: 'Fő kép', wide: true },
      ] },
      { title: 'Futó szalag', fields: [{ type: 'strlist', key: 'marquee', label: 'Szavak', wide: true }] },
      { title: 'Számok', hint: 'Animáltan felpörgő számok a nyitó rész alatt.', fields: [
        { type: 'list', key: 'stats', itemTitle: 'label', newItem: () => ({ value: 0, suffix: '', label: '' }), fields: [
          { type: 'number', key: 'value', label: 'Szám' },
          { type: 'text', key: 'suffix', label: 'Utótag', hint: 'pl. %, +, fő' },
          { type: 'text', key: 'label', label: 'Felirat', wide: true },
        ] },
      ] },
    ] },
    { id: 'content', icon: '📝', title: 'Egyéb tartalom', cards: [
      { title: '„Ismerős a helyzet?” szekció', fields: [
        { type: 'text', key: 'problem.title', label: 'Cím' },
        { type: 'text', key: 'problem.cta', label: 'Gomb felirat' },
        { type: 'textarea', key: 'problem.text', label: 'Szöveg', wide: true },
        { type: 'image', key: 'problem.image', label: 'Kép', wide: true },
      ] },
      { title: 'Furgon', fields: [
        { type: 'text', key: 'van.title', label: 'Cím', wide: true },
        { type: 'textarea', key: 'van.desc', label: 'Leírás', wide: true },
        { type: 'image', key: 'van.image', label: 'Kép', wide: true },
        { type: 'list', key: 'van.specs', label: 'Adatok', itemTitle: 'label', newItem: () => ({ label: '', value: '' }), fields: [
          { type: 'text', key: 'label', label: 'Megnevezés' }, { type: 'text', key: 'value', label: 'Érték' },
        ] },
      ] },
      { title: 'Gyakori kérdések', fields: [
        { type: 'list', key: 'faq', itemTitle: 'q', newItem: () => ({ q: 'Új kérdés?', a: '' }), fields: [
          { type: 'text', key: 'q', label: 'Kérdés', wide: true }, { type: 'textarea', key: 'a', label: 'Válasz', wide: true },
        ] },
      ] },
      { title: 'Ajánlatkérő szekció', fields: [
        { type: 'text', key: 'contact.title', label: 'Cím', wide: true },
        { type: 'textarea', key: 'contact.subtitle', label: 'Alcím', wide: true },
        { type: 'strlist', key: 'contact.serviceOptions', label: 'Választható szolgáltatások az űrlapon', wide: true },
      ] },
    ] },
    { id: 'gallery', icon: '🖼️', title: 'Galéria', cards: [{ title: 'Képek', hint: 'Húzz ide képeket, vagy kattints a feltöltéshez. A nagy képeket a rendszer automatikusan átméretezi.', gallery: true }] },
    { id: 'general', icon: '⚙️', title: 'Cégadatok & beállítások', cards: [
      { title: 'Cégadatok', fields: [
        { type: 'text', key: 'company.name', label: 'Cégnév' },
        { type: 'text', key: 'company.shortName', label: 'Rövid név' },
        { type: 'text', key: 'company.owners', label: 'Tulajdonosok' },
        { type: 'text', key: 'company.city', label: 'Székhely' },
        { type: 'text', key: 'company.area', label: 'Működési terület' },
        { type: 'text', key: 'company.hours', label: 'Elérhetőség / nyitvatartás' },
        { type: 'text', key: 'company.email', label: 'E-mail' },
        { type: 'text', key: 'company.facebook', label: 'Facebook oldal URL' },
        { type: 'strlist', key: 'company.phones', label: 'Telefonszámok (az első a fő szám)', wide: true },
      ] },
      { title: 'Szekciók megjelenítése', hint: 'Kapcsold ki, amit nem szeretnél a weboldalon látni.', fields: [
        ['stats', 'Számok'], ['services', 'Szolgáltatások'], ['problem', '„Ismerős a helyzet?”'], ['why', 'Miért mi?'], ['steps', 'Folyamat'],
        ['pricing', 'Árcsomagok'], ['calculator', 'Árkalkulátor'], ['van', 'Furgon'], ['gallery', 'Galéria'], ['faq', 'GYIK'],
      ].map(([k, l]) => ({ type: 'check', key: 'sections.' + k, label: l })) },
      { title: 'Keresőoptimalizálás (SEO)', fields: [
        { type: 'text', key: 'seo.title', label: 'Oldal címe (böngészőfül, Google)', wide: true },
        { type: 'textarea', key: 'seo.description', label: 'Leírás (Google találat alatt)', wide: true },
      ] },
      { title: 'Visszaállítás', hint: 'Az összes tartalmat az eredeti alapértelmezésre állítja vissza. Az előző állapotról biztonsági mentés készül (data/content.backup.json).', reset: true },
    ] },
    { id: 'quotes', icon: '📬', title: 'Ajánlatkérések', quotes: true },
    { id: 'account', icon: '🔐', title: 'Fiók', account: true },
  ];

  /* ---------- állapot ---------- */
  let data = null, saved = '', current = 'prices', quotes = [];

  const toast = (msg, kind = '') => {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + kind;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = 'toast ' + kind), 2600);
  };
  const markDirty = () => {
    const d = JSON.stringify(data) !== saved;
    $('#dirty').hidden = !d; $('#save').disabled = !d;
  };
  async function api(url, opts = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !url.endsWith('/login')) { showLogin(); throw new Error('Lejárt a munkamenet, lépj be újra.'); }
    if (!r.ok) throw new Error(j.error || 'Hiba történt.');
    return j;
  }

  /* ---------- belépés ---------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#loginForm [name=password]').focus(); }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target; $('#loginErr').textContent = '';
    try {
      const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ user: f.user.value, password: f.password.value }) });
      f.password.value = '';
      start(r.mustChange);
    } catch (err) { $('#loginErr').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.reload(); });

  async function start(mustChange) {
    data = await api('/api/content');
    saved = JSON.stringify(data);
    quotes = await api('/api/quotes').catch(() => []);
    $('#login').hidden = true; $('#app').hidden = false;
    $('#pwNotice').hidden = !mustChange;
    renderTabs(); show(mustChange ? 'account' : current);
  }

  /* ---------- fülek ---------- */
  function renderTabs() {
    const nav = $('#tabs'); nav.innerHTML = '';
    TABS.forEach(t => {
      const newCount = t.quotes ? quotes.filter(q => q.status === 'új').length : 0;
      nav.append(h('button', { class: t.id === current ? 'on' : '', onclick: () => show(t.id) },
        h('span', {}, t.icon), t.title, newCount ? h('span', { class: 'count' }, String(newCount)) : null));
    });
  }
  function show(id) {
    current = id;
    const tab = TABS.find(t => t.id === id);
    $('#tabTitle').textContent = tab.title;
    $('.side').classList.remove('open');
    renderTabs();
    const c = $('#content'); c.innerHTML = '';
    $('#save').style.visibility = tab.quotes || tab.account ? 'hidden' : '';
    if (tab.quotes) return renderQuotes(c);
    if (tab.account) return renderAccount(c);
    tab.cards.forEach((card, i) => {
      const el = h('section', { class: 'card', style: `animation-delay:${i * 60}ms` }, h('h2', {}, card.title), card.hint ? h('p', { class: 'hint' }, card.hint) : null);
      if (card.gallery) renderGallery(el);
      else if (card.reset) el.append(h('button', { class: 'btn danger', onclick: resetAll }, 'Minden tartalom visszaállítása'));
      else { const g = h('div', { class: 'grid' }); renderFields(g, data, card.fields); el.append(g); }
      c.append(el);
    });
    scrollTo({ top: 0 });
  }
  $('#menuBtn').addEventListener('click', () => $('.side').classList.toggle('open'));
  document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) { e.preventDefault(); show(g.dataset.goto); } });

  /* ---------- mezők ---------- */
  function renderFields(container, obj, fields) {
    fields.forEach(f => container.append(field(obj, f)));
  }
  function field(obj, f) {
    const wrap = h('label', { class: 'field' + (f.wide || f.type === 'list' ? ' wide' : '') });
    const val = getP(obj, f.key);
    const label = f.label ? h('span', {}, f.label) : null;
    const hint = f.hint ? h('small', {}, f.hint) : null;
    const upd = v => { setP(obj, f.key, v); markDirty(); };
    const add = (...k) => wrap.append(...k.filter(Boolean));

    switch (f.type) {
      case 'text': add(label, h('input', { value: val ?? '', oninput: e => upd(e.target.value) }), hint); break;
      case 'textarea': add(label, h('textarea', { rows: 3, oninput: e => upd(e.target.value) }, val ?? ''), hint); break;
      case 'number': add(label, h('div', { class: 'num-wrap' },
        h('input', { type: 'number', step: f.step || 'any', value: val ?? 0, oninput: e => upd(e.target.value === '' ? 0 : Number(e.target.value)) }),
        f.unit ? h('em', {}, f.unit) : null), hint); break;
      case 'check': wrap.className = 'check'; add(h('input', { type: 'checkbox', checked: val !== false, onchange: e => upd(e.target.checked) }), f.label); break;
      case 'icon': {
        const s = h('select', { onchange: e => upd(e.target.value) });
        Object.entries(ICONS).forEach(([k, l]) => s.append(h('option', { value: k, selected: k === val }, l)));
        add(label, s); break;
      }
      case 'image': {
        const div = h('div', { class: 'field wide' }, label);
        const img = h('img', { src: val || '', alt: '' });
        const inp = h('input', { value: val ?? '', oninput: e => { upd(e.target.value); img.src = e.target.value; } });
        const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, onchange: async e => {
          const src = await uploadFile(e.target.files[0]); if (src) { inp.value = src; img.src = src; upd(src); }
        } });
        div.append(h('div', { class: 'img-field' }, img, h('div', { class: 'img-actions' }, inp,
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => file.click() }, 'Új kép feltöltése…'), file)));
        return div;
      }
      case 'strlist': {
        const div = h('div', { class: 'field wide' }, label);
        let arr = Array.isArray(val) ? val : []; if (!Array.isArray(val)) setP(obj, f.key, arr);
        const list = h('div', { class: 'list' });
        const draw = () => {
          list.innerHTML = '';
          arr.forEach((s, i) => list.append(h('div', { class: 'str-row' },
            h('input', { value: s, oninput: e => { arr[i] = e.target.value; markDirty(); } }),
            h('button', { type: 'button', class: 'icon-btn', title: 'Fel', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); markDirty(); } }, '↑'),
            h('button', { type: 'button', class: 'icon-btn del', title: 'Törlés', onclick: () => { arr.splice(i, 1); draw(); markDirty(); } }, '✕'))));
          list.append(h('button', { type: 'button', class: 'btn ghost sm add', onclick: () => { arr.push(''); draw(); markDirty(); list.querySelectorAll('input')[arr.length - 1]?.focus(); } }, '+ Új sor'));
        };
        draw(); div.append(list); return div;
      }
      case 'list': {
        const div = h('div', { class: 'field wide' }, label);
        let arr = Array.isArray(val) ? val : []; if (!Array.isArray(val)) setP(obj, f.key, arr);
        const list = h('div', { class: 'list' });
        const draw = () => {
          list.innerHTML = '';
          arr.forEach((item, i) => {
            const title = h('b', {}, String(item[f.itemTitle] || '(névtelen)'));
            const g = h('div', { class: 'grid' });
            renderFields(g, item, f.fields);
            g.addEventListener('input', () => (title.textContent = String(item[f.itemTitle] || '(névtelen)')));
            list.append(h('div', { class: 'item' },
              h('div', { class: 'item-head' }, h('span', { class: 'idx' }, String(i + 1)), title,
                h('button', { type: 'button', class: 'icon-btn', title: 'Feljebb', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); markDirty(); } }, '↑'),
                h('button', { type: 'button', class: 'icon-btn', title: 'Lejjebb', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(); markDirty(); } }, '↓'),
                h('button', { type: 'button', class: 'icon-btn del', title: 'Törlés', onclick: () => { if (confirm('Biztosan törlöd ezt az elemet?')) { arr.splice(i, 1); draw(); markDirty(); } } }, '✕')),
              g));
          });
          list.append(h('button', { type: 'button', class: 'btn ghost sm add', onclick: () => { arr.push(f.newItem()); draw(); markDirty(); } }, '+ Új elem'));
        };
        draw(); div.append(list); return div;
      }
    }
    return wrap;
  }

  /* ---------- képfeltöltés (automatikus átméretezéssel) ---------- */
  async function shrink(file, max = 2000) {
    const img = await createImageBitmap(file).catch(() => null);
    if (!img) return file;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(b => r(b || file), 'image/webp', .86));
  }
  async function uploadFile(file) {
    if (!file) return null;
    try {
      toast('Feltöltés…');
      const blob = await shrink(file);
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
      const r = await api('/api/upload', { method: 'POST', body: JSON.stringify({ data: dataUrl }) });
      toast('Kép feltöltve – ne felejts el menteni!', 'ok');
      return r.src;
    } catch (e) { toast(e.message, 'err'); return null; }
  }

  function renderGallery(card) {
    data.gallery ??= [];
    const grid = h('div', { class: 'gallery-grid' });
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, hidden: true, onchange: e => addFiles(e.target.files) });
    const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => file.click(), onkeydown: e => e.key === 'Enter' && file.click() }, '📷 Képek feltöltése (kattints vagy húzd ide)');
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
    async function addFiles(files) {
      for (const f of files) { const src = await uploadFile(f); if (src) data.gallery.push({ src, alt: f.name.replace(/\.\w+$/, '') }); }
      draw(); markDirty();
    }
    const draw = () => {
      grid.innerHTML = '';
      data.gallery.forEach((g, i) => grid.append(h('div', { class: 'item' },
        h('img', { src: g.src, alt: '' }),
        h('label', { class: 'field' }, h('span', {}, 'Leírás'), h('input', { value: g.alt || '', oninput: e => { g.alt = e.target.value; markDirty(); } })),
        h('div', { class: 'item-head', style: 'margin:10px 0 0' },
          h('span', { class: 'idx' }, String(i + 1)), h('b', {}, ''),
          h('button', { type: 'button', class: 'icon-btn', title: 'Előre', disabled: i === 0, onclick: () => { [data.gallery[i - 1], data.gallery[i]] = [data.gallery[i], data.gallery[i - 1]]; draw(); markDirty(); } }, '←'),
          h('button', { type: 'button', class: 'icon-btn', title: 'Hátra', disabled: i === data.gallery.length - 1, onclick: () => { [data.gallery[i + 1], data.gallery[i]] = [data.gallery[i], data.gallery[i + 1]]; draw(); markDirty(); } }, '→'),
          h('button', { type: 'button', class: 'icon-btn del', title: 'Törlés', onclick: () => { data.gallery.splice(i, 1); draw(); markDirty(); } }, '✕')))));
    };
    draw();
    card.append(drop, file, h('div', { style: 'height:16px' }), grid);
  }

  /* ---------- mentés ---------- */
  $('#save').addEventListener('click', async () => {
    const b = $('#save'); b.disabled = true; b.textContent = 'Mentés…';
    try {
      await api('/api/content', { method: 'PUT', body: JSON.stringify(data) });
      saved = JSON.stringify(data); markDirty(); toast('Elmentve! A weboldalon azonnal megjelenik. ✓', 'ok');
    } catch (e) { toast(e.message, 'err'); markDirty(); }
    b.textContent = 'Mentés';
  });
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!$('#save').disabled) $('#save').click(); } });
  addEventListener('beforeunload', e => { if (data && JSON.stringify(data) !== saved) { e.preventDefault(); e.returnValue = ''; } });

  async function resetAll() {
    if (!confirm('Biztosan visszaállítod az összes tartalmat az alapértelmezettre? (Biztonsági mentés készül.)')) return;
    try { await api('/api/content/reset', { method: 'POST' }); data = await api('/api/content'); saved = JSON.stringify(data); markDirty(); toast('Visszaállítva.', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- ajánlatkérések ---------- */
  const STATUSES = ['új', 'folyamatban', 'kész', 'elutasítva'];
  let qFilter = 'mind', qSearch = '';
  async function renderQuotes(c) {
    quotes = await api('/api/quotes').catch(() => quotes);
    renderTabs();
    const bar = h('div', { class: 'card q-toolbar' },
      h('select', { onchange: e => { qFilter = e.target.value; draw(); } }, ...['mind', ...STATUSES].map(s => h('option', { value: s, selected: s === qFilter }, s === 'mind' ? 'Minden állapot' : s))),
      h('input', { type: 'search', placeholder: 'Keresés név, telefon, cím…', value: qSearch, oninput: e => { qSearch = e.target.value.toLowerCase(); draw(); } }),
      h('button', { class: 'btn ghost sm', onclick: () => show('quotes') }, '↻ Frissítés'),
      h('button', { class: 'btn ghost sm', onclick: exportCsv }, '⬇ Export (CSV)'));
    const list = h('div', { class: 'list' });
    c.append(bar, list);
    function draw() {
      list.innerHTML = '';
      const items = quotes.filter(q => (qFilter === 'mind' || q.status === qFilter) &&
        (!qSearch || JSON.stringify(q).toLowerCase().includes(qSearch)));
      if (!items.length) return list.append(h('div', { class: 'card empty' }, quotes.length ? 'Nincs találat.' : 'Még nem érkezett ajánlatkérés. 📭'));
      items.forEach(q => {
        const dl = h('dl', { class: 'q-dl' });
        [['Telefon', q.phone, q.phone && 'tel:' + q.phone.replace(/[^\d+]/g, '')], ['E-mail', q.email, q.email && 'mailto:' + q.email], ['Szolgáltatás', q.service], ['Honnan', q.from], ['Hová', q.to], ['Időpont', q.date]]
          .filter(x => x[1]).forEach(([k, v, href]) => dl.append(h('div', {}, h('dt', {}, k), h('dd', {}, href ? h('a', { href }, v) : v))));
        const note = h('textarea', { rows: 2, placeholder: 'Belső megjegyzés…' }, q.note || '');
        list.append(h('div', { class: 'card q st-' + q.status },
          h('div', { class: 'q-top' }, h('h3', {}, q.name), h('span', { class: 'q-date' }, new Date(q.createdAt).toLocaleString('hu-HU'))),
          dl,
          q.estimate ? h('p', { class: 'q-msg' }, '🧮 ' + q.estimate) : null,
          q.message ? h('p', { class: 'q-msg' }, q.message) : null,
          note,
          h('div', { class: 'q-actions', style: 'margin-top:10px' },
            h('select', { onchange: async e => { await patch(q, { status: e.target.value }); } }, ...STATUSES.map(s => h('option', { selected: s === q.status }, s))),
            h('button', { class: 'btn ghost sm', onclick: () => patch(q, { note: note.value }) }, 'Megjegyzés mentése'),
            h('button', { class: 'btn danger sm', onclick: async () => { if (!confirm('Törlöd ezt az ajánlatkérést?')) return; try { await api('/api/quotes/' + q.id, { method: 'DELETE' }); quotes = quotes.filter(x => x !== q); draw(); renderTabs(); toast('Törölve.'); } catch (e) { toast(e.message, 'err'); } } }, 'Törlés'))));
      });
    }
    async function patch(q, body) {
      try { await api('/api/quotes/' + q.id, { method: 'PATCH', body: JSON.stringify(body) }); Object.assign(q, body); draw(); renderTabs(); toast('Mentve.', 'ok'); }
      catch (e) { toast(e.message, 'err'); }
    }
    draw();
  }
  function exportCsv() {
    const cols = ['createdAt', 'status', 'name', 'phone', 'email', 'service', 'from', 'to', 'date', 'estimate', 'message', 'note'];
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = '﻿' + [cols.join(';'), ...quotes.map(q => cols.map(c => cell(q[c])).join(';'))].join('\r\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'ajanlatkeresek.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- fiók ---------- */
  function renderAccount(c) {
    const f = h('form', { class: 'card' },
      h('h2', {}, 'Jelszó módosítása'), h('p', { class: 'hint' }, 'Legalább 8 karakter. Válassz olyat, amit máshol nem használsz.'),
      h('div', { class: 'grid' },
        h('label', { class: 'field' }, h('span', {}, 'Felhasználónév'), h('input', { name: 'user', value: 'admin', autocomplete: 'username' })),
        h('label', { class: 'field' }, h('span', {}, 'Jelenlegi jelszó'), h('input', { name: 'current', type: 'password', required: true, autocomplete: 'current-password' })),
        h('label', { class: 'field' }, h('span', {}, 'Új jelszó'), h('input', { name: 'next', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
        h('label', { class: 'field' }, h('span', {}, 'Új jelszó még egyszer'), h('input', { name: 'next2', type: 'password', required: true, autocomplete: 'new-password' }))),
      h('div', { style: 'margin-top:16px' }, h('button', { class: 'btn primary', type: 'submit' }, 'Jelszó mentése')));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.next.value !== f.next2.value) return toast('A két új jelszó nem egyezik.', 'err');
      try { await api('/api/password', { method: 'POST', body: JSON.stringify({ user: f.user.value, current: f.current.value, next: f.next.value }) }); f.reset(); $('#pwNotice').hidden = true; toast('Jelszó módosítva. ✓', 'ok'); }
      catch (err) { toast(err.message, 'err'); }
    });
    c.append(f);
  }

  /* ---------- indulás ---------- */
  api('/api/me').then(me => start(me.mustChange)).catch(showLogin);
})();
