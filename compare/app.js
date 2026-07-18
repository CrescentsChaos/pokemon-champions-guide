let pokemonData = [];  // array of pokemon objects
let movesData = {};
let itemsData = [];
let buildsData = [];

let isChampionsMode = true;
if (typeof setChampionsEvMode === 'function') setChampionsEvMode(true);
else if (typeof globalThis !== 'undefined') globalThis.isChampionsMode = true;

function syncChampionsModeButton() {
    const btn = document.getElementById('champions-ev-toggle');
    if (!btn) return;
    btn.textContent = `Champions EV: ${isChampionsMode ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', isChampionsMode);
}

function toggleChampionsMode() {
    isChampionsMode = !isChampionsMode;
    if (typeof setChampionsEvMode === 'function') setChampionsEvMode(isChampionsMode);
    else globalThis.isChampionsMode = isChampionsMode;
    [p1, p2].forEach(pk => {
        if (!pk) return;
        pk.evs = typeof coerceEvsForMode === 'function'
            ? coerceEvsForMode(pk.evs, isChampionsMode)
            : (isChampionsMode ? convertEvsToChampions(pk.evs) : convertEvsFromChampions(pk.evs));
    });
    syncChampionsModeButton();
    recalcStats(1);
    recalcStats(2);
    scheduleMetaDiff();
}

let p1 = {
    species: '',
    level: 50,
    nature: 'Serious',
    ability: '',
    item: '',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    base: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    type1: '',
    type2: '',
    moves: []
};

let p2 = JSON.parse(JSON.stringify(p1)); // deep clone copy

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_NAMES = {
    hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed'
};

const NATURES = {
    Hardy:   { plus: 'None', minus: 'None' },
    Lonely:  { plus: 'atk', minus: 'def' },
    Brave:   { plus: 'atk', minus: 'spe' },
    Adamant: { plus: 'atk', minus: 'spa' },
    Naughty: { plus: 'atk', minus: 'spd' },
    Bold:    { plus: 'def', minus: 'atk' },
    Docile:  { plus: 'None', minus: 'None' },
    Relaxed: { plus: 'def', minus: 'spe' },
    Impish:  { plus: 'def', minus: 'spa' },
    Lax:     { plus: 'def', minus: 'spd' },
    Timid:   { plus: 'spe', minus: 'atk' },
    Hasty:   { plus: 'spe', minus: 'def' },
    Serious: { plus: 'None', minus: 'None' },
    Jolly:   { plus: 'spe', minus: 'spa' },
    Naive:   { plus: 'spe', minus: 'spd' },
    Modest:  { plus: 'spa', minus: 'atk' },
    Mild:    { plus: 'spa', minus: 'def' },
    Quiet:   { plus: 'spa', minus: 'spe' },
    Bashful: { plus: 'None', minus: 'None' },
    Rash:    { plus: 'spa', minus: 'spd' },
    Calm:    { plus: 'spd', minus: 'atk' },
    Gentle:  { plus: 'spd', minus: 'def' },
    Sassy:   { plus: 'spd', minus: 'spe' },
    Careful: { plus: 'spd', minus: 'spa' },
    Quirky:  { plus: 'None', minus: 'None' }
};

function normalizeKey(value) {
    return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapEvStatKey(raw) {
    const s = (raw || '').toLowerCase().replace(/[^a-z.]/g, '');
    if (s === 'hp') return 'hp';
    if (s === 'atk' || s === 'attack') return 'atk';
    if (s === 'def' || s === 'defense') return 'def';
    if (s === 'spa' || s === 'spatk' || s === 'sp.atk') return 'spa';
    if (s === 'spd' || s === 'spdef' || s === 'sp.def') return 'spd';
    if (s === 'spe' || s === 'speed') return 'spe';
    return null;
}

function parseSpeciesFromHeader(header) {
    let speciesPart = (header || '').split('@')[0].trim();
    const paren = speciesPart.match(/\(([^)]+)\)/);
    if (paren) {
        const inside = paren[1].trim();
        if (/^[MF]$/i.test(inside)) {
            speciesPart = speciesPart.replace(/\s*\([^)]+\)\s*/, ' ').trim();
        } else {
            speciesPart = inside;
        }
    }
    return speciesPart.trim();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [pkmnRes, movesRes, itemsRes] = await Promise.all([
            fetch('../assets/pokemon.json'),
            fetch('../assets/moves.json'),
            fetch('../assets/items.json')
        ]);
        pokemonData = await pkmnRes.json();
        movesData = await movesRes.json();
        itemsData = await itemsRes.json();

        if (typeof initMoveIndex === 'function') initMoveIndex(movesData);
        syncAnalysisGlobals();

        initMetaSelects();
        populateItemsList();
        setupSearchListeners();
        setupInputListeners();
        setupImportTabs();
        setupLibraryFilters();
        setupImportConfirm();
        setupMetaDiffUI();

        renderStatsEditor(1);
        renderStatsEditor(2);
        renderMoves(1);
        renderMoves(2);
        updateSprite(1, '');
        updateSprite(2, '');
        syncChampionsModeButton();
        updateComparison();

        // Load curated builds.json separately so search still works if it fails
        try {
            const buildsRes = await fetch('../assets/builds.json');
            buildsData = await buildsRes.json();
            syncAnalysisGlobals();
            const libHint = document.getElementById('library-hint');
            if (libHint) libHint.textContent = `${buildsData.length.toLocaleString()} curated builds from builds.json`;
        } catch (buildErr) {
            console.warn('builds.json failed to load', buildErr);
            buildsData = [];
        }

        try {
            const topRes = await fetch('../assets/top_pokemons.json?v=' + Date.now());
            const topCache = await topRes.json();
            if (typeof globalThis !== 'undefined') globalThis._topPokemonsCache = topCache;
        } catch (topErr) {
            console.warn('top_pokemons.json failed to load', topErr);
        }

        const params = new URLSearchParams(window.location.search);
        const buildA = params.get('buildA') || params.get('a');
        const buildB = params.get('buildB') || params.get('b');
        if (buildA) loadLibraryBuild(1, buildA, false);
        if (buildB) loadLibraryBuild(2, buildB, false);

        scheduleMetaDiff();

    } catch (e) {
        showToast('Error loading data');
        console.error(e);
    }
});

function populateItemsList() {
    const dl = document.getElementById('items-list');
    if (!dl) return;
    dl.innerHTML = itemsData.map(i => `<option value="${i.name || i}"></option>`).join('');
}

function initMetaSelects() {
    const natures = Object.keys(NATURES);
    ['p1', 'p2'].forEach(id => {
        const natSelect = document.getElementById(`${id}-nature`);
        if (natSelect) {
            natures.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                if (n === 'Serious') opt.selected = true;
                natSelect.appendChild(opt);
            });
        }
    });
}

function setupSearchListeners() {
    [1, 2].forEach(num => {
        const input = document.getElementById(`p${num}-search`);
        const results = document.getElementById(`p${num}-search-results`);
        if (!input || !results) return;

        let activeIndex = -1;

        const hideResults = () => {
            results.innerHTML = '';
            results.classList.remove('active');
            activeIndex = -1;
        };

        const renderResults = (filtered) => {
            if (!filtered.length) {
                hideResults();
                return;
            }
            results.innerHTML = filtered.map((x, i) => `
                <div class="search-item${i === 0 ? ' is-active' : ''}" data-name="${x.Name}" data-index="${i}" role="option">
                    <span class="search-item-name">${x.Name}</span>
                    <span class="search-item-types">${x.Type_1}${x.Type_2 && x.Type_2 !== 'None' ? ' / ' + x.Type_2 : ''}</span>
                </div>
            `).join('');
            results.classList.add('active');
            activeIndex = 0;
        };

        const pick = (name) => {
            if (!name) return;
            input.value = name;
            hideResults();
            selectPokemon(num, name);
        };

        input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            if (q.length < 1) {
                hideResults();
                return;
            }
            if (!pokemonData.length) {
                results.innerHTML = '<div class="search-item"><span class="search-item-name">Pokémon data still loading…</span></div>';
                results.classList.add('active');
                return;
            }

            const filtered = pokemonData
                .filter(x => x.inChampions === true && (x.Name || '').toLowerCase().includes(q))
                .sort((a, b) => {
                    const an = a.Name.toLowerCase();
                    const bn = b.Name.toLowerCase();
                    const aStarts = an.startsWith(q) ? 0 : 1;
                    const bStarts = bn.startsWith(q) ? 0 : 1;
                    if (aStarts !== bStarts) return aStarts - bStarts;
                    return an.localeCompare(bn);
                })
                .slice(0, 14);

            renderResults(filtered);
        });

        input.addEventListener('keydown', (e) => {
            const items = [...results.querySelectorAll('.search-item')];
            if (!results.classList.contains('active') || !items.length) {
                if (e.key === 'Enter' && input.value.trim()) {
                    const exact = findPokemonByName(input.value.trim());
                    if (exact) pick(exact.Name);
                }
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(items.length - 1, activeIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(0, activeIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const target = items[activeIndex] || items[0];
                if (target) pick(target.getAttribute('data-name'));
                return;
            } else if (e.key === 'Escape') {
                hideResults();
                return;
            } else {
                return;
            }
            items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
            items[activeIndex]?.scrollIntoView({ block: 'nearest' });
        });

        results.addEventListener('mousedown', (e) => {
            // mousedown fires before blur/click-away and reliably selects
            const item = e.target.closest('.search-item');
            if (item) {
                e.preventDefault();
                pick(item.getAttribute('data-name'));
            }
        });

        input.addEventListener('blur', () => {
            // Delay so mousedown on item can run first
            setTimeout(() => {
                if (!results.contains(document.activeElement)) hideResults();
            }, 150);
        });
    });
}

function findPokemonByName(name) {
    const key = normalizeKey(name);
    return pokemonData.find(p => normalizeKey(p.Name) === key);
}

function selectPokemon(num, species) {
    const pd = findPokemonByName(species);
    if (!pd) return;

    const p = num === 1 ? p1 : p2;
    const keepSpread = p.species === pd.Name;

    p.species = pd.Name;
    p.base = {
        hp:  pd.HP   || 0,
        atk: pd.Attack  || 0,
        def: pd.Defense || 0,
        spa: pd['Sp.Atk'] || 0,
        spd: pd['Sp.Def'] || 0,
        spe: pd.Speed   || 0
    };
    p.type1 = pd.Type_1;
    p.type2 = (pd.Type_2 && pd.Type_2 !== 'None') ? pd.Type_2 : '';

    document.getElementById(`p${num}-search`).value = p.species;
    document.getElementById(`p${num}-type1`).value = p.type1;
    document.getElementById(`p${num}-type2`).value = p.type2 || '-';

    const abList = document.getElementById(`p${num}-abilities-list`);
    abList.innerHTML = '';
    const abilities = getPokemonAbilities(pd);
    abilities.forEach(ab => {
        const opt = document.createElement('option');
        opt.value = ab;
        abList.appendChild(opt);
    });

    if (!keepSpread) {
        p.ability = abilities[0] || '';
        p.item = '';
        p.moves = [];
        p.nature = 'Serious';
        p.level = 50;
        p.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        p.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        document.getElementById(`p${num}-level`).value = p.level;
        document.getElementById(`p${num}-nature`).value = p.nature;
        document.getElementById(`p${num}-item`).value = '';
    } else if (!p.ability && abilities.length > 0) {
        p.ability = abilities[0];
    }

    document.getElementById(`p${num}-ability`).value = p.ability;

    updateSprite(num, p.species);
    recalcStats(num);
    renderMoves(num);
}

// Builder-matching sprite fallback chain
window.handleSpriteError = function(img, species, shiny, item) {
    if (!species || img.dataset.fallbackState === 'dead') return;

    item = item || '';
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    const isMegaURL = img.src && (img.src.includes('mega') || img.src.includes('primal')) && !img.src.includes('assets/');

    if (!img.dataset.fallbackState && isMegaURL) {
        img.dataset.fallbackState = 'mega-local';
        if (typeof MegaSprites !== 'undefined' && MegaSprites.applyLocalMegaFallback(img, species)) {
            return;
        }
        let suffix = 'mega';
        if (img.src.includes('mega-x') || img.src.includes('megax')) suffix = 'mega-x';
        else if (img.src.includes('mega-y') || img.src.includes('megay')) suffix = 'mega-y';
        else if (img.src.includes('mega-z') || img.src.includes('megaz')) suffix = 'mega-z';
        else if (img.src.includes('primal')) suffix = 'primal';
        const hasSuffix = clean.endsWith(suffix) || clean.endsWith(suffix.replace('-', ''));
        const fileName = hasSuffix ? clean : `${clean}-${suffix}`;
        img.src = `../assets/mega-sprites/${fileName}.gif`;
        return;
    }

    if (!img.dataset.fallbackState) {
        const it = (item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if ((it.endsWith('ite') || it.endsWith('itex') || it.endsWith('itey') || it.endsWith('itez')) && it !== 'eviolite' && it !== 'meteorite') {
            img.dataset.fallbackState = 'mega-local';
            if (typeof MegaSprites !== 'undefined' && MegaSprites.applyLocalMegaFallback(img, species, MegaSprites.megaFormSuffixFromItem(item))) {
                return;
            }
            let suffix = 'mega';
            if (it.endsWith('itex')) suffix = 'mega-x';
            else if (it.endsWith('itey')) suffix = 'mega-y';
            else if (it.endsWith('itez')) suffix = 'mega-z';
            img.src = `../assets/mega-sprites/${clean}-${suffix}.gif`;
            return;
        }
        img.dataset.fallbackState = 'smogon';
        const folder = shiny ? 'xy-shiny' : 'xy';
        img.src = `https://www.smogon.com/dex/media/sprites/${folder}/${clean}.gif`;
        return;
    }

    img.dataset.fallbackState = 'dead';
    img.dataset.fallback = 'true';
    img.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
};


function setupInputListeners() {
    [1, 2].forEach(num => {
        ['level'].forEach(field => {
            const el = document.getElementById(`p${num}-${field}`);
            if(el) {
                el.addEventListener('change', (e) => {
                    (num === 1 ? p1 : p2)[field] = parseInt(e.target.value) || 50;
                    recalcStats(num);
                });
            }
        });

        // Meta selects/inputs
        ['nature', 'ability', 'item'].forEach(field => {
            const el = document.getElementById(`p${num}-${field}`);
            if (el) {
                el.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const p = num === 1 ? p1 : p2;
                    p[field] = val;
                    if (field === 'nature') recalcStats(num);
                    else scheduleMetaDiff();

                    if (field === 'item' && p.species) {
                        const nextForm = getPermanentForm({ species: p.species, item: val });
                        if (nextForm) updatePokemonForm(num, nextForm);
                        else {
                            // Check if item is a mega stone to update suffix only
                            let suffix = '';
                            const it = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (it.endsWith('ite') && it !== 'eviolite' && it !== 'meteorite') {
                                suffix = '-mega';
                                if (it.endsWith('itex')) suffix = '-megax';
                                else if (it.endsWith('itey')) suffix = '-megay';
                            }
                            updateSprite(num, p.species, suffix);
                            scheduleMetaDiff();
                        }
                    }
                });
            }
        });
    });
}

function updatePokemonForm(num, species) {
    const p = num === 1 ? p1 : p2;
    const pd = pokemonData.find(x => x.Name === species);
    if (!pd) return;

    p.species = pd.Name;
    p.base = {
        hp: pd.HP || 0,
        atk: pd.Attack || 0,
        def: pd.Defense || 0,
        spa: pd['Sp.Atk'] || 0,
        spd: pd['Sp.Def'] || 0,
        spe: pd.Speed || 0
    };
    p.type1 = pd.Type_1;
    p.type2 = pd.Type_2 || '';
    p.ability = (getPokemonAbilities(pd)[0]) || '';

    // Update UI
    const searchInput = document.getElementById(`p${num}-search`);
    if (searchInput) searchInput.value = p.species;
    document.getElementById(`p${num}-type1`).value = p.type1;
    document.getElementById(`p${num}-type2`).value = p.type2 || '-';
    const abEl = document.getElementById(`p${num}-ability`);
    if (abEl) abEl.value = p.ability;

    updateSprite(num, p.species);
    recalcStats(num);
}

function updateSprite(num, species, suffix = '') {
    const img = document.getElementById(`p${num}-sprite`);
    if (!img) return;
    delete img.dataset.fallbackState;
    delete img.dataset.fallback;
    if (!species) {
        img.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
        return;
    }

    // Prefer local mega GIFs when available (Champions megas missing/broken on Showdown)
    if (typeof MegaSprites !== 'undefined') {
        let formSuffix = null;
        if (suffix === '-megax' || suffix === '-mega-x') formSuffix = 'mega-x';
        else if (suffix === '-megay' || suffix === '-mega-y') formSuffix = 'mega-y';
        else if (suffix === '-megaz' || suffix === '-mega-z') formSuffix = 'mega-z';
        else if (suffix === '-mega' || suffix === '-primal') formSuffix = suffix.slice(1);
        else formSuffix = MegaSprites.megaFormSuffixFromSpecies(species + (suffix || ''));

        if (formSuffix) {
            const local = MegaSprites.getLocalMegaSpriteUrl(species, formSuffix);
            if (local) {
                img.src = local;
                return;
            }
        }
    }

    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    img.src = `https://play.pokemonshowdown.com/sprites/ani/${clean}${suffix}.gif`;
}

function renderMoves(num) {
    const el = document.getElementById(`p${num}-moves`);
    if (!el) return;
    const p = num === 1 ? p1 : p2;
    const moves = (p.moves || []).filter(Boolean);
    if (!moves.length) {
        el.innerHTML = '<span class="compare-move-empty">Import a build to see moves</span>';
        return;
    }
    el.innerHTML = moves.map(m => `<span class="compare-move-chip">${m}</span>`).join('');
}

function toggleMega(num) {
    const p = num === 1 ? p1 : p2;
    if (!p.species) return;

    const currentName = p.species;
    const btn = document.getElementById(`p${num}-mega-toggle`);
    
    let targetName = "";
    if (currentName.includes("-Mega")) {
        targetName = currentName.split("-Mega")[0];
        btn.classList.remove('active');
    } else {
        const mega = pokemonData.find(pd => pd.Name === currentName + "-Mega" || pd.Name === currentName + "-Mega-X" || pd.Name === currentName + "-Mega-Y");
        if (mega) {
            targetName = mega.Name;
            btn.classList.add('active');
        } else {
            showToast("No Mega form found for " + currentName);
            return;
        }
    }
    
    if (targetName) updatePokemonForm(num, targetName);
}

function renderStatsEditor(num) {
    const tbody = document.getElementById(`p${num}-stats-editor`);
    if (!tbody) return;
    tbody.innerHTML = '';
    const p = num === 1 ? p1 : p2;
    const evMax = isChampionsMode ? 32 : 252;
    const evStep = isChampionsMode ? 1 : 4;

    STATS.forEach(stat => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td style="font-weight: bold; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">${STAT_NAMES[stat]}</td>
            <td style="text-align: center;">${p.base[stat] || 0}</td>
            <td style="text-align: center;">
                <input type="number" class="type-input" style="width: 60px; text-align: center; padding: 4px;" id="p${num}-ev-${stat}" value="${p.evs[stat]}" min="0" max="${evMax}" step="${evStep}">
            </td>
            <td style="text-align: center;">
                <input type="number" class="type-input" style="width: 50px; text-align: center; padding: 4px;" id="p${num}-iv-${stat}" value="${p.ivs[stat]}" min="0" max="31">
            </td>
            <td style="text-align: center; font-weight: 800; color: #fff;">${p.stats[stat] || 0}</td>
        `;
        tbody.appendChild(row);

        // Add Listeners
        document.getElementById(`p${num}-ev-${stat}`).addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val > evMax) val = evMax;
            if (val < 0) val = 0;
            p.evs[stat] = val;
            p.evs = clampEvsForMode(p.evs, isChampionsMode);
            e.target.value = p.evs[stat];
            recalcStats(num);
        });
        document.getElementById(`p${num}-iv-${stat}`).addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val > 31) val = 31;
            if (val < 0) val = 0;
            p.ivs[stat] = val;
            e.target.value = val;
            recalcStats(num);
        });
    });
}

function recalcStats(num) {
    const p = num === 1 ? p1 : p2;
    if (!p.species) {
        renderStatsEditor(num);
        updateComparison();
        return;
    }

    const level = p.level || 50;

    STATS.forEach(stat => {
        p.stats[stat] = calculateStat(
            p.base[stat],
            p.ivs[stat],
            p.evs[stat],
            level,
            p.nature,
            stat,
            isChampionsMode
        );
    });

    renderStatsEditor(num);
    updateComparison();
    scheduleMetaDiff();
}

function updateComparison() {
    const tbody = document.getElementById('compare-stats-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const hasP1 = !!p1.species;
    const hasP2 = !!p2.species;

    STATS.forEach(stat => {
        const c1 = p1.stats[stat] || 0;
        const c2 = p2.stats[stat] || 0;

        let cls1 = 'stat-tie', cls2 = 'stat-tie';
        if (hasP1 && hasP2) {
            if (c1 > c2) { cls1 = 'stat-win'; cls2 = 'stat-lose'; }
            else if (c2 > c1) { cls2 = 'stat-win'; cls1 = 'stat-lose'; }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="${cls1}">${hasP1 ? c1 : '--'}</td>
            <td class="stat-name">${STAT_NAMES[stat]}</td>
            <td class="${cls2}">${hasP2 ? c2 : '--'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Also add Base Stat Total row
    let bst1 = STATS.reduce((s, a) => s + p1.base[a], 0);
    let bst2 = STATS.reduce((s, a) => s + p2.base[a], 0);

    let bst1Cls = 'stat-tie', bst2Cls = 'stat-tie';
    if (hasP1 && hasP2) {
         if (bst1 > bst2) { bst1Cls = 'stat-win'; bst2Cls = 'stat-lose'; }
         if (bst2 > bst1) { bst2Cls = 'stat-win'; bst1Cls = 'stat-lose'; }
    }

    const trBST = document.createElement('tr');
    trBST.innerHTML = `
        <td class="${bst1Cls}" style="opacity: 0.7; font-size: 0.9rem;">${hasP1 ? bst1 : '--'}</td>
        <td class="stat-name" style="color: white;">BST</td>
        <td class="${bst2Cls}" style="opacity: 0.7; font-size: 0.9rem;">${hasP2 ? bst2 : '--'}</td>
    `;
    tbody.appendChild(trBST);
}

// ------ META MATCHUP DIFFERENCES (survive / outspeed / KO) ------
let metaDiffTab = 'survive';
let metaDiffFormat = 'Singles';
let metaDiffTimer = null;
let metaDiffRequestId = 0;
let metaDiffCache = null;

function syncAnalysisGlobals() {
    if (typeof globalThis === 'undefined') return;
    globalThis.allPokemon = pokemonData;
    globalThis.allMoves = movesData;
    globalThis.allBuilds = buildsData;
}

function setupMetaDiffUI() {
    document.querySelectorAll('.meta-diff-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            metaDiffTab = tab.dataset.metaTab || 'survive';
            document.querySelectorAll('.meta-diff-tab').forEach(btn => {
                const on = btn.dataset.metaTab === metaDiffTab;
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            renderMetaDiffFromCache();
        });
    });

    const formatEl = document.getElementById('meta-diff-format');
    if (formatEl) {
        formatEl.addEventListener('change', () => {
            metaDiffFormat = formatEl.value === 'Doubles' ? 'Doubles' : 'Singles';
            scheduleMetaDiff(true);
        });
    }

    document.getElementById('meta-diff-refresh')?.addEventListener('click', () => scheduleMetaDiff(true));
}

function scheduleMetaDiff(immediate) {
    clearTimeout(metaDiffTimer);
    if (immediate) {
        runMetaDiff();
        return;
    }
    metaDiffTimer = setTimeout(() => runMetaDiff(), 280);
}

function compareBuildToSlot(p) {
    if (!p?.species) return null;
    return {
        species: p.species,
        item: p.item || '',
        ability: p.ability || '',
        level: p.level || 50,
        nature: p.nature || 'Serious',
        tera: 'Normal',
        evs: { ...p.evs },
        ivs: { ...p.ivs },
        moves: [...(p.moves || [])].filter(Boolean)
    };
}

function resolveCompareDb(slot) {
    if (!slot?.species) return null;
    const key = normalizeKey(slot.species);
    let db = pokemonData.find(p => normalizeKey(p.Name) === key) || null;
    if (!db) return null;

    if (slot.item && typeof getPermanentForm === 'function') {
        const perm = getPermanentForm({ species: slot.species, item: slot.item });
        if (perm) {
            const permDb = pokemonData.find(p => normalizeKey(p.Name) === normalizeKey(perm));
            if (permDb) return permDb;
        }
    }

    const it = (slot.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((it.endsWith('ite') || it.endsWith('itex') || it.endsWith('itey') || it.endsWith('itez'))
        && it !== 'eviolite' && it !== 'meteorite') {
        let suffix = '-Mega';
        if (it.endsWith('itex')) suffix = '-Mega-X';
        else if (it.endsWith('itey')) suffix = '-Mega-Y';
        else if (it.endsWith('itez')) suffix = '-Mega-Z';
        const base = String(slot.species).replace(/-Mega(-[XYZ])?$/i, '').replace(/-Primal$/i, '');
        const megaDb = pokemonData.find(p => normalizeKey(p.Name) === normalizeKey(base + suffix));
        if (megaDb) return megaDb;
    }
    return db;
}

function getCompareSpeedTier(speedA, speedB) {
    if (typeof compareSpeedTiers === 'function') return compareSpeedTiers(speedA, speedB);
    if (typeof BattleCalc !== 'undefined' && typeof BattleCalc.compareSpeedTiers === 'function') {
        return BattleCalc.compareSpeedTiers(speedA, speedB);
    }
    if (speedA > speedB) return 'faster';
    if (speedA < speedB) return 'slower';
    return 'tie';
}

function getBuildEffectiveSpeed(state, field) {
    if (!state) return null;
    if (typeof getEffectiveSpeed === 'function') return getEffectiveSpeed(state, field);
    if (typeof BattleCalc !== 'undefined' && typeof BattleCalc.getEffectiveSpeed === 'function') {
        return BattleCalc.getEffectiveSpeed(state, field);
    }
    return state.stats?.spe ?? null;
}

function survivesMetaHit(defense) {
    if (!defense) return true;
    return parseFloat(defense.maxPercent) < 100;
}

function fmtDamage(result) {
    if (!result) return { pct: '—', label: 'No damage', survive: true };
    const max = parseFloat(result.maxPercent);
    const min = parseFloat(result.minPercent);
    const pct = Number.isFinite(min) && Number.isFinite(max) && min !== max
        ? `${min}–${max}%`
        : `${Number.isFinite(max) ? max : '—'}%`;
    const survive = max < 100;
    let label = result.koLabel || (survive ? 'Survives' : 'OHKO');
    if (survive && max < 50) label = 'Tanks';
    else if (survive) label = 'Survives';
    return { pct, label, survive, move: result.move || '' };
}

function metaSpriteUrl(species) {
    const clean = (species || '').toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    return `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
}

async function runMetaDiff() {
    const requestId = ++metaDiffRequestId;
    const statusEl = document.getElementById('meta-diff-status');
    const hasA = !!p1.species;
    const hasB = !!p2.species;

    if (!hasA && !hasB) {
        metaDiffCache = null;
        setMetaSummary(null);
        setMetaStatus('Load both builds to compare meta matchups.');
        renderMetaLists([], [], metaDiffTab);
        return;
    }

    if (typeof buildCalcStateFromSlot !== 'function' || typeof findBestDamage !== 'function') {
        setMetaStatus('Damage calculator failed to load.');
        return;
    }

    setMetaStatus('Calculating meta matchups…');
    syncAnalysisGlobals();

    try {
    const format = metaDiffFormat;
    let topList = [];
    if (typeof loadTopPokemonsForFormat === 'function') {
        topList = await loadTopPokemonsForFormat(format);
    } else {
        const cache = (typeof getTopPokemonsList === 'function') ? getTopPokemonsList(format) : [];
        topList = cache.slice(0, 28);
    }
    if (requestId !== metaDiffRequestId) return;

    if (!topList.length) {
        metaDiffCache = null;
        setMetaSummary(null);
        setMetaStatus('No meta ranking data available for this format.');
        renderMetaLists([], [], metaDiffTab);
        return;
    }

    const field = getDefaultField(format);
    const slotA = compareBuildToSlot(p1);
    const slotB = compareBuildToSlot(p2);
    const dbA = slotA ? resolveCompareDb(slotA) : null;
    const dbB = slotB ? resolveCompareDb(slotB) : null;

    const stateAAtk = (slotA && dbA) ? buildCalcStateFromSlot(slotA, 1, dbA, movesData) : null;
    const stateADef = (slotA && dbA) ? buildCalcStateFromSlot(slotA, 2, dbA, movesData) : null;
    const stateBAtk = (slotB && dbB) ? buildCalcStateFromSlot(slotB, 1, dbB, movesData) : null;
    const stateBDef = (slotB && dbB) ? buildCalcStateFromSlot(slotB, 2, dbB, movesData) : null;

    const speedA = getBuildEffectiveSpeed(stateAAtk, field);
    const speedB = getBuildEffectiveSpeed(stateBAtk, field);

    const surviveA = [];
    const surviveB = [];
    const outspeedA = [];
    const outspeedB = [];
    const koA = [];
    const koB = [];
    let checked = 0;

    for (let rank = 0; rank < topList.length; rank++) {
        const threatName = topList[rank];
        const threatKey = normalizeKey(threatName);

        // Skip self-mirrors when comparing the same species as the threat
        const aIsThreat = hasA && normalizeKey(p1.species) === threatKey;
        const bIsThreat = hasB && normalizeKey(p2.species) === threatKey;

        const metaBuild = typeof findMetaBuildForSpecies === 'function'
            ? findMetaBuildForSpecies(threatName, format, buildsData)
            : null;
        if (!metaBuild?.build) continue;

        const threatParsed = typeof parseAnalysisBuild === 'function'
            ? parseAnalysisBuild(metaBuild.build)
            : null;
        if (!threatParsed?.species) continue;

        const threatDb = resolveCompareDb(threatParsed)
            || pokemonData.find(p => normalizeKey(p.Name) === normalizeKey(threatParsed.species));
        if (!threatDb) continue;

        const threatAtk = buildCalcStateFromSlot(threatParsed, 1, threatDb, movesData);
        const threatDef = buildCalcStateFromSlot(threatParsed, 2, threatDb, movesData);
        const threatSpeed = getBuildEffectiveSpeed(threatAtk, field) || 0;
        checked++;

        const defA = (!aIsThreat && stateADef) ? findBestDamage(threatAtk, stateADef, field) : null;
        const defB = (!bIsThreat && stateBDef) ? findBestDamage(threatAtk, stateBDef, field) : null;
        const offA = (!aIsThreat && stateAAtk) ? findBestDamage(stateAAtk, threatDef, field) : null;
        const offB = (!bIsThreat && stateBAtk) ? findBestDamage(stateBAtk, threatDef, field) : null;

        const aSurv = !aIsThreat && hasA && survivesMetaHit(defA);
        const bSurv = !bIsThreat && hasB && survivesMetaHit(defB);
        const aFmt = fmtDamage(defA);
        const bFmt = fmtDamage(defB);

        const aFaster = hasA && !aIsThreat && speedA != null
            && getCompareSpeedTier(speedA, threatSpeed) === 'faster';
        const bFaster = hasB && !bIsThreat && speedB != null
            && getCompareSpeedTier(speedB, threatSpeed) === 'faster';

        const aKo = hasA && !aIsThreat && typeof isStrongAnswer === 'function' && isStrongAnswer(offA?.koLabel);
        const bKo = hasB && !bIsThreat && typeof isStrongAnswer === 'function' && isStrongAnswer(offB?.koLabel);

        const base = {
            name: threatName,
            rank: rank + 1,
            item: threatParsed.item || '',
            threatSpeed,
            speedA,
            speedB,
            defA: aFmt,
            defB: bFmt,
            offA: fmtDamage(offA),
            offB: fmtDamage(offB),
            offALabel: offA?.koLabel || '',
            offBLabel: offB?.koLabel || ''
        };

        // Only compare sides that can face this threat (skip self-mirror false positives)
        const canCompareBoth = hasA && hasB && !aIsThreat && !bIsThreat;
        const canCompareAOnly = hasA && !hasB && !aIsThreat;
        const canCompareBOnly = hasB && !hasA && !bIsThreat;

        if (canCompareBoth) {
            if (aSurv && !bSurv) surviveA.push(base);
            if (bSurv && !aSurv) surviveB.push(base);
            if (aFaster && !bFaster) outspeedA.push(base);
            if (bFaster && !aFaster) outspeedB.push(base);
            if (aKo && !bKo) koA.push(base);
            if (bKo && !aKo) koB.push(base);
        } else if (canCompareAOnly) {
            if (aSurv) surviveA.push(base);
            if (aFaster) outspeedA.push(base);
            if (aKo) koA.push(base);
        } else if (canCompareBOnly) {
            if (bSurv) surviveB.push(base);
            if (bFaster) outspeedB.push(base);
            if (bKo) koB.push(base);
        }
    }

    if (requestId !== metaDiffRequestId) return;

    metaDiffCache = {
        surviveA, surviveB, outspeedA, outspeedB, koA, koB,
        checked, hasA, hasB, speedA, speedB, format
    };

    setMetaSummary(metaDiffCache);
    const modeNote = hasA && hasB
        ? `Compared against ${checked} meta sets (${format}). Showing exclusive advantages only.`
        : `Compared against ${checked} meta sets (${format}). Load the other build to see exclusive differences.`;
    setMetaStatus(modeNote);
    renderMetaDiffFromCache();
    } catch (err) {
        console.error('Meta diff failed', err);
        if (requestId === metaDiffRequestId) {
            setMetaStatus('Meta comparison failed. Try Recalc, or check the console.');
        }
    }
}

function setMetaStatus(text) {
    const el = document.getElementById('meta-diff-status');
    if (el) el.textContent = text || '';
}

function setMetaSummary(cache) {
    const ids = {
        'meta-sum-survive-a': cache?.surviveA?.length,
        'meta-sum-survive-b': cache?.surviveB?.length,
        'meta-sum-speed-a': cache?.outspeedA?.length,
        'meta-sum-speed-b': cache?.outspeedB?.length,
        'meta-sum-ko-a': cache?.koA?.length,
        'meta-sum-ko-b': cache?.koB?.length
    };
    Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val == null ? '—' : String(val);
    });
}

function renderMetaDiffFromCache() {
    if (!metaDiffCache) {
        renderMetaLists([], [], metaDiffTab);
        return;
    }
    const map = {
        survive: [metaDiffCache.surviveA, metaDiffCache.surviveB],
        outspeed: [metaDiffCache.outspeedA, metaDiffCache.outspeedB],
        ko: [metaDiffCache.koA, metaDiffCache.koB]
    };
    const [listA, listB] = map[metaDiffTab] || map.survive;
    renderMetaLists(listA, listB, metaDiffTab);
}

function renderMetaLists(listA, listB, tab) {
    const titles = {
        survive: ['Survives attacks B does not', 'Survives attacks A does not'],
        outspeed: ['Outspeeds threats B does not', 'Outspeeds threats A does not'],
        ko: ['OHKO / 2HKO threats B does not', 'OHKO / 2HKO threats A does not']
    };
    const singleTitles = {
        survive: ['Survives these meta attacks', 'Survives these meta attacks'],
        outspeed: ['Outspeeds these meta threats', 'Outspeeds these meta threats'],
        ko: ['OHKO / 2HKO these meta threats', 'OHKO / 2HKO these meta threats']
    };
    const both = !!(metaDiffCache?.hasA && metaDiffCache?.hasB);
    const t = both ? titles : singleTitles;
    const titleA = document.getElementById('meta-col-title-a');
    const titleB = document.getElementById('meta-col-title-b');
    if (titleA) titleA.textContent = (t[tab] || t.survive)[0];
    if (titleB) titleB.textContent = (t[tab] || t.survive)[1];

    const emptyA = both
        ? 'No exclusive advantages for Build A in this category.'
        : (metaDiffCache?.hasA ? 'No matchups in this category.' : 'Load Build A.');
    const emptyB = both
        ? 'No exclusive advantages for Build B in this category.'
        : (metaDiffCache?.hasB ? 'No matchups in this category.' : 'Load Build B.');

    fillMetaList('meta-diff-list-a', listA || [], tab, 'a', emptyA);
    fillMetaList('meta-diff-list-b', listB || [], tab, 'b', emptyB);
}

function fillMetaList(elId, list, tab, side, emptyMsg) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!list.length) {
        el.innerHTML = `<div class="meta-diff-empty">${emptyMsg}</div>`;
        return;
    }
    el.innerHTML = list.map(row => metaDiffCardHtml(row, tab, side)).join('');
}

function metaDiffCardHtml(row, tab, side) {
    const other = side === 'a' ? 'b' : 'a';
    const ownDef = side === 'a' ? row.defA : row.defB;
    const otherDef = side === 'a' ? row.defB : row.defA;
    const ownOff = side === 'a' ? row.offA : row.offB;
    const otherOff = side === 'a' ? row.offB : row.offA;
    const ownOffLabel = side === 'a' ? row.offALabel : row.offBLabel;
    const otherOffLabel = side === 'a' ? row.offBLabel : row.offALabel;
    const ownSpe = side === 'a' ? row.speedA : row.speedB;
    const otherSpe = side === 'a' ? row.speedB : row.speedA;

    let detail = '';
    if (tab === 'survive') {
        detail = `
            <div class="meta-diff-card__calcs">
                <div class="meta-diff-calc meta-diff-calc--win">
                    <span class="meta-diff-calc__who">${side.toUpperCase()}</span>
                    <span class="meta-diff-calc__move">${ownDef.move || 'Best hit'}</span>
                    <span class="meta-diff-calc__pct">${ownDef.pct}</span>
                    <span class="meta-diff-calc__tag">${ownDef.label}</span>
                </div>
                <div class="meta-diff-calc meta-diff-calc--lose">
                    <span class="meta-diff-calc__who">${other.toUpperCase()}</span>
                    <span class="meta-diff-calc__move">${otherDef.move || 'Best hit'}</span>
                    <span class="meta-diff-calc__pct">${otherDef.pct}</span>
                    <span class="meta-diff-calc__tag">${otherDef.label}</span>
                </div>
            </div>`;
    } else if (tab === 'outspeed') {
        detail = `
            <div class="meta-diff-card__calcs meta-diff-card__calcs--speed">
                <div class="meta-diff-calc meta-diff-calc--win">
                    <span class="meta-diff-calc__who">${side.toUpperCase()}</span>
                    <span class="meta-diff-calc__pct">${ownSpe ?? '—'} Spe</span>
                    <span class="meta-diff-calc__tag">Faster</span>
                </div>
                <div class="meta-diff-calc">
                    <span class="meta-diff-calc__who">Threat</span>
                    <span class="meta-diff-calc__pct">${row.threatSpeed ?? '—'} Spe</span>
                </div>
                <div class="meta-diff-calc meta-diff-calc--lose">
                    <span class="meta-diff-calc__who">${other.toUpperCase()}</span>
                    <span class="meta-diff-calc__pct">${otherSpe ?? '—'} Spe</span>
                    <span class="meta-diff-calc__tag">Not faster</span>
                </div>
            </div>`;
    } else {
        detail = `
            <div class="meta-diff-card__calcs">
                <div class="meta-diff-calc meta-diff-calc--win">
                    <span class="meta-diff-calc__who">${side.toUpperCase()}</span>
                    <span class="meta-diff-calc__move">${ownOff.move || 'Best move'}</span>
                    <span class="meta-diff-calc__pct">${ownOff.pct}</span>
                    <span class="meta-diff-calc__tag">${ownOffLabel || ownOff.label}</span>
                </div>
                <div class="meta-diff-calc meta-diff-calc--lose">
                    <span class="meta-diff-calc__who">${other.toUpperCase()}</span>
                    <span class="meta-diff-calc__move">${otherOff.move || 'Best move'}</span>
                    <span class="meta-diff-calc__pct">${otherOff.pct}</span>
                    <span class="meta-diff-calc__tag">${otherOffLabel || otherOff.label}</span>
                </div>
            </div>`;
    }

    return `
        <article class="meta-diff-card">
            <div class="meta-diff-card__head">
                <img class="meta-diff-card__sprite" src="${metaSpriteUrl(row.name)}" alt=""
                     onerror="this.style.visibility='hidden'" width="40" height="40">
                <div class="meta-diff-card__identity">
                    <div class="meta-diff-card__name">
                        <span class="meta-diff-card__rank">#${row.rank}</span>
                        ${row.name}
                    </div>
                    ${row.item ? `<div class="meta-diff-card__item">${row.item}</div>` : ''}
                </div>
            </div>
            ${detail}
        </article>`;
}

// ------ MODAL / POKEPASTE IMPORTER ------
let currentImportNum = 1;
let currentImportTab = 'library';

function setupImportTabs() {
    document.querySelectorAll('.import-tab').forEach(tab => {
        tab.addEventListener('click', () => setImportTab(tab.dataset.importTab));
    });
}

function setImportTab(tab) {
    currentImportTab = tab === 'library' ? 'library' : 'paste';
    document.querySelectorAll('.import-tab').forEach(btn => {
        const on = btn.dataset.importTab === currentImportTab;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const pastePane = document.getElementById('import-paste-pane');
    const libPane = document.getElementById('import-library-pane');
    if (pastePane) {
        pastePane.classList.toggle('is-active', currentImportTab === 'paste');
        pastePane.hidden = currentImportTab !== 'paste';
    }
    if (libPane) {
        libPane.classList.toggle('is-active', currentImportTab === 'library');
        libPane.hidden = currentImportTab !== 'library';
    }
    if (currentImportTab === 'library') populateLibraryList();
}

function setupLibraryFilters() {
    document.getElementById('library-search')?.addEventListener('input', populateLibraryList);
    document.getElementById('library-format')?.addEventListener('change', populateLibraryList);
}

function populateLibraryList() {
    const list = document.getElementById('library-build-list');
    if (!list) return;
    if (!buildsData.length) {
        list.innerHTML = '<div class="compare-move-empty">Could not load builds.json. Refresh and try again.</div>';
        return;
    }

    const q = (document.getElementById('library-search')?.value || '').toLowerCase().trim();
    const fmt = (document.getElementById('library-format')?.value || '').toLowerCase();

    let pool = buildsData;
    if (fmt) pool = pool.filter(b => (b.format || 'Singles').toLowerCase() === fmt);

    // Champions-first: only show builds whose species is Champions-eligible
    const champSpecies = new Set(
        pokemonData.filter(p => p.inChampions === true).map(p => normalizeKey(p.Name))
    );
    pool = pool.filter(b => champSpecies.has(normalizeKey(b.pokemon)));

    if (q) {
        pool = pool.filter(b =>
            (b.pokemon || '').toLowerCase().includes(q) ||
            (b.build || '').toLowerCase().includes(q) ||
            String(b.id).includes(q)
        );
    }

    // Prefer exact species prefix matches first
    if (q) {
        pool = [...pool].sort((a, b) => {
            const an = (a.pokemon || '').toLowerCase();
            const bn = (b.pokemon || '').toLowerCase();
            const aStarts = an.startsWith(q) ? 0 : 1;
            const bStarts = bn.startsWith(q) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return an.localeCompare(bn);
        });
    }

    const shown = pool.slice(0, 60);
    if (!shown.length) {
        list.innerHTML = '<div class="compare-move-empty">No builds match your filters.</div>';
        return;
    }

    list.innerHTML = shown.map(b => {
        const itemMatch = (b.build || '').split('\n')[0]?.split('@')[1]?.trim() || '';
        return `<button type="button" class="library-build-item" data-build-id="${b.id}">
            <span>
                <span class="library-build-item__name">${b.pokemon}</span>
                ${itemMatch ? `<span class="library-build-item__item">${itemMatch}</span>` : ''}
            </span>
            <span class="library-build-item__meta">${b.format || 'Singles'} · #${b.id}</span>
        </button>`;
    }).join('');

    list.querySelectorAll('.library-build-item').forEach(btn => {
        btn.addEventListener('click', () => {
            loadLibraryBuild(currentImportNum, btn.dataset.buildId, true);
            closeImportModal();
        });
    });
}

function loadLibraryBuild(num, buildId, toast) {
    const build = buildsData.find(b => String(b.id) === String(buildId));
    if (!build || !build.build) {
        if (toast !== false) showToast('Build not found in builds.json');
        return;
    }
    importFromText(num, build.build);
    if (toast !== false) showToast(`Build ${num === 1 ? 'A' : 'B'}: ${build.pokemon} (#${build.id})`);
}

window.openImportModal = function(num, tab) {
    currentImportNum = num;
    document.getElementById('import-target-label').textContent = `Importing for Build ${num === 1 ? 'A' : 'B'}`;
    const modal = document.getElementById('import-modal');
    modal.style.display = 'flex';
    modal.classList.add('active');
    setImportTab(tab || 'library');
    if (currentImportTab === 'paste') {
        document.getElementById('paste-input').value = '';
        document.getElementById('paste-input').focus();
    } else {
        document.getElementById('library-search')?.focus();
    }
};

window.closeImportModal = function() {
    const modal = document.getElementById('import-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
};

function setupImportConfirm() {
    const btn = document.getElementById('confirm-import');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
        const text = document.getElementById('paste-input').value.trim();
        if (!text) return;

        let pasteText = text;
        if (text.startsWith('http')) {
            btn.textContent = 'Fetching...';
            btn.disabled = true;
            try {
                const pasteId = text.split('/').filter(Boolean).pop();
                if (!pasteId) throw new Error('Invalid Pokepaste URL');
                const res = await fetch(`https://pokepast.es/${pasteId}/json`);
                if (!res.ok) throw new Error('Could not load from pokepast.es');
                const data = await res.json();
                pasteText = data.paste || '';
            } catch (e) {
                console.error(e);
                showToast('Failed to fetch paste. Try pasting raw text.');
                btn.textContent = 'Import';
                btn.disabled = false;
                return;
            }
            btn.textContent = 'Import';
            btn.disabled = false;
        }

        importFromText(currentImportNum, pasteText);
        closeImportModal();
    });
}

function importFromText(num, text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const p = num === 1 ? p1 : p2;

    try {
        const line1 = lines[0];
        const speciesName = parseSpeciesFromHeader(line1);
        const itemPart = line1.includes('@') ? line1.split('@')[1].trim() : '';

        // Resolve species first (resets spread for a new Pokémon)
        selectPokemon(num, speciesName);
        if (!p.species) {
            showToast(`Could not resolve species: ${speciesName}`);
            return;
        }

        p.item = itemPart && itemPart.toLowerCase() !== 'none' ? itemPart : '';
        p.moves = [];
        p.ability = '';
        p.nature = 'Serious';
        p.level = 50;
        p.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        p.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

        lines.slice(1).forEach(line => {
            if (/^Ability\s*:/i.test(line)) p.ability = line.split(':').slice(1).join(':').trim();
            else if (/^Level\s*:/i.test(line)) p.level = parseInt(line.split(':')[1].trim(), 10) || 50;
            else if (/^EVs\s*:/i.test(line)) {
                line.split(':').slice(1).join(':').split('/').forEach(part => {
                    const match = part.trim().match(/(\d+)\s+([A-Za-z.]+)/);
                    if (!match) return;
                    const key = mapEvStatKey(match[2]);
                    if (key) p.evs[key] = parseInt(match[1], 10) || 0;
                });
            } else if (/^IVs\s*:/i.test(line)) {
                line.split(':').slice(1).join(':').split('/').forEach(part => {
                    const match = part.trim().match(/(\d+)\s+([A-Za-z.]+)/);
                    if (!match) return;
                    const key = mapEvStatKey(match[2]);
                    if (key) p.ivs[key] = parseInt(match[1], 10) || 0;
                });
            } else if (/nature$/i.test(line)) {
                p.nature = line.replace(/nature$/i, '').trim();
            } else if (line.startsWith('-')) {
                const move = line.replace(/^-+\s*/, '').trim();
                if (move) p.moves.push(move);
            }
        });

        if (!p.ability) {
            const pd = findPokemonByName(p.species);
            p.ability = (pd && getPokemonAbilities(pd)[0]) || '';
        }

        if (typeof coerceEvsForMode === 'function') {
            p.evs = coerceEvsForMode(p.evs, isChampionsMode);
        } else if (isChampionsMode) {
            p.evs = looksLikeTraditionalEvs && looksLikeTraditionalEvs(p.evs)
                ? convertEvsToChampions(p.evs)
                : (typeof clampEvsForMode === 'function' ? clampEvsForMode(p.evs, true) : p.evs);
        }

        document.getElementById(`p${num}-search`).value = p.species;
        document.getElementById(`p${num}-level`).value = p.level;
        document.getElementById(`p${num}-nature`).value = p.nature;
        document.getElementById(`p${num}-ability`).value = p.ability;
        document.getElementById(`p${num}-item`).value = p.item;

        recalcStats(num);
        renderMoves(num);
        showToast(`Build ${num === 1 ? 'A' : 'B'} imported`);
    } catch (e) {
        console.error('Import error', e);
        showToast('Failed to parse build paste');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(120px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 2500);
}
