/* Norynta site monitor beacon (shared by all of Zach's sites; source of truth: zachhhhh/tester-exchange web/public/m.js).
   No cookies, no personal data. Records pageviews, clicks, rage clicks, scroll depth, time on page,
   JS errors and Web Vitals, and sends them in small batches to public.mon_track() (Supabase free tier).
   Use: <script defer src="/m.js" data-site="example.com"></script>; custom events: window.mon('signup', {plan:'x'}) */
(function () {
  try {
    if (navigator.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    var S = document.currentScript;
    var site = (S && S.getAttribute('data-site')) || location.hostname.replace(/^www\./, '');
    var EP = 'https://vvrlxzbngxfxddywidoq.supabase.co/rest/v1/rpc/mon_track';
    var K = 'sb_publishable_OwXT7OfwIGkuIn420mavVA_MsAkzZGf';
    var sid;
    try { sid = sessionStorage.getItem('_msid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('_msid', sid); } }
    catch (e) { sid = 'x' + Math.random().toString(36).slice(2); }
    var q = [], path = location.pathname, t0 = Date.now(), maxScroll = 0, left = false;
    var lcp = null, cls = 0, inp = 0, vitalsSent = false, clicks = [];

    function add(k, n, v, p) {
      if (q.length >= 60) return;
      q.push({ k: k, n: String(n == null ? '' : n).slice(0, 200), v: (typeof v === 'number' && isFinite(v)) ? v : null, p: p || null, path: path });
    }
    function send() {
      if (!q.length) return;
      var body = JSON.stringify({ e: { site: site, sid: sid, lang: navigator.language || '', ref: (document.referrer || '').slice(0, 300),
        mobile: /Mobi|Android|iPhone/i.test(navigator.userAgent), events: q.splice(0, 60) } });
      try { fetch(EP, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: K, Authorization: 'Bearer ' + K }, body: body }).catch(function () {}); } catch (e) {}
    }
    function leave() {
      if (left) return; left = true;
      add('leave', '', Math.round((Date.now() - t0) / 1000), { scroll: maxScroll });
    }
    function pageview() { add('pageview', (document.title || '').slice(0, 120)); }
    function route() {
      if (location.pathname === path) return;
      leave(); send();
      path = location.pathname; t0 = Date.now(); maxScroll = 0; left = false;
      setTimeout(pageview, 50);
    }

    pageview();
    var ps = history.pushState, rs = history.replaceState;
    history.pushState = function () { var r = ps.apply(this, arguments); route(); return r; };
    history.replaceState = function () { var r = rs.apply(this, arguments); route(); return r; };
    addEventListener('popstate', route);

    addEventListener('scroll', function () {
      var h = document.documentElement, s = Math.round((h.scrollTop + innerHeight) / Math.max(h.scrollHeight, 1) * 100);
      if (s > maxScroll) maxScroll = Math.min(s, 100);
    }, { passive: true });

    addEventListener('click', function (ev) {
      var t = ev.target, el = t && t.closest ? t.closest('a,button,[role=button],[data-track],input[type=submit],summary') : null;
      var now = Date.now();
      clicks = clicks.filter(function (c) { return now - c.t < 1000 && Math.abs(c.x - ev.clientX) < 30 && Math.abs(c.y - ev.clientY) < 30; });
      clicks.push({ t: now, x: ev.clientX, y: ev.clientY });
      if (clicks.length === 3) add('rage', ((el || t).innerText || (t && t.tagName) || '').trim().replace(/\s+/g, ' ').slice(0, 80));
      if (!el) return;
      var label = (el.getAttribute('data-track') || el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      var href = (el.getAttribute('href') || '').slice(0, 200);
      add('click', label, null, { tag: el.tagName.toLowerCase(), href: href });
      if (href && /^https?:/.test(href) && href.indexOf(location.host) < 0) send();
    }, true);

    addEventListener('error', function (e) {
      if (e && e.message) add('error', e.message, null, { src: String(e.filename || '').slice(0, 150), line: e.lineno || 0 });
      else if (e && e.target && (e.target.src || e.target.href)) add('error', 'failed to load ' + e.target.tagName.toLowerCase(), null, { src: String(e.target.src || e.target.href).slice(0, 150) });
    }, true);
    addEventListener('unhandledrejection', function (e) { var r = e && e.reason; add('error', 'promise: ' + String((r && r.message) || r).slice(0, 180)); });

    try { new PerformanceObserver(function (l) { var es = l.getEntries(); if (es.length) lcp = es[es.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (x) { if (!x.hadRecentInput) cls += x.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (x) { if (x.interactionId && x.duration > inp) inp = x.duration; }); }).observe({ type: 'event', buffered: true, durationThreshold: 40 }); } catch (e) {}

    function flush() {
      if (!vitalsSent) {
        vitalsSent = true;
        var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
        if (lcp != null) add('vital', 'LCP', Math.round(lcp));
        add('vital', 'CLS', Math.round(cls * 1000) / 1000);
        if (inp) add('vital', 'INP', Math.round(inp));
        if (nav) add('vital', 'TTFB', Math.round(nav.responseStart));
      }
      leave();
      send();
    }
    addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else if (left) { left = false; t0 = Date.now(); } });
    addEventListener('pagehide', flush);
    setTimeout(send, 5000);

    window.mon = function (name, props) { add('event', name, null, props && typeof props === 'object' ? props : null); send(); };
  } catch (e) {}
})();
