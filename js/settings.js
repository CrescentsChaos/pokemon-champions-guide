/**
 * Settings — one UI, two homes.
 *   • Drawer: opened from the header on any page (PCGSettings.openDrawer)
 *   • Page:   settings/index.html mounts the same UI at full size (PCGSettings.mountPage)
 *
 * Appearance, typography, accessibility and motion live together here and all
 * write through window.PCGTheme (js/theme-boot.js).
 */
(function () {
    'use strict';

    var T = window.PCGTheme;
    if (!T) return;

    var TABS = [
        { id: 'appearance',    label: 'Appearance',    blurb: 'Theme, colour and shape' },
        { id: 'typography',    label: 'Typography',    blurb: 'Fonts, size and spacing' },
        { id: 'accessibility', label: 'Accessibility', blurb: 'Contrast, focus and targets' },
        { id: 'motion',        label: 'Motion',        blurb: 'Animation and transitions' },
        { id: 'data',          label: 'Data',          blurb: 'Back up or reset' }
    ];

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /* ── Control builders ───────────────────────────────────────── */

    function row(title, desc, control, id) {
        return '<div class="st-row"><div class="st-row__text"><span class="st-row__title"' + (id ? ' id="' + id + '"' : '') + '>' + title + '</span>' +
            (desc ? '<span class="st-row__desc">' + desc + '</span>' : '') + '</div>' + control + '</div>';
    }

    function segmented(key, options, labelledBy) {
        return '<div class="st-seg" role="radiogroup"' + (labelledBy ? ' aria-labelledby="' + labelledBy + '"' : '') + '>' +
            options.map(function (o) {
                return '<button type="button" class="st-seg__btn" role="radio" aria-checked="false" data-key="' + key + '" data-value="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>';
    }

    function toggle(key, title, desc) {
        var id = 'st-t-' + key;
        return '<div class="st-row st-row--toggle"><div class="st-row__text"><span class="st-row__title" id="' + id + '">' + title + '</span>' +
            (desc ? '<span class="st-row__desc">' + desc + '</span>' : '') + '</div>' +
            '<button type="button" class="st-switch" role="switch" aria-checked="false" aria-labelledby="' + id + '" data-toggle="' + key + '"><span class="st-switch__knob"></span></button></div>';
    }

    function group(title, inner, id) {
        return '<section class="st-group"' + (id ? ' aria-labelledby="' + id + '"' : '') + '><h3 class="st-group__title"' + (id ? ' id="' + id + '"' : '') + '>' + title + '</h3>' + inner + '</section>';
    }

    /* ── Panels ─────────────────────────────────────────────────── */

    function previewHTML() {
        function stat(label, val, hue) {
            return '<div class="st-pv-stat"><span>' + label + '</span><span class="st-pv-bar"><i style="width:' + val + '%;--c:' + hue + '"></i></span><b>' + Math.round(val * 1.6) + '</b></div>';
        }
        return '<div class="st-preview" aria-hidden="true">' +
            '<div class="st-pv-card">' +
            '<div class="st-pv-top"><span class="st-pv-name">Garchomp</span><span><span class="type-tag type-dragon">Dragon</span><span class="type-tag type-ground">Ground</span></span></div>' +
            '<div class="st-pv-stats">' + stat('HP', 68, '#ff5959') + stat('Atk', 78, '#f5ac78') + stat('Spe', 62, '#fa92b2') + '</div>' +
            '<div class="st-pv-actions"><span class="pcg-btn">Open in calc</span><span class="pcg-btn pcg-btn--ghost">Compare</span></div>' +
            '</div></div>';
    }

    function swatchSurface(id, s) {
        return '<button type="button" class="st-swatch" role="radio" aria-checked="false" data-key="surface" data-value="' + id + '" title="' + s.label + '">' +
            '<span class="st-swatch__chip" style="background:' + s.bg + ';border-color:' + s.edge + '"><i style="background:' + s.elevated + ';border-color:' + s.edge + '"></i></span>' +
            '<span class="st-swatch__label">' + s.label + '</span></button>';
    }

    function panelAppearance() {
        var presets = T.PRESETS.map(function (p) {
            var s = T.SURFACES[p.surface], a = T.ACCENTS[p.accent];
            return '<button type="button" class="st-preset" role="radio" aria-checked="false" data-preset="' + p.id + '">' +
                '<span class="st-preset__art" style="background:' + s.bg + ';border-color:' + s.edge + '">' +
                '<i class="st-preset__card" style="background:' + s.elevated + ';border-color:' + s.edge + '"></i>' +
                '<i class="st-preset__dot" style="background:' + a.hex + '"></i>' +
                '<i class="st-preset__line" style="background:' + a.hex + '"></i></span>' +
                '<span class="st-preset__name">' + p.label + '</span></button>';
        }).join('');

        var surfaces = Object.keys(T.SURFACES).map(function (id) { return swatchSurface(id, T.SURFACES[id]); }).join('') +
            '<button type="button" class="st-swatch" role="radio" aria-checked="false" data-key="surface" data-value="auto" title="Match system">' +
            '<span class="st-swatch__chip st-swatch__chip--auto"><i></i></span><span class="st-swatch__label">System</span></button>';

        var accents = Object.keys(T.ACCENTS).map(function (id) {
            var a = T.ACCENTS[id];
            return '<button type="button" class="st-dot" role="radio" aria-checked="false" data-key="accent" data-value="' + id + '" title="' + a.label + '" aria-label="' + a.label + '" style="--dot:' + a.hex + '"></button>';
        }).join('') +
            '<label class="st-dot st-dot--custom" title="Custom colour" data-custom>' +
            '<input type="color" id="st-custom-accent" aria-label="Custom accent colour"><span aria-hidden="true">+</span></label>';

        return previewHTML() +
            group('Presets', '<div class="st-presets" role="radiogroup" aria-label="Theme presets">' + presets + '</div>', 'st-g-presets') +
            group('Customise',
                row('Theme', 'Surface colours for every page.', '', 'st-l-surface') +
                '<div class="st-swatches" role="radiogroup" aria-labelledby="st-l-surface">' + surfaces + '</div>' +
                row('Accent colour', 'Buttons, links, focus and highlights. It is adjusted automatically to stay readable.', '', 'st-l-accent') +
                '<div class="st-dots" role="radiogroup" aria-labelledby="st-l-accent">' + accents + '</div>',
                'st-g-custom') +
            group('Shape and layout',
                row('Corners', '', segmented('radius', [['sharp', 'Sharp'], ['default', 'Default'], ['soft', 'Soft']], 'st-l-radius'), 'st-l-radius') +
                row('Density', 'Compact trims padding on shared page chrome.', segmented('density', [['comfortable', 'Comfortable'], ['compact', 'Compact']], 'st-l-density'), 'st-l-density') +
                toggle('ambient', 'Ambient glow', 'A soft accent-coloured light behind the page.'),
                'st-g-shape');
    }

    function panelTypography() {
        var fonts = Object.keys(T.FONTS).map(function (id) {
            var f = T.FONTS[id];
            return '<button type="button" class="st-font" role="radio" aria-checked="false" data-key="font" data-value="' + id + '">' +
                '<span class="st-font__sample" style="font-family:' + esc(f.display) + '">Aa</span>' +
                '<span class="st-font__meta"><span class="st-font__name">' + f.label + '</span><span class="st-font__note">' + f.note + '</span></span>' +
                '<span class="st-font__text" style="font-family:' + esc(f.sans) + '">Spe 102 · 0123456789</span></button>';
        }).join('');

        return group('Font pairing', '<div class="st-fonts" role="radiogroup" aria-label="Font pairing">' + fonts + '</div>', 'st-g-fonts') +
            group('Size and spacing',
                '<div class="st-row st-row--stack"><div class="st-row__text"><span class="st-row__title" id="st-l-scale">Text size</span>' +
                '<span class="st-row__desc">Scales text across every page.</span></div>' +
                '<div class="st-range"><span aria-hidden="true">A</span><input type="range" id="st-scale" min="90" max="130" step="5" aria-labelledby="st-l-scale" aria-valuetext="100 percent">' +
                '<span class="st-range__big" aria-hidden="true">A</span><output class="st-range__out" for="st-scale">100%</output></div></div>' +
                row('Line spacing', '', segmented('lineSpacing', [['normal', 'Normal'], ['relaxed', 'Relaxed']], 'st-l-line'), 'st-l-line') +
                toggle('textSpacing', 'Increase letter and word spacing', 'Follows WCAG text spacing guidance for easier tracking.'),
                'st-g-size');
    }

    function panelAccessibility() {
        return group('Vision',
            toggle('contrast', 'High contrast', 'Stronger borders and text on any theme.') +
            toggle('underline', 'Underline links', 'Always show link underlines, not just on hover.') +
            row('Focus indicator', 'How clearly the keyboard focus ring shows.', segmented('focus', [['default', 'Standard'], ['strong', 'Strong']], 'st-l-focus'), 'st-l-focus') +
            row('Easier-to-read font', 'Switch to Atkinson Hyperlegible, designed for low vision.', '<button type="button" class="pcg-btn pcg-btn--ghost st-inline-btn" data-action="hyperlegible">Use Hyperlegible</button>'),
            'st-g-vision') +
            group('Motor and keyboard',
                toggle('targets', 'Larger tap targets', 'Buttons and links get at least 44 px of height.') +
                '<div class="st-note"><strong>Keyboard.</strong> Tab moves between controls, Space or Enter activates, Esc closes dialogs. A skip link at the top of every page jumps straight to the content.</div>',
                'st-g-motor') +
            group('Motion',
                toggle('reduceMotion', 'Reduce motion', 'Turns animation off. Fine control is in the Motion tab.'),
                'st-g-reduce');
    }

    function panelMotion() {
        return group('Animation level',
            row('Level', 'Follow system respects your device\'s reduced-motion setting.', segmented('motion', [['system', 'System'], ['full', 'Full'], ['subtle', 'Subtle'], ['off', 'Off']], 'st-l-motion'), 'st-l-motion') +
            toggle('transitions', 'Animated page transitions', 'A soft cross-fade when moving between tools (Chromium browsers).'),
            'st-g-level') +
            group('Preview',
                '<div class="st-demo" aria-hidden="true"><div class="st-demo__bar"><i></i></div><span class="st-demo__num mono">100%</span>' +
                '<button type="button" class="pcg-btn pcg-btn--ghost st-inline-btn" data-action="replay" tabindex="-1">Replay</button></div>' +
                '<p class="st-note st-note--tight">A sample damage roll. Your level changes how fast and how much things move across the site.</p>',
                'st-g-demo');
    }

    function panelData() {
        return group('Backup',
            row('Export settings', 'Save a JSON file with your appearance and accessibility choices.', '<button type="button" class="pcg-btn pcg-btn--ghost st-inline-btn" data-action="export">Export</button>') +
            row('Import settings', 'Load a file you exported earlier.', '<label class="pcg-btn pcg-btn--ghost st-inline-btn st-file">Import<input type="file" accept="application/json,.json" id="st-import" hidden></label>'),
            'st-g-backup') +
            group('Reset',
                row('Restore defaults', 'Returns every setting on this page to its original value. Saved teams and builds are not touched.', '<button type="button" class="pcg-btn pcg-btn--ghost st-inline-btn st-danger" data-action="reset">Reset all</button>') +
                '<div class="st-note">Settings are saved in this browser only. They are not sent anywhere.</div>',
                'st-g-reset');
    }

    var PANELS = { appearance: panelAppearance, typography: panelTypography, accessibility: panelAccessibility, motion: panelMotion, data: panelData };

    /* ── Instance ───────────────────────────────────────────────── */

    function createInstance(variant) {
        var root = document.createElement('div');
        root.className = 'st st--' + variant;
        var uid = variant;

        var tabsHTML = TABS.map(function (t, i) {
            return '<button type="button" class="st-tab" role="tab" id="st-tab-' + uid + '-' + t.id + '" aria-controls="st-panel-' + uid + '-' + t.id + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-tab="' + t.id + '">' +
                '<span class="st-tab__label">' + t.label + '</span><span class="st-tab__blurb">' + t.blurb + '</span></button>';
        }).join('');

        var panelsHTML = TABS.map(function (t, i) {
            return '<div class="st-panel" role="tabpanel" id="st-panel-' + uid + '-' + t.id + '" aria-labelledby="st-tab-' + uid + '-' + t.id + '" tabindex="0"' + (i ? ' hidden' : '') + '>' + PANELS[t.id]() + '</div>';
        }).join('');

        root.innerHTML =
            '<div class="st-tabs" role="tablist" aria-label="Settings sections" aria-orientation="' + (variant === 'page' ? 'vertical' : 'horizontal') + '">' + tabsHTML + '<span class="st-tab-ind" aria-hidden="true"></span></div>' +
            '<div class="st-panels">' + panelsHTML + '</div>' +
            '<div class="st-live" role="status" aria-live="polite"></div>';

        var tabs = Array.prototype.slice.call(root.querySelectorAll('.st-tab'));
        var panels = Array.prototype.slice.call(root.querySelectorAll('.st-panel'));
        var live = root.querySelector('.st-live');
        var indicator = root.querySelector('.st-tab-ind');
        var scaleInput = root.querySelector('#st-scale');
        var scaleOut = root.querySelector('.st-range__out');
        var customInput = root.querySelector('#st-custom-accent');
        var resetArmed = null;

        function announce(msg) {
            live.textContent = '';
            requestAnimationFrame(function () { live.textContent = msg; });
        }

        function moveIndicator() {
            var active = root.querySelector('.st-tab[aria-selected="true"]');
            if (!active || !active.offsetWidth) return;
            var s = indicator.style;
            s.setProperty('--ind-x', active.offsetLeft + 'px');
            s.setProperty('--ind-w', active.offsetWidth + 'px');
            s.setProperty('--ind-y', active.offsetTop + 'px');
            s.setProperty('--ind-h', active.offsetHeight + 'px');
            indicator.classList.add('is-ready');
        }

        function selectTab(id, focus) {
            tabs.forEach(function (t) {
                var on = t.dataset.tab === id;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                if (on && focus) t.focus();
            });
            panels.forEach(function (p) { p.hidden = p.id !== 'st-panel-' + uid + '-' + id; });
            if (id === 'typography') Object.keys(T.FONTS).forEach(function (f) { T.preloadFont(f); });
            if (id === 'motion') setTimeout(function () { playDemo(); }, 120);
            moveIndicator();
            api.onTab && api.onTab(id);
        }

        /* Sync every control with the saved state */
        function sync() {
            var p = T.get();
            root.querySelectorAll('[data-key]').forEach(function (b) {
                b.setAttribute('aria-checked', String(p[b.dataset.key]) === b.dataset.value ? 'true' : 'false');
            });
            root.querySelectorAll('[data-toggle]').forEach(function (b) {
                var key = b.dataset.toggle;
                var on = key === 'reduceMotion' ? p.motion === 'off' : !!p[key];
                b.setAttribute('aria-checked', on ? 'true' : 'false');
            });
            var preset = T.currentPreset();
            root.querySelectorAll('[data-preset]').forEach(function (b) {
                b.setAttribute('aria-checked', b.dataset.preset === preset ? 'true' : 'false');
            });
            var custom = root.querySelector('[data-custom]');
            if (custom) {
                custom.classList.toggle('is-active', p.accent === 'custom');
                custom.style.setProperty('--dot', p.customAccent);
                customInput.value = p.customAccent;
                custom.setAttribute('role', 'radio');
                custom.setAttribute('aria-checked', p.accent === 'custom' ? 'true' : 'false');
            }
            scaleInput.value = p.textScale;
            scaleOut.textContent = p.textScale + '%';
            scaleInput.setAttribute('aria-valuetext', p.textScale + ' percent');
            scaleInput.style.setProperty('--fill', ((p.textScale - 90) / 40 * 100) + '%');
        }

        /* Sample damage roll for the Motion tab */
        function playDemo() {
            var bar = root.querySelector('.st-demo__bar i');
            var num = root.querySelector('.st-demo__num');
            if (!bar) return;
            var motion = T.resolvedMotion();
            var dur = motion === 'off' ? 0 : motion === 'subtle' ? 650 : 1300;
            bar.style.transition = 'none';
            bar.style.transform = 'scaleX(1)';
            num.textContent = '100%';
            void bar.offsetWidth;
            bar.style.transition = dur ? 'transform ' + dur + 'ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
            bar.style.transform = 'scaleX(0.23)';
            var start = performance.now();
            if (!dur) { num.textContent = '23%'; return; }
            (function tick(now) {
                var t = Math.min(1, (now - start) / dur);
                var eased = 1 - Math.pow(1 - t, 3);
                num.textContent = Math.round(100 - 77 * eased) + '%';
                if (t < 1) requestAnimationFrame(tick);
            })(start);
        }

        function describe(key, value) {
            var names = { surface: 'Theme', accent: 'Accent', radius: 'Corners', density: 'Density', font: 'Font', lineSpacing: 'Line spacing', focus: 'Focus indicator', motion: 'Animation level' };
            return (names[key] || key) + ' set to ' + value;
        }

        /* Events */
        root.addEventListener('click', function (e) {
            var tab = e.target.closest('.st-tab');
            if (tab) { selectTab(tab.dataset.tab); return; }

            var preset = e.target.closest('[data-preset]');
            if (preset) {
                var p = T.PRESETS.filter(function (x) { return x.id === preset.dataset.preset; })[0];
                T.set({ surface: p.surface, accent: p.accent });
                announce(p.label + ' preset applied');
                return;
            }

            var opt = e.target.closest('[data-key]');
            if (opt) {
                var key = opt.dataset.key, val = opt.dataset.value;
                T.set((function (o) { o[key] = val; return o; })({}));
                announce(describe(key, val));
                if (key === 'motion') setTimeout(playDemo, 60);
                return;
            }

            var sw = e.target.closest('[data-toggle]');
            if (sw) {
                var k = sw.dataset.toggle, cur = T.get();
                if (k === 'reduceMotion') {
                    var next = cur.motion === 'off' ? 'system' : 'off';
                    T.set({ motion: next });
                    announce(next === 'off' ? 'Motion reduced' : 'Motion follows system');
                } else {
                    var on = !cur[k];
                    T.set((function (o) { o[k] = on; return o; })({}));
                    announce(sw.getAttribute('aria-labelledby') ? root.querySelector('#' + sw.getAttribute('aria-labelledby')).textContent + (on ? ' on' : ' off') : k);
                }
                return;
            }

            var act = e.target.closest('[data-action]');
            if (!act) return;
            var a = act.dataset.action;
            if (a === 'replay') playDemo();
            if (a === 'hyperlegible') { T.set({ font: 'hyperlegible' }); announce('Font set to Atkinson Hyperlegible'); }
            if (a === 'export') {
                var blob = new Blob([T.exportJSON()], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url; link.download = 'champions-guide-settings.json';
                document.body.appendChild(link); link.click(); link.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 500);
                announce('Settings exported');
            }
            if (a === 'reset') {
                if (resetArmed) {
                    clearTimeout(resetArmed); resetArmed = null;
                    act.textContent = 'Reset all'; act.classList.remove('is-armed');
                    T.reset(); announce('All settings restored to defaults');
                } else {
                    act.textContent = 'Click again to confirm'; act.classList.add('is-armed');
                    resetArmed = setTimeout(function () { resetArmed = null; act.textContent = 'Reset all'; act.classList.remove('is-armed'); }, 4000);
                }
            }
        });

        root.addEventListener('keydown', function (e) {
            var tab = e.target.closest && e.target.closest('.st-tab');
            if (tab) {
                var vertical = variant === 'page' && window.matchMedia('(min-width: 900px)').matches;
                var next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                if (!vertical && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) next = 0;
                if (vertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) next = 0;
                var i = tabs.indexOf(tab);
                if (next) { e.preventDefault(); var n = tabs[(i + next + tabs.length) % tabs.length]; selectTab(n.dataset.tab, true); }
                if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0].dataset.tab, true); }
                if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1].dataset.tab, true); }
            }
            if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.matches('[role="radio"]')) {
                var siblings = Array.prototype.slice.call(e.target.parentElement.querySelectorAll('[role="radio"][data-key], [role="radio"][data-preset]'));
                var idx = siblings.indexOf(e.target);
                if (idx > -1) {
                    e.preventDefault();
                    var step = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
                    var target = siblings[(idx + step + siblings.length) % siblings.length];
                    target.focus(); target.click();
                }
            }
        });

        scaleInput.addEventListener('input', function () {
            T.set({ textScale: Number(scaleInput.value) }, { silent: false });
        });
        scaleInput.addEventListener('change', function () { announce('Text size ' + scaleInput.value + ' percent'); });

        customInput.addEventListener('input', function () {
            T.set({ accent: 'custom', customAccent: customInput.value });
        });
        customInput.addEventListener('change', function () { announce('Custom accent applied'); });

        root.querySelector('#st-import').addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                try { T.importJSON(String(reader.result)); announce('Settings imported'); }
                catch (err) { announce('That file could not be read as a settings export'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        T.onChange(sync);
        sync();
        if (window.ResizeObserver) new ResizeObserver(moveIndicator).observe(root.querySelector('.st-tabs'));
        window.addEventListener('resize', moveIndicator);

        var api = { el: root, select: selectTab, moveIndicator: moveIndicator, sync: sync, onTab: null };
        return api;
    }

    /* ── Drawer ─────────────────────────────────────────────────── */

    var drawer = null;

    function buildDrawer() {
        var overlay = document.createElement('div');
        overlay.className = 'st-overlay';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="st-backdrop" data-close></div>' +
            '<aside class="st-drawer" id="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="st-title">' +
            '  <div class="st-drawer__head">' +
            '    <div><h2 class="st-drawer__title" id="st-title">Settings</h2>' +
            '    <p class="st-drawer__sub">Saved on this device and applied across every tool.</p></div>' +
            '    <button type="button" class="icon-btn st-close" data-close aria-label="Close settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
            '  </div>' +
            '  <div class="st-drawer__body"></div>' +
            '  <div class="st-drawer__foot"><a class="st-fulllink" href="' + pageHref() + '">Open full settings page</a>' +
            '  <button type="button" class="pcg-btn st-done" data-close>Done</button></div>' +
            '</aside>';
        document.body.appendChild(overlay);
        var inst = createInstance('drawer');
        overlay.querySelector('.st-drawer__body').appendChild(inst.el);
        return { overlay: overlay, panel: overlay.querySelector('.st-drawer'), inst: inst, trigger: null, open: false };
    }

    function pageHref() {
        var subs = ['/guides/', '/pokedex/', '/abilitydex/', '/movedex/', '/itemdex/', '/teambuilder/', '/builds/', '/calc/', '/compare/', '/counter/', '/settings/'];
        var p = window.location.pathname.toLowerCase();
        return (subs.some(function (d) { return p.indexOf(d) !== -1; }) ? '../' : '') + 'settings/';
    }

    function focusables(scope) {
        return Array.prototype.slice.call(scope.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), [tabindex]:not([tabindex="-1"])'))
            .filter(function (el) { return el.offsetParent !== null && !el.closest('[hidden]'); });
    }

    function onDrawerKey(e) {
        if (!drawer || !drawer.open) return;
        if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); return; }
        if (e.key !== 'Tab') return;
        var items = focusables(drawer.panel);
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!drawer.panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }

    function openDrawer(trigger, tabId) {
        if (window.location.pathname.toLowerCase().indexOf('/settings/') !== -1) {
            // Already on the full page: just bring it into view
            var pageRoot = document.getElementById('settings-root');
            if (pageRoot) pageRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (!drawer) {
            drawer = buildDrawer();
            drawer.overlay.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDrawer(); });
            document.addEventListener('keydown', onDrawerKey, true);
        }
        if (drawer.open) return;
        drawer.open = true;
        drawer.trigger = trigger || document.activeElement;
        drawer.overlay.hidden = false;
        document.body.classList.add('st-lock');
        var quick = document.getElementById('quick-settings');
        if (quick) quick.setAttribute('aria-expanded', 'true');
        if (tabId) drawer.inst.select(tabId);
        requestAnimationFrame(function () {
            drawer.overlay.classList.add('is-open');
            drawer.inst.moveIndicator();
            var active = drawer.panel.querySelector('.st-tab[aria-selected="true"]');
            if (active) active.focus({ preventScroll: true });
        });
    }

    function closeDrawer() {
        if (!drawer || !drawer.open) return;
        drawer.open = false;
        drawer.overlay.classList.remove('is-open');
        document.body.classList.remove('st-lock');
        var quick = document.getElementById('quick-settings');
        if (quick) quick.setAttribute('aria-expanded', 'false');
        var done = function () { if (!drawer.open) drawer.overlay.hidden = true; };
        var wait = T.resolvedMotion() === 'off' ? 0 : 340;
        setTimeout(done, wait);
        if (drawer.trigger && drawer.trigger.focus) drawer.trigger.focus();
    }

    /* ── Full page ──────────────────────────────────────────────── */

    function mountPage(container) {
        var inst = createInstance('page');
        container.appendChild(inst.el);
        var fromHash = (window.location.hash || '').replace('#', '');
        if (TABS.some(function (t) { return t.id === fromHash; })) inst.select(fromHash);
        inst.onTab = function (id) {
            if (history.replaceState) history.replaceState(null, '', '#' + id);
        };
        window.addEventListener('hashchange', function () {
            var h = window.location.hash.replace('#', '');
            if (TABS.some(function (t) { return t.id === h; })) inst.select(h);
        });
        requestAnimationFrame(inst.moveIndicator);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(inst.moveIndicator);
        return inst;
    }

    window.PCGSettings = { openDrawer: openDrawer, closeDrawer: closeDrawer, mountPage: mountPage };

    var pageRoot = document.getElementById('settings-root');
    if (pageRoot && !pageRoot.hasChildNodes()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountPage(pageRoot); });
        else mountPage(pageRoot);
    }
})();
