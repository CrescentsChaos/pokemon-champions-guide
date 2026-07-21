(function injectSharedAssets() {
    const subDirs = ['/guides/', '/pokedex/', '/abilitydex/', '/movedex/', '/itemdex/', '/teambuilder/', '/builds/', '/calc/', '/compare/', '/counter/'];
    const isSub = subDirs.some(dir => window.location.pathname.toLowerCase().includes(dir));
    const prefix = isSub ? '../' : '';

    // Apply saved a11y prefs ASAP to reduce theme flash
    try {
        const raw = localStorage.getItem('pcg_a11y_prefs_v1');
        if (raw) {
            const prefs = JSON.parse(raw);
            const root = document.documentElement;
            const mq = (q) => (typeof window.matchMedia === 'function' ? window.matchMedia(q) : { matches: false });
            let theme = prefs.theme || 'dark';
            if (theme === 'auto') {
                theme = mq('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
            root.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
            if (prefs.text === 'large' || prefs.text === 'xlarge') root.setAttribute('data-a11y-text', prefs.text);
            if (prefs.contrast) root.setAttribute('data-a11y-contrast', 'true');
            if (prefs.readable) root.setAttribute('data-a11y-readable', 'true');
            if (prefs.underline) root.setAttribute('data-a11y-underline', 'true');
            let motion = prefs.motion || 'system';
            if (motion === 'system') {
                motion = mq('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full';
            }
            if (motion === 'reduce') root.setAttribute('data-a11y-motion', 'reduce');
        }
    } catch (_) { /* ignore */ }

    if (!document.getElementById('mobile-css')) {
        const mobileLink = document.createElement('link');
        mobileLink.id = 'mobile-css';
        mobileLink.rel = 'stylesheet';
        mobileLink.href = prefix + 'css/mobile.css';
        document.head.appendChild(mobileLink);
    }

    if (!document.getElementById('a11y-css')) {
        const a11yCss = document.createElement('link');
        a11yCss.id = 'a11y-css';
        a11yCss.rel = 'stylesheet';
        a11yCss.href = prefix + 'css/a11y.css?v=4';
        document.head.appendChild(a11yCss);
    }

    if (!document.getElementById('a11y-js')) {
        const a11yScript = document.createElement('script');
        a11yScript.id = 'a11y-js';
        a11yScript.src = prefix + 'js/a11y.js?v=2';
        document.head.appendChild(a11yScript);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        || document.documentElement.getAttribute('data-a11y-motion') === 'reduce';

    if (!reduceMotion) {
        document.body.classList.add('page-enter');
    }

    const subDirs = ['/guides/', '/pokedex/', '/abilitydex/', '/movedex/', '/itemdex/', '/teambuilder/', '/builds/', '/calc/', '/compare/', '/counter/'];
    const isSub = subDirs.some(dir => window.location.pathname.toLowerCase().includes(dir));
    const prefix = isSub ? '../' : '';

    if (!document.getElementById('skip-to-content')) {
        const skip = document.createElement('a');
        skip.id = 'skip-to-content';
        skip.className = 'skip-link';
        skip.href = '#main-content';
        skip.textContent = 'Skip to main content';
        document.body.insertAdjacentElement('afterbegin', skip);
    }

    const headerHTML = `
        <header id="main-header">
            <div class="container nav-container">
                <a href="${prefix}" class="logo" aria-label="Champions Guide home">
                    <img src="${prefix}assets/champions-logo.png" alt="" width="32" height="32">
                    <span class="logo-text"><span class="logo-text__brand">CHAMPIONS</span><span class="logo-text__accent">GUIDE</span></span>
                </a>
                <button id="menu-toggle" class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">
                    <span class="bar" aria-hidden="true"></span>
                    <span class="bar" aria-hidden="true"></span>
                    <span class="bar" aria-hidden="true"></span>
                </button>
                <nav class="nav-links" id="primary-nav" aria-label="Primary">
                    <a href="${prefix}" data-page="home">Home</a>
                    <a href="${prefix}pokedex/" data-page="pokedex">Pokedex</a>
                    <a href="${prefix}teambuilder/" data-page="teambuilder">Builder</a>
                    <a href="${prefix}builds/" data-page="builds">Builds</a>
                    <a href="${prefix}calc/" data-page="calc">Calc</a>
                    <a href="${prefix}compare/" data-page="compare">Compare</a>
                    <a href="${prefix}counter/" data-page="counter">Counters</a>
                    <button type="button" class="nav-settings-tab" id="a11y-fab" aria-label="Open settings" aria-expanded="false" aria-controls="a11y-panel" aria-haspopup="dialog">Settings</button>
                </nav>
            </div>
        </header>
    `;

    const footerHTML = `
        <footer class="site-footer" role="contentinfo">
            <div class="container site-footer__inner">
                <div class="site-footer__grid">
                    <div class="site-footer__brand">
                        <a href="${prefix}" class="logo" aria-label="Champions Guide home">
                            <img src="${prefix}assets/champions-logo.png" alt="" width="40" height="40">
                            <span class="logo-text"><span class="logo-text__brand">CHAMPIONS</span><span class="logo-text__accent"> GUIDE</span></span>
                        </a>
                        <p class="site-footer__blurb">The Champions-format competitive Pokémon resource. Built for Champions players — precision data, legal builds, and professional tools with 66/32 EV rules baked in.</p>
                    </div>
                    <div>
                        <h4 class="site-footer__heading">Navigation</h4>
                        <ul class="site-footer__list">
                            <li><a href="${prefix}">Home</a></li>
                            <li><a href="${prefix}pokedex/">Elite Pokédex</a></li>
                            <li><a href="${prefix}builds/">Competitive Builds</a></li>
                            <li><a href="${prefix}teambuilder/">Team Builder</a></li>
                            <li><a href="${prefix}calc/">Damage Calc</a></li>
                            <li><a href="${prefix}compare/">Compare Builds</a></li>
                            <li><a href="${prefix}counter/">Counter Tool</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="site-footer__heading">Settings</h4>
                        <ul class="site-footer__list">
                            <li><a href="#a11y-fab" id="footer-a11y-link">Open display &amp; accessibility settings</a></li>
                            <li><a href="#main-content">Skip to content</a></li>
                            <li><span style="color: var(--text-muted); font-size: 0.92rem;">Preferences save locally</span></li>
                        </ul>
                    </div>
                </div>
                <div class="site-footer__bottom">
                    <p class="site-footer__copy">&copy; 2026 Pokémon Champions Guide. For educational use. Not affiliated with Nintendo or The Pokémon Company.</p>
                    <div class="mono site-footer__patch">LATEST_PATCH: 10.0.1 // SCALE_UP</div>
                </div>
            </div>
        </footer>
    `;

    const body = document.body;
    if (!document.getElementById('main-header')) {
        const skipEl = document.getElementById('skip-to-content');
        if (skipEl) {
            skipEl.insertAdjacentHTML('afterend', headerHTML);
        } else {
            body.insertAdjacentHTML('afterbegin', headerHTML);
        }
    }
    if (!document.querySelector('footer')) {
        body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // Ensure a skip-link target without restructuring the DOM
    let main = document.getElementById('main-content') || document.querySelector('main');
    if (!main) {
        main = document.querySelector('body > section, body > .container, body > div');
    }
    if (main) {
        if (!main.id) main.id = 'main-content';
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    } else {
        const sentinel = document.createElement('div');
        sentinel.id = 'main-content';
        sentinel.setAttribute('tabindex', '-1');
        sentinel.setAttribute('aria-hidden', 'true');
        const header = document.getElementById('main-header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(sentinel, header.nextSibling);
        } else {
            body.insertAdjacentElement('afterbegin', sentinel);
        }
    }

    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    function setMenuOpen(open) {
        if (!menuToggle || !navLinksContainer) return;
        menuToggle.classList.toggle('active', open);
        navLinksContainer.classList.toggle('active', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = open ? 'hidden' : '';
    }

    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            setMenuOpen(!navLinksContainer.classList.contains('active'));
        });

        document.querySelectorAll('.nav-links a, .nav-links button').forEach(link => {
            link.addEventListener('click', () => setMenuOpen(false));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinksContainer.classList.contains('active')) {
                setMenuOpen(false);
                menuToggle.focus();
            }
        });
    }

    const footerA11y = document.getElementById('footer-a11y-link');
    if (footerA11y) {
        footerA11y.addEventListener('click', (e) => {
            e.preventDefault();
            const fab = document.getElementById('a11y-fab');
            if (fab) {
                fab.focus();
                fab.click();
            }
        });
    }

    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (!header) return;
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }, { passive: true });

    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        const isHome = page === 'home' && (currentPath === '/' || currentPath === '' || currentPath.endsWith('index.html'))
            && !currentPath.includes('pokedex')
            && !currentPath.includes('builds')
            && !currentPath.includes('teambuilder')
            && !currentPath.includes('calc')
            && !currentPath.includes('compare')
            && !currentPath.includes('counter')
            && !currentPath.includes('movedex')
            && !currentPath.includes('abilitydex')
            && !currentPath.includes('itemdex');
        const isMatch = (page && page !== 'home' && currentPath.includes(page)) || isHome;
        if (isMatch) {
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
        }
    });

    const faders = document.querySelectorAll('.fade-in');
    if (reduceMotion) {
        faders.forEach((el) => el.classList.add('appear'));
    } else {
        const appearOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        };

        const appearOnScroll = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            });
        }, appearOptions);

        faders.forEach(fader => {
            appearOnScroll.observe(fader);
            const rect = fader.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
                fader.classList.add('appear');
            }
        });
    }
});
