/**
 * Champions Guide — theme engine.
 *
 * Loaded synchronously in <head> on every page so the saved look is applied
 * before first paint. It owns every display preference (theme, accent, type,
 * motion and accessibility options), persists them, and exposes window.PCGTheme
 * for the Settings UI (js/settings.js) and for any page script that needs it.
 *
 * Visual tokens live in css/theme.css and are switched through attributes on
 * <html>:  data-surface, data-theme (dark|light), data-accent, data-radius,
 * data-density, data-ambient, data-font, data-motion and the data-a11y-* flags.
 */
(function () {
    'use strict';

    var KEY = 'pcg_settings_v2';
    var LEGACY_KEY = 'pcg_a11y_prefs_v1';

    /* ── Palettes ───────────────────────────────────────────────── */
    // bg values mirror css/theme.css; they are needed here to keep accents readable.
    var SURFACES = {
        graphite:  { label: 'Graphite',  mode: 'dark',  bg: '#0d0f13', elevated: '#151920', edge: '#2a303b' },
        midnight:  { label: 'Midnight',  mode: 'dark',  bg: '#0a0e1a', elevated: '#111831', edge: '#26325a' },
        evergreen: { label: 'Evergreen', mode: 'dark',  bg: '#0a120f', elevated: '#10201a', edge: '#244236' },
        ember:     { label: 'Ember',     mode: 'dark',  bg: '#120d0c', elevated: '#1c1413', edge: '#43302c' },
        daylight:  { label: 'Daylight',  mode: 'light', bg: '#f5f6f8', elevated: '#ffffff', edge: '#d9dde5' },
        frost:     { label: 'Frost',     mode: 'light', bg: '#edf1f7', elevated: '#fafbfd', edge: '#cfd8e6' }
    };

    var ACCENTS = {
        crimson: { label: 'Crimson', hex: '#ff3e3e' },
        cobalt:  { label: 'Cobalt',  hex: '#4d94ff' },
        emerald: { label: 'Emerald', hex: '#22c581' },
        violet:  { label: 'Violet',  hex: '#8b6cff' },
        amber:   { label: 'Amber',   hex: '#ffb020' },
        rose:    { label: 'Rose',    hex: '#ff5c96' },
        cyan:    { label: 'Cyan',    hex: '#22c8dc' }
    };

    var PRESETS = [
        { id: 'champion',    label: 'Champion',    surface: 'graphite',  accent: 'crimson' },
        { id: 'tidal',       label: 'Tidal',       surface: 'midnight',  accent: 'cobalt' },
        { id: 'venom',       label: 'Venom',       surface: 'evergreen', accent: 'emerald' },
        { id: 'ultraviolet', label: 'Ultraviolet', surface: 'midnight',  accent: 'violet' },
        { id: 'ember',       label: 'Ember',       surface: 'ember',     accent: 'amber' },
        { id: 'rosewood',    label: 'Rosewood',    surface: 'ember',     accent: 'rose' },
        { id: 'daybreak',    label: 'Daybreak',    surface: 'daylight',  accent: 'cobalt' },
        { id: 'frostbite',   label: 'Frostbite',   surface: 'frost',     accent: 'violet' }
    ];

    /* ── Typography ─────────────────────────────────────────────── */
    var FALLBACK_SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    var FALLBACK_MONO = "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace";

    var FONTS = {
        studio: {
            label: 'Studio', note: 'Funnel Display headings, Geist text',
            display: "'Funnel Display', 'Geist', " + FALLBACK_SANS,
            sans: "'Geist', " + FALLBACK_SANS,
            mono: "'Geist Mono', " + FALLBACK_MONO,
            families: ['Funnel+Display:wght@400..800', 'Geist:wght@300..800', 'Geist+Mono:wght@400..700']
        },
        technical: {
            label: 'Technical', note: 'Geist and Geist Mono throughout',
            display: "'Geist', " + FALLBACK_SANS,
            sans: "'Geist', " + FALLBACK_SANS,
            mono: "'Geist Mono', " + FALLBACK_MONO,
            families: ['Geist:wght@300..800', 'Geist+Mono:wght@400..700']
        },
        editorial: {
            label: 'Editorial', note: 'Fraunces headings, Geist text',
            display: "'Fraunces', Georgia, 'Times New Roman', serif",
            sans: "'Geist', " + FALLBACK_SANS,
            mono: "'Geist Mono', " + FALLBACK_MONO,
            families: ['Fraunces:opsz,wght@9..144,400..700', 'Geist:wght@300..800', 'Geist+Mono:wght@400..700']
        },
        hyperlegible: {
            label: 'Hyperlegible', note: 'Atkinson Hyperlegible, built for low vision',
            display: "'Atkinson Hyperlegible Next', " + FALLBACK_SANS,
            sans: "'Atkinson Hyperlegible Next', " + FALLBACK_SANS,
            mono: "'Atkinson Hyperlegible Mono', " + FALLBACK_MONO,
            families: ['Atkinson+Hyperlegible+Next:wght@300..800', 'Atkinson+Hyperlegible+Mono:wght@300..700']
        },
        lexend: {
            label: 'Lexend', note: 'Tuned for reading fluency and dyslexia',
            display: "'Lexend', " + FALLBACK_SANS,
            sans: "'Lexend', " + FALLBACK_SANS,
            mono: "'Geist Mono', " + FALLBACK_MONO,
            families: ['Lexend:wght@300..700', 'Geist+Mono:wght@400..700']
        }
    };

    /* ── Defaults + persistence ─────────────────────────────────── */
    var DEFAULTS = {
        surface: 'graphite',      // graphite | midnight | evergreen | ember | daylight | frost | auto
        accent: 'crimson',        // key of ACCENTS | custom
        customAccent: '#ff3e3e',
        radius: 'default',        // sharp | default | soft
        density: 'comfortable',   // comfortable | compact
        ambient: true,            // soft accent glow behind pages
        font: 'studio',
        textScale: 100,           // 90 – 130 (%)
        lineSpacing: 'normal',    // normal | relaxed
        textSpacing: false,       // WCAG 1.4.12 letter / word spacing
        contrast: false,
        underline: false,
        focus: 'default',         // default | strong
        targets: false,           // larger tap targets
        motion: 'system',         // system | full | subtle | off
        transitions: true         // animated page-to-page transitions
    };

    function migrateLegacy() {
        try {
            var raw = localStorage.getItem(LEGACY_KEY);
            if (!raw) return null;
            var old = JSON.parse(raw), out = {};
            if (old.theme === 'light') out.surface = 'daylight';
            else if (old.theme === 'auto') out.surface = 'auto';
            if (old.text === 'large') out.textScale = 112;
            if (old.text === 'xlarge') out.textScale = 125;
            if (old.contrast) out.contrast = true;
            if (old.readable) out.font = 'lexend';
            if (old.underline) out.underline = true;
            if (old.motion === 'reduce') out.motion = 'off';
            else if (old.motion === 'full') out.motion = 'full';
            return out;
        } catch (e) { return null; }
    }

    function load() {
        var prefs = {}, k;
        for (k in DEFAULTS) prefs[k] = DEFAULTS[k];
        try {
            var raw = localStorage.getItem(KEY);
            var saved = raw ? JSON.parse(raw) : migrateLegacy();
            if (saved) for (k in saved) if (k in DEFAULTS) prefs[k] = saved[k];
        } catch (e) { /* storage blocked: keep defaults */ }
        return sanitize(prefs);
    }

    function sanitize(p) {
        if (p.surface !== 'auto' && !SURFACES[p.surface]) p.surface = DEFAULTS.surface;
        if (p.accent !== 'custom' && !ACCENTS[p.accent]) p.accent = DEFAULTS.accent;
        if (!/^#[0-9a-f]{6}$/i.test(p.customAccent || '')) p.customAccent = DEFAULTS.customAccent;
        if (!FONTS[p.font]) p.font = DEFAULTS.font;
        p.textScale = Math.min(130, Math.max(90, Math.round(Number(p.textScale) || 100)));
        ['radius:sharp,default,soft', 'density:comfortable,compact', 'lineSpacing:normal,relaxed',
         'focus:default,strong', 'motion:system,full,subtle,off'].forEach(function (rule) {
            var parts = rule.split(':'), opts = parts[1].split(',');
            if (opts.indexOf(p[parts[0]]) < 0) p[parts[0]] = DEFAULTS[parts[0]];
        });
        ['ambient', 'textSpacing', 'contrast', 'underline', 'targets', 'transitions'].forEach(function (b) { p[b] = !!p[b]; });
        return p;
    }

    var prefs = load();
    var listeners = [];

    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    }

    /* ── Colour maths ───────────────────────────────────────────── */
    function hexToRgb(hex) {
        var h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    function lum(rgb) {
        var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function ratio(a, b) {
        var l1 = lum(a), l2 = lum(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    function mix(rgb, target, t) {
        return rgb.map(function (v, i) { return Math.round(v + (target[i] - v) * t); });
    }
    /** Nudge the accent until it reads at 4.5:1 against the page background. */
    function readableAccent(rgb, bgHex, mode) {
        var bg = hexToRgb(bgHex), out = rgb.slice(), i = 0;
        var target = mode === 'light' ? [0, 0, 0] : [255, 255, 255];
        while (ratio(out, bg) < 4.5 && i < 24) { out = mix(out, target, 0.06); i++; }
        return out;
    }
    function onAccent(rgb) {
        return ratio(rgb, [255, 255, 255]) >= 3.1 ? '#ffffff' : '#0c0e14';
    }

    /* ── Apply ──────────────────────────────────────────────────── */
    function mq(q) {
        return typeof window.matchMedia === 'function' ? window.matchMedia(q) : { matches: false };
    }
    function resolveSurface() {
        if (prefs.surface === 'auto') return mq('(prefers-color-scheme: light)').matches ? 'daylight' : 'graphite';
        return prefs.surface;
    }
    function resolveMotion() {
        if (prefs.motion === 'system') return mq('(prefers-reduced-motion: reduce)').matches ? 'off' : 'full';
        return prefs.motion;
    }

    var loadedFonts = {};
    function loadFont(id) {
        if (loadedFonts[id] || !document.head) return;
        loadedFonts[id] = true;
        if (!document.getElementById('pcg-fonts-preconnect')) {
            ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach(function (href, i) {
                var l = document.createElement('link');
                l.rel = 'preconnect'; l.href = href;
                if (i) l.crossOrigin = '';
                if (!i) l.id = 'pcg-fonts-preconnect';
                document.head.appendChild(l);
            });
        }
        // One request per family so a single unavailable family cannot block the rest.
        FONTS[id].families.forEach(function (fam) {
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=' + fam + '&display=swap';
            document.head.appendChild(l);
        });
    }

    function apply() {
        var root = document.documentElement;
        var sid = resolveSurface(), s = SURFACES[sid];
        var motion = resolveMotion();

        root.setAttribute('data-surface', sid);
        root.setAttribute('data-theme', s.mode);
        root.setAttribute('data-accent', prefs.accent);
        root.setAttribute('data-radius', prefs.radius);
        root.setAttribute('data-density', prefs.density);
        root.setAttribute('data-ambient', prefs.ambient ? 'on' : 'off');
        root.setAttribute('data-font', prefs.font);
        root.setAttribute('data-motion', motion);
        root.setAttribute('data-a11y-motion', motion === 'off' ? 'reduce' : 'full'); // legacy flag read by page scripts
        root.setAttribute('data-a11y-contrast', prefs.contrast ? 'true' : 'false');
        root.setAttribute('data-a11y-underline', prefs.underline ? 'true' : 'false');
        root.setAttribute('data-a11y-spacing', prefs.textSpacing ? 'true' : 'false');
        root.setAttribute('data-a11y-focus', prefs.focus);
        root.setAttribute('data-a11y-targets', prefs.targets ? 'true' : 'false');
        root.setAttribute('data-line', prefs.lineSpacing);
        root.setAttribute('data-transitions', prefs.transitions ? 'on' : 'off');

        var base = hexToRgb(prefs.accent === 'custom' ? prefs.customAccent : ACCENTS[prefs.accent].hex);
        var acc = readableAccent(base, s.bg, s.mode);
        var st = root.style;
        st.setProperty('--accent-rgb', acc.join(' '));
        st.setProperty('--on-accent', onAccent(acc));
        st.setProperty('--text-scale', String(prefs.textScale / 100));

        var f = FONTS[prefs.font];
        st.setProperty('--font-display', f.display);
        st.setProperty('--font-sans', f.sans);
        st.setProperty('--font-mono', f.mono);
        loadFont(prefs.font);

        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta && document.head) {
            meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta);
        }
        if (meta) meta.content = s.bg;
    }

    function emit() {
        listeners.forEach(function (fn) { try { fn(get()); } catch (e) { /* ignore */ } });
    }

    function get() { var c = {}, k; for (k in prefs) c[k] = prefs[k]; return c; }

    function set(partial, opts) {
        for (var k in partial) if (k in DEFAULTS) prefs[k] = partial[k];
        sanitize(prefs);
        apply(); save();
        if (!opts || opts.silent !== true) emit();
    }

    function reset() {
        prefs = sanitize(Object.assign({}, DEFAULTS));
        apply(); save(); emit();
    }

    function currentPreset() {
        for (var i = 0; i < PRESETS.length; i++) {
            if (PRESETS[i].surface === prefs.surface && PRESETS[i].accent === prefs.accent) return PRESETS[i].id;
        }
        return null;
    }

    /** Flip light/dark with a circular reveal where the browser supports it. */
    function toggleMode(originEvent) {
        var isLight = SURFACES[resolveSurface()].mode === 'light';
        var next = isLight ? (lastDark || 'graphite') : (lastLight || 'daylight');
        var change = function () { set({ surface: next }); };
        var canAnimate = document.startViewTransition && resolveMotion() !== 'off';
        if (!canAnimate) { change(); return; }
        var x = originEvent && originEvent.clientX != null ? originEvent.clientX : window.innerWidth - 40;
        var y = originEvent && originEvent.clientY != null ? originEvent.clientY : 36;
        var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        document.documentElement.setAttribute('data-vt', 'theme');
        var t = document.startViewTransition(change);
        t.ready.then(function () {
            document.documentElement.animate(
                { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
                { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        }).catch(function () {});
        t.finished.finally(function () { document.documentElement.removeAttribute('data-vt'); });
    }

    var lastDark = SURFACES[prefs.surface] && SURFACES[prefs.surface].mode === 'dark' ? prefs.surface : null;
    var lastLight = SURFACES[prefs.surface] && SURFACES[prefs.surface].mode === 'light' ? prefs.surface : null;
    listeners.push(function (p) {
        var s = SURFACES[p.surface];
        if (!s) return;
        if (s.mode === 'dark') lastDark = p.surface; else lastLight = p.surface;
    });

    function exportJSON() { return JSON.stringify({ app: 'champions-guide', version: 2, settings: get() }, null, 2); }
    function importJSON(text) {
        var data = JSON.parse(text);
        var incoming = data && data.settings ? data.settings : data;
        if (!incoming || typeof incoming !== 'object') throw new Error('Unrecognised settings file');
        set(incoming);
    }

    // Keep "auto" surfaces and "system" motion in sync with OS changes.
    [['(prefers-color-scheme: light)', 'surface'], ['(prefers-reduced-motion: reduce)', 'motion']].forEach(function (pair) {
        var m = mq(pair[0]);
        var fn = function () { if (prefs[pair[1]] === (pair[1] === 'surface' ? 'auto' : 'system')) { apply(); emit(); } };
        if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn);
    });

    apply();

    window.PCGTheme = {
        SURFACES: SURFACES, ACCENTS: ACCENTS, PRESETS: PRESETS, FONTS: FONTS, DEFAULTS: DEFAULTS,
        get: get, set: set, reset: reset, apply: apply, preloadFont: loadFont,
        onChange: function (fn) { listeners.push(fn); },
        currentPreset: currentPreset, toggleMode: toggleMode,
        exportJSON: exportJSON, importJSON: importJSON,
        resolvedSurface: resolveSurface, resolvedMotion: resolveMotion,
        contrastRatio: function (hexA, hexB) { return ratio(hexToRgb(hexA), hexToRgb(hexB)); }
    };

    // Backwards-compatible shim for the retired accessibility module.
    window.PCGA11y = {
        getPrefs: get,
        setPrefs: function (partial) { set(partial); }
    };
})();
