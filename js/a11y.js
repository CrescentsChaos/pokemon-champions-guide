/**
 * Accessibility preferences — persists to localStorage and applies
 * html[data-a11y-*] / html[data-theme] attributes site-wide.
 */
(function () {
    const STORAGE_KEY = 'pcg_a11y_prefs_v1';

    const DEFAULTS = {
        theme: 'dark', // dark | light | auto
        text: 'normal', // normal | large | xlarge
        contrast: false,
        readable: false,
        underline: false,
        motion: 'system' // system | reduce | full
    };

    function loadPrefs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULTS };
            return { ...DEFAULTS, ...JSON.parse(raw) };
        } catch {
            return { ...DEFAULTS };
        }
    }

    function savePrefs(prefs) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            /* ignore */
        }
    }

    function mq(query) {
        if (typeof window.matchMedia !== 'function') return { matches: false, addEventListener() {}, addListener() {} };
        return window.matchMedia(query);
    }

    function resolveTheme(theme) {
        if (theme === 'auto') {
            return mq('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return theme === 'light' ? 'light' : 'dark';
    }

    function resolveMotion(motion) {
        if (motion === 'system') {
            return mq('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full';
        }
        return motion === 'reduce' ? 'reduce' : 'full';
    }

    function applyPrefs(prefs) {
        const root = document.documentElement;
        root.setAttribute('data-theme', resolveTheme(prefs.theme));

        if (prefs.text === 'large' || prefs.text === 'xlarge') {
            root.setAttribute('data-a11y-text', prefs.text);
        } else {
            root.removeAttribute('data-a11y-text');
        }

        root.setAttribute('data-a11y-contrast', prefs.contrast ? 'true' : 'false');
        root.setAttribute('data-a11y-readable', prefs.readable ? 'true' : 'false');
        root.setAttribute('data-a11y-underline', prefs.underline ? 'true' : 'false');
        root.setAttribute('data-a11y-motion', resolveMotion(prefs.motion));
    }

    function announce(msg) {
        const el = document.getElementById('a11y-status');
        if (!el) return;
        el.textContent = '';
        requestAnimationFrame(() => {
            el.textContent = msg;
        });
    }

    function getPrefix() {
        const subDirs = ['/guides/', '/pokedex/', '/abilitydex/', '/movedex/', '/itemdex/', '/teambuilder/', '/builds/', '/calc/', '/compare/', '/counter/'];
        const isSub = subDirs.some((dir) => window.location.pathname.toLowerCase().includes(dir));
        return isSub ? '../' : '';
    }

    function ensureStylesheet() {
        if (document.getElementById('a11y-css')) return;
        const link = document.createElement('link');
        link.id = 'a11y-css';
        link.rel = 'stylesheet';
        link.href = getPrefix() + 'css/a11y.css?v=2';
        document.head.appendChild(link);
    }

    const prefs = loadPrefs();
    ensureStylesheet();
    applyPrefs(prefs);

    function buildUI() {
        if (document.getElementById('a11y-root')) return;

        const root = document.createElement('div');
        root.className = 'a11y-root';
        root.id = 'a11y-root';
        root.innerHTML = `
            <div class="a11y-panel" id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" hidden>
                <div class="a11y-panel__head">
                    <div>
                        <h2 class="a11y-panel__title" id="a11y-title">Settings</h2>
                        <p class="a11y-panel__sub">Personalize contrast, motion, text, and theme. Preferences save on this device.</p>
                    </div>
                    <button type="button" class="a11y-panel__close" id="a11y-close" aria-label="Close accessibility panel">&times;</button>
                </div>

                <div class="a11y-group">
                    <span class="a11y-group__label" id="a11y-theme-label">Theme</span>
                    <div class="a11y-seg" role="group" aria-labelledby="a11y-theme-label">
                        <button type="button" class="a11y-seg__btn" data-pref="theme" data-value="dark" aria-pressed="false">Dark</button>
                        <button type="button" class="a11y-seg__btn" data-pref="theme" data-value="light" aria-pressed="false">Light</button>
                        <button type="button" class="a11y-seg__btn" data-pref="theme" data-value="auto" aria-pressed="false">Auto</button>
                    </div>
                </div>

                <div class="a11y-group">
                    <span class="a11y-group__label" id="a11y-text-label">Text size</span>
                    <div class="a11y-seg" role="group" aria-labelledby="a11y-text-label">
                        <button type="button" class="a11y-seg__btn" data-pref="text" data-value="normal" aria-pressed="false">Default</button>
                        <button type="button" class="a11y-seg__btn" data-pref="text" data-value="large" aria-pressed="false">Large</button>
                        <button type="button" class="a11y-seg__btn" data-pref="text" data-value="xlarge" aria-pressed="false">XL</button>
                    </div>
                </div>

                <div class="a11y-group">
                    <span class="a11y-group__label">Display &amp; reading</span>
                    <button type="button" class="a11y-toggle" data-toggle="contrast" aria-pressed="false">
                        <span class="a11y-toggle__text">
                            <span class="a11y-toggle__name">High contrast</span>
                            <span class="a11y-toggle__desc">Stronger borders and brighter text</span>
                        </span>
                        <span class="a11y-switch" aria-hidden="true"></span>
                    </button>
                    <button type="button" class="a11y-toggle" data-toggle="readable" aria-pressed="false">
                        <span class="a11y-toggle__text">
                            <span class="a11y-toggle__name">Readable font</span>
                            <span class="a11y-toggle__desc">Lexend for easier reading</span>
                        </span>
                        <span class="a11y-switch" aria-hidden="true"></span>
                    </button>
                    <button type="button" class="a11y-toggle" data-toggle="underline" aria-pressed="false">
                        <span class="a11y-toggle__text">
                            <span class="a11y-toggle__name">Underline links</span>
                            <span class="a11y-toggle__desc">Always show link underlines</span>
                        </span>
                        <span class="a11y-switch" aria-hidden="true"></span>
                    </button>
                    <button type="button" class="a11y-toggle" data-toggle="motion" aria-pressed="false">
                        <span class="a11y-toggle__text">
                            <span class="a11y-toggle__name">Reduce motion</span>
                            <span class="a11y-toggle__desc">Minimize animations and transitions</span>
                        </span>
                        <span class="a11y-switch" aria-hidden="true"></span>
                    </button>
                </div>

                <div class="a11y-panel__foot">
                    <button type="button" class="a11y-reset" id="a11y-reset">Reset preferences</button>
                </div>
                <div class="a11y-sr-status" id="a11y-status" role="status" aria-live="polite"></div>
            </div>
        `;

        document.body.appendChild(root);

        let fab = document.getElementById('a11y-fab');
        if (!fab) {
            fab = document.createElement('button');
            fab.type = 'button';
            fab.className = 'nav-settings-tab a11y-settings-fallback';
            fab.id = 'a11y-fab';
            fab.textContent = 'Settings';
            fab.setAttribute('aria-expanded', 'false');
            fab.setAttribute('aria-controls', 'a11y-panel');
            fab.setAttribute('aria-haspopup', 'dialog');
            (document.getElementById('primary-nav') || document.body).appendChild(fab);
        }
        const panel = document.getElementById('a11y-panel');
        const closeBtn = document.getElementById('a11y-close');
        const resetBtn = document.getElementById('a11y-reset');

        function syncUI() {
            panel.querySelectorAll('[data-pref]').forEach((btn) => {
                const key = btn.dataset.pref;
                btn.setAttribute('aria-pressed', prefs[key] === btn.dataset.value ? 'true' : 'false');
            });

            panel.querySelectorAll('[data-toggle]').forEach((btn) => {
                const key = btn.dataset.toggle;
                const on = key === 'motion' ? prefs.motion === 'reduce' : !!prefs[key];
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        }

        function openPanel() {
            panel.hidden = false;
            panel.classList.add('is-open');
            fab.setAttribute('aria-expanded', 'true');
            fab.setAttribute('aria-label', 'Close settings');
            closeBtn.focus();
        }

        function closePanel(returnFocus) {
            panel.classList.remove('is-open');
            fab.setAttribute('aria-expanded', 'false');
            fab.setAttribute('aria-label', 'Open settings');
            setTimeout(() => {
                if (!panel.classList.contains('is-open')) panel.hidden = true;
            }, 200);
            if (returnFocus !== false) fab.focus();
        }

        function commit(partial, message) {
            Object.assign(prefs, partial);
            applyPrefs(prefs);
            savePrefs(prefs);
            syncUI();
            if (message) announce(message);
        }

        fab.addEventListener('click', () => {
            if (panel.classList.contains('is-open')) closePanel();
            else openPanel();
        });

        closeBtn.addEventListener('click', () => closePanel());

        resetBtn.addEventListener('click', () => {
            Object.keys(DEFAULTS).forEach((k) => {
                prefs[k] = DEFAULTS[k];
            });
            applyPrefs(prefs);
            savePrefs(prefs);
            syncUI();
            announce('Accessibility preferences reset');
        });

        panel.addEventListener('click', (e) => {
            const seg = e.target.closest('[data-pref]');
            if (seg) {
                const key = seg.dataset.pref;
                const value = seg.dataset.value;
                const labels = {
                    theme: `Theme set to ${value}`,
                    text: `Text size set to ${value}`
                };
                commit({ [key]: value }, labels[key] || 'Preference updated');
                return;
            }

            const toggle = e.target.closest('[data-toggle]');
            if (!toggle) return;

            const key = toggle.dataset.toggle;
            if (key === 'motion') {
                const next = prefs.motion === 'reduce' ? 'full' : 'reduce';
                commit({ motion: next }, next === 'reduce' ? 'Reduced motion on' : 'Reduced motion off');
                return;
            }

            const nextVal = !prefs[key];
            const name = toggle.querySelector('.a11y-toggle__name');
            commit({ [key]: nextVal }, `${name ? name.textContent : key} ${nextVal ? 'on' : 'off'}`);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) {
                e.stopPropagation();
                closePanel();
            }
        });

        document.addEventListener('click', (e) => {
            if (!panel.classList.contains('is-open')) return;
            if (!root.contains(e.target) && !fab.contains(e.target)) closePanel(false);
        });

        const colorMq = mq('(prefers-color-scheme: light)');
        const onColorChange = () => {
            if (prefs.theme === 'auto') applyPrefs(prefs);
        };
        if (colorMq.addEventListener) colorMq.addEventListener('change', onColorChange);
        else if (colorMq.addListener) colorMq.addListener(onColorChange);

        const motionMq = mq('(prefers-reduced-motion: reduce)');
        const onMotionChange = () => {
            if (prefs.motion === 'system') applyPrefs(prefs);
        };
        if (motionMq.addEventListener) motionMq.addEventListener('change', onMotionChange);
        else if (motionMq.addListener) motionMq.addListener(onMotionChange);

        syncUI();
    }

    function boot() {
        buildUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.PCGA11y = {
        getPrefs: () => ({ ...prefs }),
        setPrefs: (partial) => {
            Object.assign(prefs, partial);
            applyPrefs(prefs);
            savePrefs(prefs);
        }
    };
})();
