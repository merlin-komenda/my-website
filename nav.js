// Client-side navigation: swaps nav/main/footer instead of reloading the document.
// Falls back to a normal browser navigation on any page or condition it can't handle,
// so the site still works correctly if this file fails to load.
(function () {
  if (!window.history || !window.history.pushState || !window.DOMParser) return;

  var parser = new DOMParser();
  var cache = new Map();
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lastPath = window.location.pathname;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function fetchPage(url) {
    if (cache.has(url)) return cache.get(url);
    var p = fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) { return parser.parseFromString(html, 'text/html'); })
      .catch(function (err) { cache.delete(url); throw err; });
    cache.set(url, p);
    return p;
  }

  function swapMeta(doc) {
    document.title = doc.title;
    var incoming = doc.querySelector('meta[name="description"]');
    var current = document.querySelector('meta[name="description"]');
    if (incoming && current) current.setAttribute('content', incoming.getAttribute('content'));
    var canonIn = doc.querySelector('link[rel="canonical"]');
    var canonCur = document.querySelector('link[rel="canonical"]');
    if (canonIn && canonCur) canonCur.setAttribute('href', canonIn.getAttribute('href'));
  }

  // Each page ships its own full <style id="page-css"> block, so the stylesheet
  // has to travel with the content it styles.
  function swapStyles(doc) {
    var incoming = doc.getElementById('page-css');
    var current = document.getElementById('page-css');
    if (incoming && current) current.textContent = incoming.textContent;
  }

  function swapRegions(doc) {
    ['nav.nav', 'main#page', 'footer'].forEach(function (sel) {
      var incoming = doc.querySelector(sel);
      var current = document.querySelector(sel);
      if (incoming && current) current.replaceWith(document.importNode(incoming, true));
    });
  }

  // Chrome handlers live inline on each page for the initial load; re-bind the
  // ones whose elements were just replaced.
  function bindChrome() {
    var menuBtn = document.getElementById('menuBtn');
    var menu = document.getElementById('mobileMenu');
    if (menuBtn && menu) {
      menuBtn.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { menu.classList.remove('open'); });
      });
    }
    var backTop = document.getElementById('backTopBtn');
    if (backTop) {
      backTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // Scripts injected via innerHTML never execute, so page-specific ones are
  // re-created as fresh <script> elements after each swap.
  function runPageScripts(doc) {
    doc.querySelectorAll('script[data-page-script]').forEach(function (old) {
      var s = document.createElement('script');
      s.textContent = old.textContent;
      document.body.appendChild(s);
      s.remove();
    });
  }

  function applyPage(doc, hash) {
    lastPath = window.location.pathname;
    swapMeta(doc);
    swapStyles(doc);
    swapRegions(doc);
    bindChrome();
    runPageScripts(doc);

    var target = hash ? document.querySelector(hash) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);

    var main = document.getElementById('page');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }

  function navigate(path, hash, push) {
    var href = path + hash;
    fetchPage(path).then(function (doc) {
      // A page without the swap container (e.g. /givebutter/) isn't part of this
      // shell — hand it to the browser.
      if (!doc.querySelector('main#page')) { window.location.href = href; return; }
      if (push) history.pushState({ swap: true }, '', href);
      var run = function () { applyPage(doc, hash); };
      if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(run);
      else run();
    }).catch(function () {
      window.location.href = href;
    });
  }

  function linkTarget(el) {
    var a = el && el.closest ? el.closest('a') : null;
    if (!a || !a.href || a.target || a.hasAttribute('download')) return null;
    if (a.dataset.noSwap !== undefined) return null;
    var url;
    try { url = new URL(a.href); } catch (e) { return null; }
    if (url.origin !== window.location.origin) return null;
    if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return null;
    return url;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var url = linkTarget(e.target);
    if (!url) return;
    // Same page: let the browser handle in-page anchors natively.
    if (url.pathname === window.location.pathname) return;
    e.preventDefault();
    navigate(url.pathname + url.search, url.hash, true);
  });

  document.addEventListener('mouseover', function (e) {
    var url = linkTarget(e.target);
    if (!url || url.pathname === window.location.pathname) return;
    fetchPage(url.pathname + url.search).catch(function () {});
  });

  // Only re-swap on back/forward when the path actually changed; a hash-only
  // popstate is the browser's to handle.
  window.addEventListener('popstate', function () {
    var path = window.location.pathname;
    if (path === lastPath) return;
    navigate(path + window.location.search, window.location.hash, false);
  });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.remove('open');
  });
})();
