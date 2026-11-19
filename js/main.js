/**
 * Shared chrome for every page: header, navigation, footer, and the motion
 * choreography that ties them together. Theme state lives in theme-boot.js and
 * the Settings UI in settings.js (loaded on demand).
 */
(function () {
    'use strict';

    var SUB_DIRS = ['/guides/', '/pokedex/', '/abilitydex/', '/movedex/', '/itemdex/', '/teambuilder/', '/builds/', '/calc/', '/compare/', '/counter/', '/settings/'];
    var path = window.location.pathname.toLowerCase();
    var prefix = SUB_DIRS.some(function (d) { return path.indexOf(d) !== -1; }) ? '../' : '';

    function prefersReducedMotion() {
        var root = document.documentElement;
        if (root.getAttribute('data-motion')) return root.getAttribute('data-motion') === 'off';
        return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* Shared stylesheets that must come after the page's own CSS */
    function addStylesheet(id, href) {
        if (document.getElementById(id)) return;
        var link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet'; link.href = href;
        document.head.appendChild(link);
    }
    if (!document.querySelector('link[href*="css/theme.css"]')) addStylesheet('theme-css', prefix + 'css/theme.css?v=1');
    addStylesheet('mobile-css', prefix + 'css/mobile.css');

    /* Settings module is loaded lazily the first time it is needed */
    var settingsPromise = null;
    function ensureSettings() {
        if (window.PCGSettings) return Promise.resolve(window.PCGSettings);
        if (settingsPromise) return settingsPromise;
        settingsPromise = new Promise(function (resolve, reject) {
            addStylesheet('settings-css', prefix + 'css/settings.css?v=1');
            var s = document.createElement('script');
            s.src = prefix + 'js/settings.js?v=1';
            s.onload = function () { resolve(window.PCGSettings); };
            s.onerror = function () { settingsPromise = null; reject(new Error('Settings failed to load')); };
            document.head.appendChild(s);
        });
        return settingsPromise;
    }
    window.PCGEnsureSettings = ensureSettings;
    window.PCGOpenSettings = function (trigger, tab) {
        return ensureSettings().then(function (api) { api.openDrawer(trigger, tab); });
    };

    var ICON_SUN = '<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    var ICON_MOON = '<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    var ICON_SLIDERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>';

    document.addEventListener('DOMContentLoaded', function () {
        var body = document.body;
        var reduce = prefersReducedMotion();

        /* Skip link */
        if (!document.getElementById('skip-to-content')) {
            var skip = document.createElement('a');
            skip.id = 'skip-to-content';
            skip.className = 'skip-link';
            skip.href = '#main-content';
            skip.textContent = 'Skip to main content';
            body.insertAdjacentElement('afterbegin', skip);
        }

        var headerHTML =
            '<header id="main-header">' +
            '  <div class="container nav-container">' +
            '    <a href="' + prefix + '" class="logo" aria-label="Champions Guide home">' +
            '      <img src="' + prefix + 'assets/champions-logo.png" alt="" width="30" height="30">' +
            '      <span class="logo-text"><span class="logo-text__brand">Champions</span><span class="logo-text__accent">Guide</span></span>' +
            '    </a>' +
            '    <nav class="nav-links" id="primary-nav" aria-label="Primary">' +
            '      <a href="' + prefix + '" data-page="home">Home</a>' +
            '      <a href="' + prefix + 'pokedex/" data-page="pokedex">Pokédex</a>' +
            '      <a href="' + prefix + 'teambuilder/" data-page="teambuilder">Builder</a>' +
            '      <a href="' + prefix + 'builds/" data-page="builds">Builds</a>' +
            '      <a href="' + prefix + 'calc/" data-page="calc">Calc</a>' +
            '      <a href="' + prefix + 'compare/" data-page="compare">Compare</a>' +
            '      <a href="' + prefix + 'counter/" data-page="counter">Counters</a>' +
            '      <a href="' + prefix + 'settings/" data-page="settings">Settings</a>' +
            '    </nav>' +
            '    <div class="header-actions">' +
            '      <button type="button" class="icon-btn theme-toggle" id="theme-toggle" aria-label="Switch theme" title="Switch light / dark">' + ICON_SUN + ICON_MOON + '</button>' +
            '      <button type="button" class="icon-btn" id="quick-settings" aria-label="Open quick settings" aria-haspopup="dialog" aria-expanded="false" aria-controls="settings-drawer" title="Quick settings">' + ICON_SLIDERS + '</button>' +
            '      <button id="menu-toggle" class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">' +
            '        <span class="bar" aria-hidden="true"></span><span class="bar" aria-hidden="true"></span><span class="bar" aria-hidden="true"></span>' +
            '      </button>' +
            '    </div>' +
            '  </div>' +
            '</header>';

        var footerHTML =
            '<footer class="site-footer" role="contentinfo">' +
            '  <div class="container site-footer__inner">' +
            '    <div class="site-footer__grid">' +
            '      <div class="site-footer__brand">' +
            '        <a href="' + prefix + '" class="logo" aria-label="Champions Guide home">' +
            '          <img src="' + prefix + 'assets/champions-logo.png" alt="" width="34" height="34">' +
            '          <span class="logo-text"><span class="logo-text__brand">Champions</span><span class="logo-text__accent">Guide</span></span>' +
            '        </a>' +
            '        <p class="site-footer__blurb">Data, legal builds and battle tools for Pokémon Champions, with the 66/32 EV rules built in.</p>' +
            '      </div>' +
            '      <div>' +
            '        <h4 class="site-footer__heading">Tools</h4>' +
            '        <ul class="site-footer__list">' +
            '          <li><a href="' + prefix + 'pokedex/">Elite Pokédex</a></li>' +
            '          <li><a href="' + prefix + 'builds/">Competitive builds</a></li>' +
            '          <li><a href="' + prefix + 'teambuilder/">Team builder</a></li>' +
            '          <li><a href="' + prefix + 'calc/">Damage calculator</a></li>' +
            '          <li><a href="' + prefix + 'compare/">Compare builds</a></li>' +
            '          <li><a href="' + prefix + 'counter/">Counter tool</a></li>' +
            '        </ul>' +
            '      </div>' +
            '      <div>' +
            '        <h4 class="site-footer__heading">Preferences</h4>' +
            '        <ul class="site-footer__list">' +
            '          <li><a href="#quick-settings" id="footer-settings-link">Quick settings</a></li>' +
            '          <li><a href="' + prefix + 'settings/">All settings and accessibility</a></li>' +
            '          <li><a href="#main-content">Back to content</a></li>' +
            '        </ul>' +
            '      </div>' +
            '    </div>' +
            '    <div class="site-footer__bottom">' +
            '      <p class="site-footer__copy">&copy; 2026 Pokémon Champions Guide. For educational use. Not affiliated with Nintendo or The Pokémon Company.</p>' +
            '      <span class="mono site-footer__patch">Patch 10.0.1</span>' +
            '    </div>' +
            '  </div>' +
            '</footer>';

        if (!document.getElementById('main-header')) {
            var skipEl = document.getElementById('skip-to-content');
            if (skipEl) skipEl.insertAdjacentHTML('afterend', headerHTML);
            else body.insertAdjacentHTML('afterbegin', headerHTML);
        }
        if (!document.querySelector('footer')) body.insertAdjacentHTML('beforeend', footerHTML);

        /* Skip-link target */
        var main = document.getElementById('main-content') || document.querySelector('main');
        if (!main) main = document.querySelector('body > section, body > .container, body > div');
        if (main) {
            if (!main.id) main.id = 'main-content';
            if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        } else {
            var sentinel = document.createElement('div');
            sentinel.id = 'main-content';
            sentinel.setAttribute('tabindex', '-1');
            sentinel.setAttribute('aria-hidden', 'true');
            var hdr = document.getElementById('main-header');
            if (hdr && hdr.nextSibling) hdr.parentNode.insertBefore(sentinel, hdr.nextSibling);
            else body.insertAdjacentElement('afterbegin', sentinel);
        }

        /* Mobile menu */
        var menuToggle = document.getElementById('menu-toggle');
        var nav = document.getElementById('primary-nav');
        var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a'));
        navLinks.forEach(function (a, i) { a.style.setProperty('--i', i); });

        function setMenuOpen(open) {
            menuToggle.classList.toggle('active', open);
            nav.classList.toggle('active', open);
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            body.style.overflow = open ? 'hidden' : '';
        }
        menuToggle.addEventListener('click', function () { setMenuOpen(!nav.classList.contains('active')); });
        navLinks.forEach(function (a) { a.addEventListener('click', function () { setMenuOpen(false); }); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('active')) { setMenuOpen(false); menuToggle.focus(); }
        });
        window.matchMedia('(min-width: 1041px)').addEventListener('change', function (e) { if (e.matches) setMenuOpen(false); });

        /* Active page */
        var isDexAlias = /\/(movedex|itemdex|abilitydex)\//.test(path);
        var isSubPage = SUB_DIRS.some(function (d) { return path.indexOf(d) !== -1; });
        var current = null;
        navLinks.forEach(function (link) {
            var page = link.getAttribute('data-page');
            var match = false;
            if (page === 'home') match = !isSubPage;
            else if (page === 'pokedex') match = path.indexOf('/pokedex/') !== -1 || isDexAlias;
            else match = path.indexOf('/' + page + '/') !== -1;
            if (match) {
                link.classList.add('is-active');
                link.setAttribute('aria-current', 'page');
                current = link;
            }
        });

        /* Sliding indicator behind the active / hovered link */
        var pill = document.createElement('span');
        pill.className = 'nav-pill';
        pill.setAttribute('aria-hidden', 'true');
        nav.appendChild(pill);

        function placePill(el, hover) {
            if (!el || window.innerWidth <= 1040) { pill.classList.remove('is-ready'); nav.classList.remove('has-pill'); return; }
            nav.classList.add('has-pill');
            pill.style.width = el.offsetWidth + 'px';
            pill.style.transform = 'translateX(' + el.offsetLeft + 'px)';
            pill.classList.toggle('is-hover', !!hover && el !== current);
            pill.classList.add('is-ready');
        }
        function restorePill() { placePill(current, false); }
        navLinks.forEach(function (a) {
            a.addEventListener('mouseenter', function () { placePill(a, true); });
            a.addEventListener('focus', function () { placePill(a, true); });
        });
        nav.addEventListener('mouseleave', restorePill);
        nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) restorePill(); });
        window.addEventListener('resize', restorePill);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(restorePill);
        // First placement should not slide in from the left edge
        pill.style.transition = 'none';
        restorePill();
        requestAnimationFrame(function () { requestAnimationFrame(function () { pill.style.transition = ''; }); });

        /* Header surface on scroll */
        var header = document.getElementById('main-header');
        function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        /* Theme toggle + quick settings */
        var themeBtn = document.getElementById('theme-toggle');
        function syncThemeBtn() {
            var light = document.documentElement.getAttribute('data-theme') === 'light';
            themeBtn.setAttribute('aria-label', light ? 'Switch to a dark theme' : 'Switch to a light theme');
        }
        syncThemeBtn();
        themeBtn.addEventListener('click', function (e) {
            window.PCGTheme.toggleMode(e);
            setTimeout(syncThemeBtn, 80);
        });
        if (window.PCGTheme) window.PCGTheme.onChange(syncThemeBtn);

        var quickBtn = document.getElementById('quick-settings');
        quickBtn.addEventListener('click', function () { window.PCGOpenSettings(quickBtn); });
        var footerLink = document.getElementById('footer-settings-link');
        if (footerLink) footerLink.addEventListener('click', function (e) { e.preventDefault(); window.PCGOpenSettings(footerLink); });
        var idle = window.requestIdleCallback || function (fn) { setTimeout(fn, 1200); };
        idle(function () { ensureSettings().catch(function () {}); });

        /* Scroll reveal: stagger siblings so grids arrive as a sequence */
        var faders = Array.prototype.slice.call(document.querySelectorAll('.fade-in'));
        var groups = new Map();
        faders.forEach(function (el) {
            var list = groups.get(el.parentElement) || [];
            list.push(el); groups.set(el.parentElement, list);
        });
        groups.forEach(function (list) {
            list.forEach(function (el, i) { el.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms'); });
        });

        if (reduce) {
            faders.forEach(function (el) { el.classList.add('appear'); });
        } else {
            var io = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('appear');
                    obs.unobserve(entry.target);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            faders.forEach(function (el) {
                io.observe(el);
                var r = el.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add('appear');
            });
        }

        /* Stagger stat bars as dynamic content renders */
        if (!reduce && 'MutationObserver' in window) {
            var BAR_SEL = '.stat-bar-fill, .stat-fill-mini, .modal-stat-bar, .stat-fill, .hp-fill, .bar-fill';
            var pending = new Set(), scheduled = false;
            var flush = function () {
                scheduled = false;
                pending.forEach(function (node) {
                    var bars = node.matches && node.matches(BAR_SEL) ? [node] : [];
                    if (node.querySelectorAll) bars = bars.concat(Array.prototype.slice.call(node.querySelectorAll(BAR_SEL)));
                    bars.forEach(function (bar) {
                        if (bar.dataset.barStaggered) return;
                        bar.dataset.barStaggered = '1';
                        var row = bar.closest('.stat-row, .modal-stat-row');
                        var idx = row && row.parentElement ? Array.prototype.indexOf.call(row.parentElement.children, row) : 0;
                        bar.style.setProperty('--bar-i', Math.min(idx, 10));
                    });
                });
                pending.clear();
            };
            new MutationObserver(function (muts) {
                muts.forEach(function (m) {
                    m.addedNodes.forEach(function (n) { if (n.nodeType === 1) pending.add(n); });
                });
                if (!scheduled && pending.size) { scheduled = true; requestAnimationFrame(flush); }
            }).observe(body, { childList: true, subtree: true });
        }
    });
})();

/* Tool cards: cursor-follow glow */
document.addEventListener('pointermove', function (e) {
    var card = e.target.closest && e.target.closest('.home-tool-card');
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
