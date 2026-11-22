/* GitHub Pages demó: a szerver API-ját a böngészőben helyettesíti.
   Minden módosítás csak a látogató saját böngészőjében (localStorage) marad, semmit nem küld sehova. */
(() => {
  'use strict';
  window.__DEMO__ = true;
  window.__DEMO_ADMIN__ = true;
  const K_CONTENT = 'boxgo-demo-content', K_QUOTES = 'boxgo-demo-quotes';
  const realFetch = window.fetch.bind(window);
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  window.__demoSaveQuote = d => {
    const all = read(K_QUOTES, []);
    all.unshift({
      id: uid(), createdAt: new Date().toISOString(), status: 'új', name: d.name, phone: d.phone, email: d.email,
      service: d.service, from: d.from, to: d.to, date: d.date, message: d.message, estimate: d.estimate,
    });
    return write(K_QUOTES, all.slice(0, 50));
  };

  const original = () => realFetch('content.json', { cache: 'no-store' }).then(r => r.json());

  window.fetch = async (input, opts = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api/')) return realFetch(input, opts);
    const m = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : {};

    if (url === '/api/content' && m === 'GET') return json(read(K_CONTENT, null) || await original());
    if (url === '/api/content' && m === 'PUT') return write(K_CONTENT, body) ? json({ ok: true }) : json({ error: 'A böngésző tárhelye megtelt (túl sok feltöltött kép).' }, 413);
    if (url === '/api/content/reset') { try { localStorage.removeItem(K_CONTENT); } catch {} return json({ ok: true }); }
    if (url === '/api/me' || url === '/api/login') return json({ ok: true, user: 'demo', mustChange: false });
    if (url === '/api/logout') return json({ ok: true });
    if (url === '/api/password') return json({ error: 'A demóban a jelszó nem módosítható.' }, 400);
    if (url === '/api/upload') return json({ ok: true, src: body.data });
    if (url === '/api/quotes') return json(read(K_QUOTES, []));
    const q = url.match(/^\/api\/quotes\/(.+)$/);
    if (q) {
      const all = read(K_QUOTES, []), i = all.findIndex(x => x.id === q[1]);
      if (i < 0) return json({ error: 'Nincs ilyen ajánlatkérés.' }, 404);
      if (m === 'DELETE') all.splice(i, 1); else Object.assign(all[i], body);
      write(K_QUOTES, all);
      return json({ ok: true });
    }
    return json({ error: 'A demóban nem érhető el.' }, 404);
  };

  // figyelmeztető sáv az admin demó tetején
  if (document.documentElement.dataset.demoAdmin === '1') {
    addEventListener('DOMContentLoaded', () => {
      const n = document.createElement('div');
      n.className = 'notice';
      n.innerHTML = '<b>Demó admin:</b> bármit átírhatsz, a változás csak a te böngésződben látszik, másoknál nem. Élesben jelszóval védett.';
      document.querySelector('.main').insertBefore(n, document.querySelector('#content'));
    });
  }
})();
