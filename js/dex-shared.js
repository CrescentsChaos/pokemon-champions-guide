/**
 * Shared utilities for Pokedex, Movedex, Abilitydex, Itemdex
 */
const DexShared = (() => {
    const ASSET_PREFIX = (() => {
        const sub = ['/pokedex/', '/movedex/', '/abilitydex/', '/itemdex/', '/calc/', '/builds/', '/teambuilder/', '/compare/', '/counter/'];
        return sub.some(d => window.location.pathname.toLowerCase().includes(d)) ? '../' : '';
    })();

    const POKEMON_TYPES = [
        'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison',
        'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
    ];

    const MOVE_TAGS = [
        'Contact', 'Sound-Based', 'Punching', 'Biting', 'Pulse', 'Wind', 'Dance',
        'Healing', 'Mental', 'Slicing', 'Ball & Bomb', 'All Opponents', 'All Pokemon'
    ];

    const DAMAGE_CLASSES = ['Physical', 'Special', 'Status'];

    function normalizeKey(value) {
        return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function escapeHtml(value) {
        return (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeJs(value) {
        return (value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    function normalizeSpriteName(name) {
        let clean = (name || '').toLowerCase()
            .replace(/ /g, '-').replace(/\./g, '').replace(/'/g, '').replace(/:/g, '').replace(/%/g, '')
            .replace(/[^a-z0-9-]/g, '');
        if (clean === 'giratina-altered') clean = 'giratina-origin';
        if (clean === 'mimikyu-disguised') clean = 'mimikyu';
        if (clean.includes('noctowl')) clean = 'noctowl';
        return clean;
    }

    function getSpriteUrl(name, shiny = false) {
        const clean = normalizeSpriteName(name);
        const base = shiny ? 'ani-shiny' : 'ani';
        return `https://play.pokemonshowdown.com/sprites/${base}/${clean}.gif`;
    }

    function handleSpriteError(img, species, shiny = false) {
        if (!species || img.dataset.fallbackState === 'dead') return;

        const clean = normalizeSpriteName(species);
        const isMegaURL = img.src && img.src.includes('mega') && !img.src.includes('assets/');

        if (!img.dataset.fallbackState && isMegaURL) {
            img.dataset.fallbackState = 'mega-local';
            let suffix = 'mega';
            if (img.src.includes('mega-x') || img.src.includes('megax')) suffix = 'mega-x';
            else if (img.src.includes('mega-y') || img.src.includes('megay')) suffix = 'mega-y';
            else if (img.src.includes('mega-z') || img.src.includes('megaz')) suffix = 'mega-z';

            const hasSuffix = clean.endsWith(suffix) || clean.endsWith(suffix.replace('-', ''));
            const fileName = hasSuffix ? clean : `${clean.split('-mega')[0]}-${suffix}`;
            img.src = `${ASSET_PREFIX}assets/mega-sprites/${fileName}.gif`;
            if (img.classList.contains('mega-toggle')) img.dataset.mega = img.src;
            return;
        }

        if (img.dataset.fallbackState === 'mega-local') {
            img.dataset.fallbackState = 'smogon';
            const folder = shiny ? 'xy-shiny' : 'xy';
            img.src = `https://www.smogon.com/dex/media/sprites/${folder}/${clean}.gif`;
            return;
        }

        if (!img.dataset.fallbackState) {
            img.dataset.fallbackState = 'smogon';
            const folder = shiny ? 'xy-shiny' : 'xy';
            img.src = `https://www.smogon.com/dex/media/sprites/${folder}/${clean}.gif`;
            if (img.classList.contains('mega-toggle') && img.dataset.currentSrc === 'base') {
                img.dataset.base = img.src;
            }
            return;
        }

        if (img.dataset.fallbackState === 'smogon') {
            img.dataset.fallbackState = 'alt-showdown';
            let altClean = clean;
            if (altClean.includes('-paldea-')) altClean = altClean.replace('-paldea-', '-');
            else if (altClean.includes('-')) altClean = altClean.replace(/-/g, '');
            img.src = `https://play.pokemonshowdown.com/sprites/${shiny ? 'ani-shiny' : 'ani'}/${altClean}.gif`;
            return;
        }

        img.dataset.fallbackState = 'dead';
        img.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
    }

    function getItemSpriteUrl(item) {
        if (!item || item.toLowerCase() === 'none') return '';
        const clean = item.toLowerCase().replace(/[^a-z0-9-]/g, '');
        return `https://www.serebii.net/itemdex/sprites/sv/${clean}.png`;
    }

    function handleItemError(img, item) {
        if (img.dataset.fallback === 'true' || !item) {
            img.style.display = 'none';
            return;
        }
        img.dataset.fallback = 'true';
        const clean = item.toLowerCase().replace(/[^a-z0-9]/g, '');
        img.src = `https://www.serebii.net/itemdex/sprites/${clean}.png`;
        img.style.display = 'block';
    }

    function typeIconHtml(type, size = 28) {
        if (!type || type === 'None') return '';
        const t = type.toLowerCase();
        return `<img src="${ASSET_PREFIX}assets/type-icons/${t}_type.png" class="dex-type-icon" style="width:${size}px;height:${size}px;" alt="${escapeHtml(type)}" title="${escapeHtml(type)}">`;
    }

    function dmgClassBadge(damageClass) {
        const dc = (damageClass || 'Status').toLowerCase();
        const label = dc.charAt(0).toUpperCase() + dc.slice(1);
        return `<span class="dex-dmg-badge dex-dmg-${dc}">${label}</span>`;
    }

    function dmgClassIconHtml(damageClass, size = 20) {
        const dc = (damageClass || 'Status').toLowerCase();
        const fileMap = { physical: 'move-physical', special: 'move-special', status: 'move-status' };
        const file = fileMap[dc] || 'move-status';
        const label = (damageClass || 'Status');
        return `<img src="${ASSET_PREFIX}assets/${file}.png" class="dex-dmg-icon" style="width:${size}px;height:${size}px;" alt="${escapeHtml(label)}" title="${escapeHtml(label)} category">`;
    }

    function dmgClassIconOnlyHtml(damageClass, size = 24) {
        return dmgClassIconHtml(damageClass, size);
    }

    function dmgClassHtml(damageClass, iconSize = 20) {
        return `<span class="dex-dmg-wrap" title="${escapeHtml(damageClass || 'Status')} category">${dmgClassIconHtml(damageClass, iconSize)}<span class="dex-dmg-badge dex-dmg-${(damageClass || 'Status').toLowerCase()}">${escapeHtml(damageClass || 'Status')}</span></span>`;
    }

    function moveTagsHtml(tags) {
        if (!tags || !tags.length) return '';
        return `<div class="dex-tag-row">${tags.map(t =>
            `<span class="dex-tag-chip">${escapeHtml(t)}</span>`
        ).join('')}</div>`;
    }

    function spriteImgHtml(name, className = 'dex-sprite', shiny = false) {
        const safe = escapeHtml(name);
        const js = escapeJs(name);
        return `<img src="${getSpriteUrl(name, shiny)}" alt="${safe}" class="${className}" loading="lazy" onerror="DexShared.handleSpriteError(this,'${js}',${shiny})">`;
    }

    function spriteCellHtml(name, title) {
        const safe = escapeHtml(title || name);
        return `<div class="dex-sprite-cell" title="${safe}">${spriteImgHtml(name, 'dex-sprite-mini')}</div>`;
    }

    function statBarHtml(label, value, statClass, max = 255) {
        const pct = Math.min(100, (Number(value) / max) * 100);
        return `
            <div class="dex-stat-row">
                <span class="dex-stat-label">${label}</span>
                <div class="dex-stat-bar"><div class="dex-stat-fill stat-${statClass}" style="width:${pct}%"></div></div>
                <span class="dex-stat-val">${value}</span>
            </div>`;
    }

    function compareValues(a, b, dir) {
        const d = dir === 'asc' ? 1 : -1;
        if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * d;
        return ((a ?? 0) - (b ?? 0)) * d;
    }

    function sortList(list, getter, dir = 'asc') {
        return [...list].sort((a, b) => compareValues(getter(a), getter(b), dir));
    }

    function groupList(list, groupFn) {
        const groups = new Map();
        list.forEach(item => {
            const key = groupFn(item) || 'Other';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        });
        return groups;
    }

    function renderNav(active) {
        const pages = [
            { id: 'pokemon', label: 'Pokédex', href: `${ASSET_PREFIX}pokedex/` },
            { id: 'move', label: 'Move Dex', href: `${ASSET_PREFIX}movedex/` },
            { id: 'ability', label: 'Ability Dex', href: `${ASSET_PREFIX}abilitydex/` },
            { id: 'item', label: 'Item Dex', href: `${ASSET_PREFIX}itemdex/` }
        ];
        return `<nav class="dex-nav" aria-label="Dex navigation">${pages.map(p =>
            `<a href="${p.href}" class="dex-nav-link${p.id === active ? ' active' : ''}">${p.label}</a>`
        ).join('')}</nav>`;
    }

    function bindModal(overlayId, closeBtnId) {
        const overlay = document.getElementById(overlayId);
        const closeBtn = document.getElementById(closeBtnId);
        if (!closeBtn || !overlay) return;

        const close = () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        closeBtn.onclick = close;
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) close();
        });
        return { open: () => { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }, close };
    }

    function openModal(overlayId) {
        const el = document.getElementById(overlayId);
        if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
    }

    function closeModal(overlayId) {
        const el = document.getElementById(overlayId);
        if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
    }

    function updateResultCount(el, shown, total, label = 'results') {
        if (!el) return;
        el.textContent = shown === total
            ? `Showing ${total.toLocaleString()} ${label}`
            : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} ${label}`;
    }

    function setupInfiniteScroll(sentinel, loadMore) {
        if (!sentinel) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) loadMore();
        }, { rootMargin: '300px' });
        observer.observe(sentinel);
    }

    window.DexShared = {
        ASSET_PREFIX, POKEMON_TYPES, MOVE_TAGS, DAMAGE_CLASSES,
        normalizeKey, escapeHtml, escapeJs,
        normalizeSpriteName, getSpriteUrl, handleSpriteError,
        getItemSpriteUrl, handleItemError,
        typeIconHtml, dmgClassBadge, dmgClassIconHtml, dmgClassIconOnlyHtml, dmgClassHtml, moveTagsHtml,
        spriteImgHtml, spriteCellHtml, statBarHtml,
        compareValues, sortList, groupList,
        renderNav, bindModal, openModal, closeModal,
        updateResultCount, setupInfiniteScroll
    };
    return window.DexShared;
})();
