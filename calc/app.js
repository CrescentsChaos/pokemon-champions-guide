// State Management
let pokemonDB = [];
let movesDB = [];
let itemsDB = [];
let buildsDB = [];
let bestTeamsData = { Doubles: {}, Singles: {} };
let bestTeamsFormatFilter = 'All';
let bestTeamsTargetId = 1;
/** @type {{ 1: object|null, 2: object|null }} */
let pinnedCalcTeams = { 1: null, 2: null };
let p1 = null;
let p2 = null;
let selectedMoveIdx1 = 0;
let selectedMoveIdx2 = 0;
let importTargetId = 1;
let topMetaNames = [];
let _topPokemonsCache = null;
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
        updateStatsUI(pk);
    });

    syncChampionsModeButton();
    recalculate();
}

function getEvLimits() {
    return {
        maxStat: isChampionsMode ? 32 : 252,
        maxTotal: isChampionsMode ? 66 : 508
    };
}

function clampPokemonEvs(pk) {
    pk.evs = clampEvsForMode(pk.evs, isChampionsMode);
}

function normalizeSpeciesKey(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function loadTopPokemonsForCalc(format) {
    if (!_topPokemonsCache) {
        try {
            const resp = await fetch('../assets/top_pokemons.json?v=' + Date.now());
            _topPokemonsCache = await resp.json();
        } catch (e) {
            _topPokemonsCache = {};
        }
    }
    return _topPokemonsCache[format] || _topPokemonsCache['Singles'] || [];
}

let field = {
    format: 'Doubles',
    weather: 'None',
    terrain: 'None',
    gravity: false,
    magicRoom: false,
    wonderRoom: false,
    trickRoom: false,
    ruins: { tablets: false, vessel: false, sword: false, beads: false },
    side1: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, friendGuard: false, battery: false, powerSpot: false, steelySpirit: false, protosynthesis: false, quarkDrive: false, leechSeed: false, tailwind: false },
    side2: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, friendGuard: false, battery: false, powerSpot: false, steelySpirit: false, protosynthesis: false, quarkDrive: false, leechSeed: false, tailwind: false }
};

const natures = {
    'Hardy': [1, 1, 1, 1, 1], 'Lonely': [1.1, 0.9, 1, 1, 1], 'Brave': [1.1, 1, 1, 1, 0.9], 'Adamant': [1.1, 1, 0.9, 1, 1], 'Naughty': [1.1, 1, 1, 0.9, 1],
    'Bold': [0.9, 1.1, 1, 1, 1], 'Docile': [1, 1, 1, 1, 1], 'Relaxed': [1, 1.1, 1, 1, 0.9], 'Impish': [1, 1.1, 0.9, 1, 1], 'Lax': [1, 1.1, 1, 0.9, 1],
    'Timid': [0.9, 1, 1, 1, 1.1], 'Hasty': [1, 0.9, 1, 1, 1.1], 'Serious': [1, 1, 1, 1, 1], 'Jolly': [1, 1, 0.9, 1, 1.1], 'Naive': [1, 1, 1, 0.9, 1.1],
    'Modest': [0.9, 1, 1.1, 1, 1], 'Mild': [1, 0.9, 1.1, 1, 1], 'Quiet': [1, 1, 1.1, 1, 0.9], 'Bashful': [1, 1, 1, 1, 1], 'Rash': [1, 1, 1.1, 0.9, 1],
    'Calm': [0.9, 1, 1, 1.1, 1], 'Gentle': [1, 0.9, 1, 1.1, 1], 'Sassy': [1, 1, 1, 1.1, 0.9], 'Careful': [1, 1, 0.9, 1.1, 1], 'Quirky': [1, 1, 1, 1, 1]
};

const TYPE_LIST = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'];

function getHazardDamageFor(pk) {
    return BattleCalc.getHazardDamage ? BattleCalc.getHazardDamage(pk, field) : 0;
}

function getEffectiveHp(pk) {
    if (BattleCalc.getEffectiveDefenderHp) return BattleCalc.getEffectiveDefenderHp(pk, field);
    return getCurrentHp(pk);
}

function getAvailableFormes(name) {
    if (!name) return [];
    const data = pokemonDB.find(x => x.Name === name);
    const base = data ? data.Name.split('-')[0] : name.split('-')[0];
    return pokemonDB
        .filter(p => p.Name === base || p.Name.startsWith(base + '-'))
        .map(p => p.Name)
        .filter((n, i, arr) => arr.indexOf(n) === i)
        .sort((a, b) => a.localeCompare(b));
}

function populateBuildSelect(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const select = document.getElementById(`${p}-build`);
    if (!select || !pk.name) return;

    const fmt = (field.format || 'Singles').toLowerCase();
    const builds = buildsDB.filter(b =>
        (b.pokemon || '').toLowerCase() === pk.name.toLowerCase() &&
        (b.format || 'Singles').toLowerCase() === fmt
    );

    select.innerHTML = `<option value="">Custom Set</option>` +
        builds.map(b => {
            const role = inferBuildRole(b.build);
            const item = extractItemFromBuild(b.build);
            const label = item ? `${role} (${item})` : role;
            return `<option value="${b.id}">Build #${b.id}: ${label}</option>`;
        }).join('');
    select.value = '';
}

function populateFormeSelect(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const select = document.getElementById(`${p}-forme`);
    if (!select) return;

    const formes = getAvailableFormes(pk.name);
    if (formes.length <= 1) {
        select.style.display = 'none';
        select.innerHTML = '';
        return;
    }
    select.style.display = '';
    select.innerHTML = formes.map(f => `<option value="${f}" ${f === pk.name ? 'selected' : ''}>${f}</option>`).join('');
}

function applyLevelPreset(level) {
    [p1, p2].forEach(pk => {
        if (!pk) return;
        pk.level = level;
        const p = pk.id === 1 ? 'p1' : 'p2';
        const levelInput = document.getElementById(`${p}-level`);
        if (levelInput) levelInput.value = level;
        updateStatsUI(pk);
    });
    document.querySelectorAll('.level-preset').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-level'), 10) === level);
    });
    recalculate();
}

function getMaxHp(pk) {
    return pk?.stats?.hp || 0;
}

function getCurrentHp(pk) {
    return Math.max(0, Math.round(getMaxHp(pk) * ((pk.hpPercent ?? 100) / 100)));
}

function syncHpUI(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const max = getMaxHp(pk);
    const raw = getCurrentHp(pk);
    const percent = Math.round((pk.hpPercent ?? 100) * 10) / 10;

    const percentEl = document.getElementById(`${p}-hp-percent`);
    const sliderEl = document.getElementById(`${p}-hp-slider`);
    const rawInputEl = document.getElementById(`${p}-hp-raw-input`);
    const rawDisplayEl = document.getElementById(`${p}-hp-raw`);
    const maxDisplayEl = document.getElementById(`${p}-hp-max`);

    if (percentEl) percentEl.value = percent;
    if (sliderEl) {
        sliderEl.value = percent;
        sliderEl.style.setProperty('--hp-fill', `${percent}%`);
    }
    if (rawInputEl) {
        rawInputEl.max = max;
        rawInputEl.value = raw;
    }
    if (rawDisplayEl) {
        const hazard = getHazardDamageFor(pk);
        rawDisplayEl.textContent = hazard > 0 ? `${Math.max(1, raw - hazard)}` : raw;
        rawDisplayEl.title = hazard > 0 ? `${raw} HP before ${hazard} hazard damage` : '';
    }
    if (maxDisplayEl) maxDisplayEl.textContent = max;
    updateHPBar(pk.id, percent);
}

function setHpPercent(pk, percent) {
    pk.hpPercent = Math.max(0, Math.min(100, parseFloat(percent) || 0));
    syncHpUI(pk);
    recalculate();
}

function setHpRaw(pk, raw) {
    const max = getMaxHp(pk);
    if (!max) return;
    const clamped = Math.max(0, Math.min(max, parseInt(raw, 10) || 0));
    pk.hpPercent = (clamped / max) * 100;
    syncHpUI(pk);
    recalculate();
}

function populateAbilitySelect(pk, recAbilities = []) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const select = document.getElementById(`${p}-ability`);
    if (!select) return;

    const pkData = pokemonDB.find(x => x.Name === pk.name);
    let abilities = pkData ? getPokemonAbilities(pkData) : ['None'];
    if (pk.ability && !abilities.includes(pk.ability)) abilities = [pk.ability, ...abilities];

    abilities.sort((a, b) => {
        const rankA = recAbilities.indexOf(a) !== -1 ? recAbilities.indexOf(a) : Infinity;
        const rankB = recAbilities.indexOf(b) !== -1 ? recAbilities.indexOf(b) : Infinity;
        return rankA - rankB;
    });

    select.innerHTML = abilities.map(a => {
        const label = recAbilities.includes(a) ? `⭐ ${a}` : a;
        return `<option value="${a}" ${pk.ability === a ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

function populateItemSelects() {
    const sortedItems = [...itemsDB].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    ['p1-item', 'p2-item'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const pk = id === 'p1-item' ? p1 : p2;
        select.innerHTML = `<option value="None">None</option>` +
            sortedItems.map(i => `<option value="${i.name}" ${pk?.item === i.name ? 'selected' : ''}>${i.name}</option>`).join('');
    });
}

function updateItemSprite(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const itemSprite = document.getElementById(`${p}-item-sprite`);
    const badge = document.getElementById(`${p}-sprite-item`);
    const hasItem = !!(pk.item && pk.item !== 'None');
    const url = hasItem ? getItemSpriteUrl(pk.item) : '';

    if (itemSprite) {
        if (hasItem) {
            itemSprite.src = url;
            itemSprite.style.display = 'block';
            itemSprite.dataset.fallback = '';
            itemSprite.alt = pk.item;
            itemSprite.title = pk.item;
        } else {
            itemSprite.style.display = 'none';
            itemSprite.src = '';
            itemSprite.alt = '';
            itemSprite.title = '';
        }
    }

    if (badge) {
        if (hasItem) {
            badge.src = url;
            badge.hidden = false;
            badge.dataset.fallback = '';
            badge.alt = pk.item;
            badge.title = pk.item;
        } else {
            badge.hidden = true;
            badge.src = '';
            badge.alt = '';
            badge.title = '';
        }
    }
}


// Initialize
async function init() {
    try {
        const [pkmn, mvs, itms, blds, bestTeamsResp] = await Promise.all([
            fetch('../assets/pokemon.json').then(res => res.json()),
            fetch('../assets/moves.json').then(res => res.json()),
            fetch('../assets/items.json').then(res => res.json()),
            fetch('../assets/builds.json').then(res => res.json()),
            fetch('../assets/best_teams.json').catch(() => null)
        ]);
        pokemonDB = pkmn;
        movesDB = mvs;
        itemsDB = itms;
        buildsDB = blds;
        if (bestTeamsResp) {
            try {
                bestTeamsData = await bestTeamsResp.json();
            } catch (e) {
                bestTeamsData = { Doubles: {}, Singles: {} };
            }
        }
        initMoveIndex(movesDB);

        window.p1 = setupPokemonState(1);
        window.p2 = setupPokemonState(2);

        p1 = window.p1;
        p2 = window.p2;

        updateStatsUI(p1);
        updateStatsUI(p2);
        setupEventListeners();
        updateFieldState();
        populateDropdowns();
        try {
            await refreshTopMetaList();
        } catch (e) {
            console.warn('Meta list unavailable', e);
        }

        // Load shared calc from URL hash, else Champions meta defaults
        const loadedShared = tryLoadCalcFromHash();
        if (!loadedShared) {
            const meta = topMetaNames.length ? topMetaNames : ['Garchomp', 'Mimikyu'];
            loadPokemon(1, meta[0] || 'Garchomp');
            loadPokemon(2, meta[1] || meta[0] || 'Mimikyu');
        }
        syncChampionsModeButton();

        recalculate();
        window.addEventListener('hashchange', () => {
            if (tryLoadCalcFromHash()) recalculate();
        });
    } catch (e) {
        console.error("Load fail", e);
        showToast("Error loading game data!");
    }
}


function setupEventListeners() {
    ['p1', 'p2'].forEach(p => {
        const id = p === 'p1' ? 1 : 2;
        const pk = id === 1 ? p1 : p2;

        const searchInput = document.getElementById(`${p}-search`);
        searchInput.addEventListener('input', (e) => handleSearch(p, e.target.value));
        searchInput.addEventListener('focus', () => {
            if (!searchInput.value || searchInput.value.length < 2) handleSearch(p, searchInput.value || '');
        });

        searchInput.addEventListener('keydown', (e) => {
            const resultsDiv = document.getElementById(`${p}-search-results`);
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstResult = resultsDiv.querySelector('.search-item');
                if (firstResult) {
                    const name = firstResult.getAttribute('data-name');
                    loadPokemon(id, name);
                }
            } else if (e.key === 'Escape') {
                resultsDiv.classList.remove('active');
            }
        });

        searchInput.addEventListener('blur', () => {
            // Slight delay to allow mousedown on results to trigger first
            setTimeout(() => {
                document.getElementById(`${p}-search-results`).classList.remove('active');
            }, 150);
        });

        document.getElementById(`${p}-level`).addEventListener('change', (e) => {
            pk.level = parseInt(e.target.value) || 50;
            updateStatsUI(pk);
            recalculate();
        });

        ['type1', 'type2'].forEach(tKey => {
            document.getElementById(`${p}-${tKey}`).addEventListener('change', (e) => {
                pk[tKey] = e.target.value;
                syncTypeIcons(pk);
                recalculate();
            });
        });

        const buildSelect = document.getElementById(`${p}-build`);
        if (buildSelect) {
            buildSelect.addEventListener('change', (e) => {
                const buildId = e.target.value;
                if (!buildId) return;
                const bData = buildsDB.find(b => String(b.id) === String(buildId));
                if (bData?.build) importPokePaste(id, bData.build);
            });
        }

        const formeSelect = document.getElementById(`${p}-forme`);
        if (formeSelect) {
            formeSelect.addEventListener('change', (e) => {
                const forme = e.target.value;
                if (forme && forme !== pk.name) loadPokemon(id, forme, { preserveSet: true, preservePinned: true });
            });
        }

        document.getElementById(`${p}-hp-percent`).addEventListener('input', (e) => {
            setHpPercent(pk, e.target.value);
        });

        document.getElementById(`${p}-hp-slider`).addEventListener('input', (e) => {
            setHpPercent(pk, e.target.value);
        });

        document.getElementById(`${p}-hp-raw-input`).addEventListener('input', (e) => {
            setHpRaw(pk, e.target.value);
        });

        ['nature', 'ability', 'item', 'status'].forEach(field => {
            const el = document.getElementById(`${p}-${field}`);
            el.addEventListener('change', (e) => {
                pk[field] = e.target.value;

                if (field === 'item') {
                    const nextForm = getPermanentForm(pk);
                    if (nextForm && nextForm !== pk.name) {
                        loadPokemon(id, nextForm, { preserveSet: true, preservePinned: true });
                        return;
                    }
                    updateItemSprite(pk);
                    updateMegaButtonVisibility(pk);
                }

                if (field === 'ability' || field === 'item' || field === 'nature' || field === 'status') updateStatsUI(pk);
                if (field === 'ability') syncAbilityBoostUI(pk);
                recalculate();
            });
        });


        document.getElementById(`${p}-tera`).addEventListener('change', (e) => {
            pk.tera = e.target.checked;
            if (pk.name.startsWith("Terapagos") && pk.name !== "Terapagos") {
                const target = (pk.tera && pk.teraType === "Stellar") ? "Terapagos-Stellar" : "Terapagos-Terastal";
                if (pk.name !== target) {
                    loadPokemon(id, target, { preserveSet: true, preservePinned: true });
                    return; // loadPokemon calls recalculate
                }
            }
            recalculate();
        });

        document.getElementById(`${p}-tera-type`).addEventListener('change', (e) => {
            pk.teraType = e.target.value;
            syncTypeIcons(pk);
            if (pk.name.startsWith("Terapagos") && pk.name !== "Terapagos") {
                const target = (pk.tera && pk.teraType === "Stellar") ? "Terapagos-Stellar" : "Terapagos-Terastal";
                if (pk.name !== target) {
                    loadPokemon(id, target, { preserveSet: true, preservePinned: true });
                    return; // loadPokemon calls recalculate
                }
            }
            recalculate();
        });

        // Search Selection via Delegation
        document.getElementById(`${p}-search-results`).addEventListener('mousedown', (e) => {
            const target = e.target.closest('.search-item');
            if (target) {
                e.preventDefault(); // Prevent blur on the input

                const buildId = target.getAttribute('data-build-id');
                if (buildId) {
                    const bData = buildsDB.find(b => b.id === buildId);
                    if (bData && bData.build) {
                        document.getElementById(`${p}-search`).value = bData.pokemon;
                        importPokePaste(id, bData.build);
                    }
                } else {
                    const name = target.getAttribute('data-name');
                    loadPokemon(id, name);
                }
            }
        });
    });

    document.querySelectorAll('.field-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Handled by dedicated onclick handlers
            if (btn.classList.contains('item-effect-btn') || btn.classList.contains('ability-boost-btn')) {
                return;
            }
            if (btn.classList.contains('spikes-btn')) {
                const group = btn.closest('.spikes-group');
                if (group) {
                    group.querySelectorAll('.spikes-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                updateFieldState();
                if (p1) updateStatsUI(p1);
                if (p2) updateStatsUI(p2);
                recalculate();
                return;
            }

            if (btn.classList.contains('fallen-btn')) {
                const group = btn.closest('.fallen-group');
                if (group) {
                    group.querySelectorAll('.fallen-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const id = parseInt(group.getAttribute('data-pokemon'), 10);
                    const pk = id === 1 ? p1 : p2;
                    if (pk) {
                        pk.alliesFainted = parseInt(btn.getAttribute('data-fallen'), 10) || 0;
                        syncLastRespectsBpDisplay(pk);
                    }
                }
                recalculate();
                return;
            }

            if (btn.classList.contains('times-hit-btn')) {
                const group = btn.closest('.times-hit-group');
                if (group) {
                    group.querySelectorAll('.times-hit-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const id = parseInt(group.getAttribute('data-pokemon'), 10);
                    const pk = id === 1 ? p1 : p2;
                    if (pk) {
                        pk.timesHit = parseInt(btn.getAttribute('data-hits'), 10) || 0;
                        syncRageFistBpDisplay(pk);
                    }
                }
                recalculate();
                return;
            }

            if (btn.classList.contains('level-preset')) {
                document.querySelectorAll('.level-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyLevelPreset(parseInt(btn.getAttribute('data-level'), 10) || 50);
                return;
            }

            const parent = btn.parentElement;
            if (!btn.classList.contains('toggle-btn') && !btn.classList.contains('cycle-btn')) {
                parent.querySelectorAll('.field-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (btn.classList.contains('toggle-btn')) {
                btn.classList.toggle('active');
            }
            updateFieldState();
            if (p1) updateStatsUI(p1);
            if (p2) updateStatsUI(p2);
            recalculate();
        });
    });

    document.getElementById('confirm-import').addEventListener('click', () => {
        const paste = document.getElementById('paste-input').value;
        importPokePaste(importTargetId, paste);
        closeImportModal();
    });

    setupCalcBestTeamsUI();

    // --- Build Pokepaste Hover Tooltip ---
    const pasteTooltip = document.getElementById('build-paste-tooltip');

    document.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.search-item[data-build-id]');
        if (item) {
            const rawPaste = item.getAttribute('data-paste') || '';
            // Decode HTML entities back to real characters
            const paste = rawPaste.replace(/&quot;/g, '"').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
            pasteTooltip.textContent = paste;
            pasteTooltip.classList.add('visible');
        } else {
            pasteTooltip.classList.remove('visible');
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (pasteTooltip.classList.contains('visible')) {
            const offset = 18;
            const tipW = pasteTooltip.offsetWidth;
            const tipH = pasteTooltip.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Default: appear to the right of cursor
            let left = e.clientX + offset;
            let top = e.clientY + offset;

            // Flip left if overflowing right edge
            if (left + tipW > vw - 10) left = e.clientX - tipW - offset;
            // Flip up if overflowing bottom edge
            if (top + tipH > vh - 10) top = e.clientY - tipH - offset;

            pasteTooltip.style.left = left + 'px';
            pasteTooltip.style.top = top + 'px';
        }
    });

    document.addEventListener('mouseleave', () => {
        pasteTooltip.classList.remove('visible');
    });
}

function inferBuildRole(buildStr) {
    const text = buildStr.toLowerCase();
    if (text.includes('trick room')) return 'Trick Room Abuser';
    if (text.includes('choice band') || text.includes('choice specs')) return 'Wallbreaker';
    if (text.includes('choice scarf')) return 'Revenge Killer';
    if (text.includes('light clay') || text.includes('aurora veil') || text.includes('reflect')) return 'Screener';
    if (text.includes('dragon dance') || text.includes('swords dance') || text.includes('nasty plot') || text.includes('quiver dance')) return 'Setup Sweeper';
    if (text.includes('tailwind') || text.includes('icy wind') || text.includes('electroweb')) return 'Speed Control';
    if (text.includes('leftovers') || text.includes('recover') || text.includes('roost')) return 'Bulky Tank';
    return 'Attacker';
}

function extractItemFromBuild(buildStr) {
    const match = buildStr.match(/^.+?@\s*(.+)/m);
    return match ? match[1].trim() : null;
}

async function refreshTopMetaList() {
    topMetaNames = await loadTopPokemonsForCalc(field.format);
}

function buildMetaSearchSection(format) {
    if (!topMetaNames.length) return '';

    const fmt = (format || 'Singles').toLowerCase();
    const fmtBadge = fmt === 'doubles' ? '#4a90e2' : '#e63946';
    let html = `<div style="padding: 5px 15px; font-size: 0.75rem; color: #aaa; background: rgba(255,255,255,0.05); text-transform: uppercase; letter-spacing: 0.05em;">Top ${format} Meta · Latest Builds</div>`;

    topMetaNames.slice(0, 12).forEach(name => {
        const latest = findLatestBuildForSpecies(name, format, buildsDB);
        if (latest && latest.build) {
            const role = inferBuildRole(latest.build);
            const pasteEncoded = (latest.build || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
            html += `
            <div class="search-item" data-build-id="${latest.id}" data-name="${name}" data-paste="${pasteEncoded}">
                <span class="search-item-name">${name} <span style="color:#ffd76f; font-size:0.78rem; font-weight:600;">(#${topMetaNames.indexOf(name) + 1} · Build #${latest.id})</span></span>
                <span class="search-item-types" style="background:${fmtBadge}; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.65rem;">${role}</span>
            </div>`;
        } else {
            html += `
            <div class="search-item" data-name="${name}">
                <span class="search-item-name">${name} <span style="color:#888; font-size:0.78rem;">(#${topMetaNames.indexOf(name) + 1})</span></span>
                <span class="search-item-types" style="background:${fmtBadge}; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.65rem;">${format}</span>
            </div>`;
        }
    });
    return html;
}

function handleSearch(p, query) {
    const resultsDiv = document.getElementById(`${p}-search-results`);
    const format = field.format || 'Singles';
    const q = (query || '').trim();

    if (!q) {
        const metaHtml = buildMetaSearchSection(format);
        if (metaHtml) {
            resultsDiv.innerHTML = metaHtml;
            resultsDiv.classList.add('active');
            return;
        }
    }

    if (q.length < 2) {
        resultsDiv.classList.remove('active');
        return;
    }

    // Filter base pokemon matches (Champions-eligible first)
    const filteredDB = pokemonDB
        .filter(x => x.inChampions === true && (x.Name || '').toLowerCase().includes(q.toLowerCase()))
        .slice(0, 10);

    // Matching builds for current format only
    const rawBuilds = buildsDB.filter(b =>
        (b.pokemon || '').toLowerCase().includes(q.toLowerCase()) &&
        (b.format || 'Singles').toLowerCase() === format.toLowerCase()
    );

    // Deduplicate build labels:
    // Key = pokemon + format. Within same key, if role clashes → use item name as label.
    // Different formats are always both shown.
    const labeledBuilds = [];
    rawBuilds.forEach(b => {
        const role = inferBuildRole(b.build);
        const item = extractItemFromBuild(b.build);
        const format = (b.format || 'Singles').toLowerCase();
        labeledBuilds.push({ ...b, role, item, format });
    });

    // Detect clashes: same (pokemon, format, role) → use item name as disambiguator
    const labelCount = {};
    labeledBuilds.forEach(b => {
        const key = `${b.pokemon}|${b.format}|${b.role}`;
        labelCount[key] = (labelCount[key] || 0) + 1;
    });

    // Limit to 6 total build results
    const shownBuilds = labeledBuilds.slice(0, 6);

    // Prioritize top-meta matches with latest builds
    const metaMatches = topMetaNames.filter(n => n.toLowerCase().includes(q.toLowerCase()));
    const fmtBadge = format.toLowerCase() === 'doubles' ? '#4a90e2' : '#e63946';

    let html = '';
    if (metaMatches.length > 0) {
        html += `<div style="padding: 5px 15px; font-size: 0.75rem; color: #aaa; background: rgba(255,255,255,0.05); text-transform: uppercase; letter-spacing: 0.05em;">Meta Matches · ${format}</div>`;
        metaMatches.slice(0, 6).forEach(name => {
            const latest = findLatestBuildForSpecies(name, format, buildsDB);
            if (latest && latest.build) {
                const role = inferBuildRole(latest.build);
                const pasteEncoded = (latest.build || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
                html += `
                <div class="search-item" data-build-id="${latest.id}" data-name="${name}" data-paste="${pasteEncoded}">
                    <span class="search-item-name">${name} <span style="color:#ffd76f; font-size:0.78rem; font-weight:600;">(#${topMetaNames.indexOf(name) + 1} · Build #${latest.id})</span></span>
                    <span class="search-item-types" style="background:${fmtBadge}; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.65rem;">${role}</span>
                </div>`;
            } else {
                html += `
                <div class="search-item" data-name="${name}">
                    <span class="search-item-name">${name} <span style="color:#888; font-size:0.78rem;">(#${topMetaNames.indexOf(name) + 1})</span></span>
                    <span class="search-item-types">${format}</span>
                </div>`;
            }
        });
    }

    // Add DB results
    html += filteredDB.map(x => `
        <div class="search-item" data-name="${x.Name}">
            <span class="search-item-name">${x.Name}</span>
            <span class="search-item-types">${x.Type_1}${x.Type_2 ? ' / ' + x.Type_2 : ''}</span>
        </div>
    `).join('');

    // Add Build results
    if (shownBuilds.length > 0) {
        html += `<div style="padding: 5px 15px; font-size: 0.75rem; color: #aaa; background: rgba(255,255,255,0.05); text-transform: uppercase; letter-spacing: 0.05em;">Available Builds</div>`;
        html += shownBuilds.map(b => {
            const key = `${b.pokemon}|${b.format}|${b.role}`;
            const isClash = labelCount[key] > 1;
            const label = isClash && b.item ? b.item : b.role;
            const fmtBadge = b.format === 'doubles' ? '#4a90e2' : '#e63946';
            // Encode paste for data attribute (escape quotes and newlines)
            const pasteEncoded = (b.build || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
            return `
            <div class="search-item" data-build-id="${b.id}" data-name="${b.pokemon}" data-paste="${pasteEncoded}">
                <span class="search-item-name">${b.pokemon} <span style="color:#6ab0f5; font-size:0.78rem; font-weight:600;">(${label})</span></span>
                <span class="search-item-types" style="background:${fmtBadge}; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.65rem;">${b.format || 'Singles'}</span>
            </div>
            `;
        }).join('');
    }

    resultsDiv.innerHTML = html;
    resultsDiv.classList.add('active');
}

function clearPokemonSetState(pk) {
    if (!pk) return;
    const fresh = setupPokemonState(pk.id);
    Object.assign(pk, fresh);
}

function loadPokemon(id, name, opts = {}) {
    const pk = id === 1 ? p1 : p2;
    const data = pokemonDB.find(x => x.Name === name);
    if (!data) return;

    const changingSpecies = !!pk.name && pk.name !== data.Name;
    if (changingSpecies && !opts.preserveSet) {
        clearPokemonSetState(pk);
        if (!opts.preservePinned) {
            pinnedCalcTeams[id] = null;
            renderCalcTeamTrays();
        }
    }

    pk.name = data.Name;
    pk.type1 = data.Type_1;
    pk.type2 = data.Type_2 || 'None';
    pk.baseStats = {
        hp: parseInt(data.HP), atk: parseInt(data.Attack), def: parseInt(data.Defense),
        spa: parseInt(data['Sp.Atk']), spd: parseInt(data['Sp.Def']), spe: parseInt(data.Speed),
        weight: parseFloat(data['Weight{kg}']) || 10.0
    };

    const dbAbilities = getPokemonAbilities(data);
    pk.ability = dbAbilities[0] || 'None';

    const pStr = id === 1 ? 'p1' : 'p2';
    document.getElementById(`${pStr}-search`).value = name;
    document.getElementById(`${pStr}-search-results`).classList.remove('active');

    populatePokemonUI(pk);
    updateStatsUI(pk);
    if (!opts.silent) recalculate();
}

function populatePokemonUI(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    document.getElementById(`${p}-type1`).value = pk.type1;
    document.getElementById(`${p}-type2`).value = pk.type2;
    document.getElementById(`${p}-level`).value = pk.level;
    document.getElementById(`${p}-nature`).value = pk.nature;
    document.getElementById(`${p}-status`).value = pk.status || 'Healthy';
    document.getElementById(`${p}-tera`).checked = pk.tera || false;
    if (pk.teraType) document.getElementById(`${p}-tera-type`).value = pk.teraType;
    syncTypeIcons(pk);
    syncFallenUI(pk);
    syncTimesHitUI(pk);
    syncItemEnabledUI(pk);
    syncAbilityBoostUI(pk);

    let recAbilities = [];
    let recMoves = [];
    const pkData = pokemonDB.find(x => x.Name === pk.name);

    if (pkData && buildsDB) {
        const speciesBuilds = buildsDB.filter(b =>
            (b.pokemon || '').toLowerCase() === pk.name.toLowerCase() &&
            (b.format || 'Singles').toLowerCase() === (field.format || 'Singles').toLowerCase()
        );

        const abilityFreq = new Map();
        const moveFreq = new Map();

        speciesBuilds.forEach(b => {
            if (!b.build) return;
            const lines = b.build.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            lines.forEach(line => {
                if (line.match(/^Ability\s*:/i)) {
                    const ab = line.split(':')[1].trim();
                    abilityFreq.set(ab, (abilityFreq.get(ab) || 0) + 1);
                } else if (line.startsWith('-')) {
                    const mv = line.substring(1).trim();
                    moveFreq.set(mv, (moveFreq.get(mv) || 0) + 1);
                }
            });
        });

        recAbilities = Array.from(abilityFreq.entries()).sort((a, b) => b[1] - a[1]).map(x => x[0]);
        recMoves = Array.from(moveFreq.entries()).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    }

    populateAbilitySelect(pk, recAbilities);
    populateItemSelects();
    populateBuildSelect(pk);
    populateFormeSelect(pk);
    document.getElementById(`${p}-ability`).value = pk.ability;
    document.getElementById(`${p}-item`).value = pk.item || 'None';
    updateItemSprite(pk);
    syncHpUI(pk);

    const spriteImg = document.getElementById(`${p}-sprite`);
    if (spriteImg) {
        const clean = pk.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
        const base = pk.shiny ? 'ani-shiny' : 'ani';
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/${base}/${clean}.gif`;

        // Only show the current forme — never flash mega while still base + stone.
        spriteImg.src = spriteUrl;
        spriteImg.dataset.base = spriteUrl;
        spriteImg.dataset.fallbackState = '';
        spriteImg.dataset.fallback = '';
        spriteImg.classList.remove('mega-toggle');
        delete spriteImg.dataset.mega;
        delete spriteImg.dataset.currentSrc;
    }

    updateMegaButtonVisibility(pk);

    const formeBtn = document.getElementById(`${p}-forme-toggle`);
    if (formeBtn) {
        const hasBattleForme = ["Terapagos", "Terapagos-Terastal", "Terapagos-Stellar", "Aegislash", "Aegislash-Blade", "Zygarde", "Zygarde-10%", "Zygarde-Complete", "Wishiwashi", "Wishiwashi-School", "Palafin", "Palafin-Hero"].includes(pk.name);
        formeBtn.style.display = hasBattleForme ? 'inline-block' : 'none';
        if (pk.name.includes("-Blade") || pk.name.includes("-School") || pk.name.includes("Terastal") || pk.name.includes("Stellar") || pk.name.includes("-Complete") || pk.name === "Palafin-Hero") {
            formeBtn.classList.add("active");
        } else {
            formeBtn.classList.remove("active");
        }
    }

    const eligibleMoves = (pkData && pkData.Moves && pkData.Moves.length > 0) ? pkData.Moves : movesDB.map(m => m.name);
    let sortedMoves = [...eligibleMoves];
    pk.moves.forEach(m => {
        if (m?.name && m.name !== 'None' && !sortedMoves.some(n => n.toLowerCase() === m.name.toLowerCase())) {
            sortedMoves.unshift(m.name);
        }
    });
    sortedMoves.sort((a, b) => {
        const idxA = recMoves.findIndex(m => m.toLowerCase() === a.toLowerCase());
        const idxB = recMoves.findIndex(m => m.toLowerCase() === b.toLowerCase());
        const rankA = idxA !== -1 ? idxA : Infinity;
        const rankB = idxB !== -1 ? idxB : Infinity;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
    });

    const moveContainer = document.getElementById(`${p}-moves`);
    moveContainer.innerHTML = Array(4).fill().map((_, i) => {
        const move = pk.moves[i];
        const mData = BattleCalc.MoveIndex.findInArray(movesDB, move.name);
        const multiInfo = BattleCalc.MoveIndex.getMultiHitInfo(move.name);
        const hitOptions = multiInfo
            ? (multiInfo.variable
                ? Array.from({ length: multiInfo.max - multiInfo.min + 1 }, (_, n) => multiInfo.min + n)
                : [multiInfo.min])
            : [];
        const hasMove = move.name && move.name !== 'None';
        const accuracy = mData?.accuracy;
        const moveKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isLastRespects = moveKey === 'lastrespects'
            || (mData?.battle?.variablePower === 'fallen_allies');
        const isRageFist = moveKey === 'ragefist'
            || (mData?.battle?.variablePower === 'times_hit');
        const isRound = moveKey === 'round';
        const fallen = Math.max(0, Math.min(100, parseInt(pk.alliesFainted, 10) || 0));
        const timesHit = Math.max(0, Math.min(6, parseInt(pk.timesHit, 10) || 0));
        const displayBp = isLastRespects
            ? (50 * (1 + fallen))
            : isRageFist
                ? (50 * (1 + timesHit))
                : isRound
                    ? (move.roundBoosted ? 120 : 60)
                    : (move.basePower ?? 0);
        const bpMax = isLastRespects ? 5050 : (isRageFist ? 350 : 250);
        const bpReadonly = (isLastRespects || isRageFist || isRound)
            ? `readonly title="${isRound ? '60 BP, or 120 BP after another Round this turn' : (isRageFist ? 'Scales with Times hit' : 'Scales with Fallen allies')}"`
            : '';

        return `
        <div class="move-row">
            <select class="move-selector" onchange="updateMove(${pk.id}, ${i}, this.value)" style="width: 100%; margin-bottom: 6px;">
                <option value="None">None</option>
                ${sortedMoves.map(mName => {
                    const mDB = movesDB.find(x => x.name === mName) || { name: mName };
                    const isRec = recMoves.find(m => m.toLowerCase() === mName.toLowerCase());
                    const label = (isRec ? '⭐ ' : '') + mDB.name;
                    const selected = (move.name || '').toLowerCase() === (mDB.name || '').toLowerCase();
                    return `<option value="${mDB.name}" ${selected ? 'selected' : ''}>${label}</option>`;
                }).join('')}
            </select>
            ${hasMove ? `
            <div class="move-edit-row">
                <label>BP
                    <input type="number" min="0" max="${bpMax}" value="${displayBp}"
                        ${bpReadonly}
                        onchange="updateMoveField(${pk.id}, ${i}, 'basePower', this.value)">
                </label>
                <label>Type
                    <select onchange="updateMoveField(${pk.id}, ${i}, 'type', this.value)">
                        ${TYPE_LIST.map(t => `<option value="${t}" ${move.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <label>Class
                    <select onchange="updateMoveField(${pk.id}, ${i}, 'category', this.value)">
                        ${['Physical', 'Special', 'Status'].map(c => `<option value="${c}" ${move.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </label>
            </div>` : ''}
            <div class="move-configs">
                ${hasMove ? `
                    ${moveTypeBadgeHtml(pk, move, i)}
                    ${categoryIconHtml(move.category, 15)}
                    ${accuracy ? `<span class="move-meta-readout">${accuracy}% acc</span>` : ''}
                ` : '<div style="margin-right: auto;"></div>'}
                ${multiInfo ? `
                <select class="hits-select" onchange="updateHits(${pk.id}, ${i}, this.value)">
                    ${hitOptions.map(h => `<option value="${h}" ${(move.hits || getDefaultHitCount(move.name, pk)) == h ? 'selected' : ''}>${h} hit${h > 1 ? 's' : ''}</option>`).join('')}
                </select>` : ''}
                ${isRound ? `
                <label class="crit-label" title="Boost to 120 BP when another Pokémon already used Round this turn">
                    <input type="checkbox" onchange="toggleRoundBoost(${pk.id}, ${i}, this.checked)"
                        ${move.roundBoosted ? 'checked' : ''}>
                    <span class="crit-text">ROUND ×2</span>
                </label>` : ''}
                <label class="crit-label${BattleCalc.MoveIndex.isAlwaysCrit(move) ? ' crit-locked' : ''}" title="${BattleCalc.MoveIndex.isAlwaysCrit(move) ? 'This move always critically hits' : ''}">
                    <input type="checkbox" onchange="toggleCrit(${pk.id}, ${i}, this.checked)"
                        ${(move.crit || BattleCalc.MoveIndex.isAlwaysCrit(move)) ? 'checked' : ''}
                        ${BattleCalc.MoveIndex.isAlwaysCrit(move) ? 'disabled' : ''}>
                    <span class="crit-text">CRIT</span>
                </label>
            </div>
        </div>`;
    }).join('');
}

function syncFallenUI(pk) {
    if (!pk) return;
    const fallen = Math.max(0, Math.min(5, parseInt(pk.alliesFainted, 10) || 0));
    pk.alliesFainted = fallen;
    const group = document.querySelector(`.fallen-group[data-pokemon="${pk.id}"]`);
    if (!group) return;
    group.querySelectorAll('.fallen-btn').forEach(btn => {
        const n = parseInt(btn.getAttribute('data-fallen'), 10) || 0;
        btn.classList.toggle('active', n === fallen);
    });
}

function syncTimesHitUI(pk) {
    if (!pk) return;
    const hits = Math.max(0, Math.min(6, parseInt(pk.timesHit, 10) || 0));
    pk.timesHit = hits;
    const group = document.querySelector(`.times-hit-group[data-pokemon="${pk.id}"]`);
    if (!group) return;
    group.querySelectorAll('.times-hit-btn').forEach(btn => {
        const n = parseInt(btn.getAttribute('data-hits'), 10) || 0;
        btn.classList.toggle('active', n === hits);
    });
}

function syncItemEnabledUI(pk) {
    if (!pk) return;
    if (pk.itemEnabled === undefined) pk.itemEnabled = true;
    const btn = document.getElementById(`p${pk.id}-item-enabled`);
    if (!btn) return;
    const on = pk.itemEnabled !== false;
    btn.classList.toggle('active', on);
    btn.textContent = on ? 'ON' : 'OFF';
    btn.title = on ? 'Item effects enabled — click to disable' : 'Item effects disabled — click to enable';
}

function syncAbilityBoostUI(pk) {
    if (!pk) return;
    const btn = document.getElementById(`p${pk.id}-ability-boost`);
    if (!btn) return;
    const ab = (pk.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const boostable = ab === 'flashfire' || ab === 'electromorphosis';
    btn.style.display = boostable ? '' : 'none';
    if (!boostable) {
        pk.abilityActive = false;
        btn.classList.remove('active');
        return;
    }
    btn.classList.toggle('active', !!pk.abilityActive);
    btn.textContent = pk.abilityActive
        ? (ab === 'flashfire' ? 'Fired' : 'Charged')
        : 'Boosted';
    btn.title = ab === 'flashfire'
        ? 'Flash Fire activated — Fire moves ×1.5'
        : 'Electromorphosis charged — Electric moves ×2';
}

function toggleItemEnabled(id) {
    const pk = id === 1 ? p1 : p2;
    if (!pk) return;
    pk.itemEnabled = pk.itemEnabled === false;
    syncItemEnabledUI(pk);
    updateStatsUI(pk);
    recalculate();
}

function toggleAbilityBoost(id) {
    const pk = id === 1 ? p1 : p2;
    if (!pk) return;
    pk.abilityActive = !pk.abilityActive;
    syncAbilityBoostUI(pk);
    recalculate();
}

window.toggleItemEnabled = toggleItemEnabled;
window.toggleAbilityBoost = toggleAbilityBoost;

function syncLastRespectsBpDisplay(pk) {
    if (!pk) return;
    const p = pk.id === 1 ? 'p1' : 'p2';
    const container = document.getElementById(`${p}-moves`);
    if (!container) return;
    const fallen = Math.max(0, Math.min(100, parseInt(pk.alliesFainted, 10) || 0));
    const rows = container.querySelectorAll('.move-row');
    pk.moves.forEach((move, i) => {
        const key = (move?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (key !== 'lastrespects') return;
        const input = rows[i]?.querySelector('input[type="number"]');
        if (input) {
            input.value = String(50 * (1 + fallen));
            input.max = 5050;
            input.readOnly = true;
            input.title = 'Scales with Fallen allies';
        }
        // Keep stored catalog BP at 50; damage calc applies the fallen formula.
        if (!move.customized) move.basePower = 50;
    });
}

function syncRageFistBpDisplay(pk) {
    if (!pk) return;
    const p = pk.id === 1 ? 'p1' : 'p2';
    const container = document.getElementById(`${p}-moves`);
    if (!container) return;
    const hits = Math.max(0, Math.min(6, parseInt(pk.timesHit, 10) || 0));
    const rows = container.querySelectorAll('.move-row');
    pk.moves.forEach((move, i) => {
        const key = (move?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (key !== 'ragefist') return;
        const input = rows[i]?.querySelector('input[type="number"]');
        if (input) {
            input.value = String(50 * (1 + hits));
            input.max = 350;
            input.readOnly = true;
            input.title = 'Scales with Times hit';
        }
        if (!move.customized) move.basePower = 50;
    });
}

function updateHits(pId, idx, hits) {
    const pk = pId === 1 ? p1 : p2;
    pk.moves[idx].hits = parseInt(hits, 10);
    recalculate();
}

function toggleRoundBoost(pId, idx, checked) {
    const pk = pId === 1 ? p1 : p2;
    if (!pk?.moves?.[idx]) return;
    pk.moves[idx].roundBoosted = !!checked;
    const bpInput = document.querySelectorAll(`#p${pId}-moves .move-row`)[idx]?.querySelector('input[type="number"]');
    if (bpInput) bpInput.value = checked ? '120' : '60';
    recalculate();
}

window.toggleRoundBoost = toggleRoundBoost;

function updateMoveField(pId, idx, field, value) {
    const pk = pId === 1 ? p1 : p2;
    const move = pk.moves[idx];
    if (!move || move.name === 'None') return;

    if (field === 'basePower') {
        move.basePower = Math.max(0, parseInt(value, 10) || 0);
    } else if (field === 'type') {
        move.type = value;
    } else if (field === 'category') {
        move.category = value;
    }
    move.customized = true;
    recalculate();
    // Ensure type badge reflects manual type edits immediately
    refreshMoveTypeBadges(pk);
}

function megaSpeciesSuffixFromItem(item) {
    if (typeof MegaSprites !== 'undefined' && MegaSprites.megaFormSuffixFromItem) {
        const form = MegaSprites.megaFormSuffixFromItem(item);
        if (form === 'mega-x') return '-Mega-X';
        if (form === 'mega-y') return '-Mega-Y';
        if (form === 'mega-z') return '-Mega-Z';
        if (form === 'mega' || form === 'primal') return form === 'primal' ? '-Primal' : '-Mega';
    }
    const it = (item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (it.endsWith('itex')) return '-Mega-X';
    if (it.endsWith('itey')) return '-Mega-Y';
    if (it.endsWith('itez')) return '-Mega-Z';
    if (it === 'redorb' || it === 'blueorb') return '-Primal';
    if (it.endsWith('ite') && it !== 'eviolite' && it !== 'meteorite') return '-Mega';
    return '-Mega';
}

function toggleMega(id) {
    const pk = id === 1 ? p1 : p2;
    const currentName = pk.name;
    const btn = document.getElementById(`p${id}-mega-toggle`);
    const heldItem = pk.item;

    let targetName = "";
    if (currentName.includes("-Mega") || currentName.includes("-Primal")) {
        targetName = currentName.split(/-Mega|-Primal/)[0];
        btn.classList.remove('active');
    } else {
        const suffix = megaSpeciesSuffixFromItem(heldItem);
        // Stone-specific forme first (Charizardite Y → Mega-Y, never Mega-X)
        let mega = pokemonDB.find(p => p.Name === currentName + suffix);
        if (!mega && suffix === '-Mega') {
            mega = pokemonDB.find(p =>
                p.Name === currentName + '-Mega' ||
                p.Name === currentName + '-Mega-X' ||
                p.Name === currentName + '-Mega-Y' ||
                p.Name === currentName + '-Mega-Z');
        }
        if (!mega) {
            showToast(suffix !== '-Mega'
                ? `No ${suffix.slice(1)} forme found for ${currentName}`
                : `No Mega form found for ${currentName}`);
            return;
        }
        targetName = mega.Name;
        btn.classList.add('active');
    }

    if (targetName) {
        loadPokemon(id, targetName, { preserveSet: true, preservePinned: true });
        const loaded = id === 1 ? p1 : p2;
        if (heldItem && heldItem !== 'None') {
            loaded.item = heldItem;
            const itemSel = document.getElementById(`p${id}-item`);
            if (itemSel) itemSel.value = heldItem;
            updateItemSprite(loaded);
            updateMegaButtonVisibility(loaded);
            updateStatsUI(loaded);
            recalculate();
        }
        btn.classList.toggle('active', /-Mega|-Primal/i.test(loaded.name));
    }
}

function toggleForme(id) {
    const pk = id === 1 ? p1 : p2;
    const currentName = pk.name;
    const btn = document.getElementById(`p${id}-forme-toggle`);

    let targetName = "";

    // Terapagos rules
    if (currentName === "Terapagos") {
        targetName = (pk.tera && pk.teraType === "Stellar") ? "Terapagos-Stellar" : "Terapagos-Terastal";
    } else if (currentName.startsWith("Terapagos")) {
        targetName = "Terapagos";
    }
    // Aegislash rules
    else if (currentName === "Aegislash") {
        targetName = "Aegislash-Blade";
    } else if (currentName === "Aegislash-Blade") {
        targetName = "Aegislash";
    }
    // Zygarde rules
    else if (currentName === "Zygarde" || currentName === "Zygarde-10%") {
        targetName = "Zygarde-Complete";
        pk.baseForme = currentName;
    } else if (currentName === "Zygarde-Complete") {
        targetName = pk.baseForme || "Zygarde";
    }
    // Wishiwashi rules
    else if (currentName === "Wishiwashi") {
        targetName = "Wishiwashi-School";
    } else if (currentName === "Wishiwashi-School") {
        targetName = "Wishiwashi";
    }
    // Palafin rules
    else if (currentName === "Palafin") {
        targetName = "Palafin-Hero";
    } else if (currentName === "Palafin-Hero") {
        targetName = "Palafin";
    } else {
        showToast("No battle forme for " + currentName);
        return;
    }

    if (targetName) loadPokemon(id, targetName, { preserveSet: true, preservePinned: true });
}

function updateMove(pId, idx, moveName) {
    const pk = pId === 1 ? p1 : p2;
    const prevCrit = pk.moves[idx].crit;
    if (!moveName || moveName === 'None') {
        pk.moves[idx] = { name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false };
        populatePokemonUI(pk);
        recalculate();
        return;
    }

    const rec = BattleCalc.MoveIndex.findInArray(movesDB, moveName);
    if (rec) {
        const hits = BattleCalc.isMultiHitMove(rec.name) ? getDefaultHitCount(rec.name, pk) : undefined;
        pk.moves[idx] = BattleCalc.MoveIndex.createMoveState(rec.name, {
            crit: prevCrit,
            customized: false,
            ...(hits ? { hits } : {})
        });
        // Ensure category is always title-cased for damage calc
        if (pk.moves[idx]) {
            const c = (pk.moves[idx].category || '').toLowerCase();
            pk.moves[idx].category = c === 'special' ? 'Special' : c === 'status' ? 'Status' : 'Physical';
        }
    } else {
        pk.moves[idx] = { name: moveName, basePower: 0, type: 'Normal', category: 'Physical', crit: prevCrit };
    }
    populatePokemonUI(pk);
    recalculate();
}

function toggleCrit(pId, idx, checked) {
    const pk = pId === 1 ? p1 : p2;
    const move = pk.moves[idx];
    if (BattleCalc.MoveIndex.isAlwaysCrit(move)) {
        move.crit = true;
        recalculate();
        return;
    }
    move.crit = checked;
    recalculate();
}

function updateStatsUI(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const tbody = document.getElementById(`${p}-stats`);
    const statsKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

    // PRE-CALCULATE base totals so applyParadoxBoost can evaluate all stats accurately
    statsKeys.forEach(k => {
        const base = pk.baseStats[k] || 0;
        pk.stats[k] = calculateStat(base, pk.ivs[k], pk.evs[k], pk.level, pk.nature, k, isChampionsMode);
    });

    const choiceItem = (pk.item || '').toLowerCase();
    const choiceBoostStat = choiceItem === 'choice band' ? 'atk'
        : choiceItem === 'choice specs' ? 'spa'
        : null; // Choice Scarf is applied via getEffectiveSpeed

    const side = pk.id === 1 ? field.side1 : field.side2;
    const speedMods = (typeof BattleCalc !== 'undefined' && BattleCalc.getSpeedModifiers)
        ? BattleCalc.getSpeedModifiers(pk, field)
        : [];
    const speedModTitle = speedMods.map(m => `${m.label} ×${m.mult}`).join(', ');

    tbody.innerHTML = statsKeys.map(k => {
        const base = pk.baseStats[k] || 0;
        const iv = pk.ivs[k];
        const ev = pk.evs[k];
        const boost = pk.boosts[k] || 0;

        let displayTotal = pk.stats[k];
        if (k !== 'hp' && k !== 'spe') {
            displayTotal = applyParadoxBoost(pk, displayTotal, k, field, side);
        }

        // Apply choice item visual multiplier (Band / Specs only — Scarf via speed path)
        const isChoiceBoosted = k !== 'hp' && k === choiceBoostStat;
        if (isChoiceBoosted) {
            displayTotal = Math.floor(displayTotal * 1.5);
        }

        let boostedTotal;
        let speedBoosted = false;
        if (k === 'spe') {
            boostedTotal = (typeof BattleCalc !== 'undefined' && BattleCalc.getEffectiveSpeed)
                ? BattleCalc.getEffectiveSpeed(pk, field)
                : getBoostValue(displayTotal, boost);
            speedBoosted = speedMods.length > 0;
        } else {
            boostedTotal = k === 'hp' ? displayTotal : getBoostValue(displayTotal, boost);
        }

        const choiceStyle = isChoiceBoosted || speedBoosted
            ? 'color: #ffd76f; font-weight: 900; text-shadow: 0 0 8px rgba(255,200,80,0.6);'
            : '';
        const choiceTitle = isChoiceBoosted
            ? ` title="×1.5 from ${pk.item}"`
            : (speedBoosted ? ` title="${speedModTitle}"` : '');

        const natureMods = natures[pk.nature] || [1, 1, 1, 1, 1];
        const natureStatIdx = { atk: 0, def: 1, spa: 2, spd: 3, spe: 4 };
        let natureStyle = choiceStyle;
        if (!isChoiceBoosted && !speedBoosted && k !== 'hp') {
            const mod = natureMods[natureStatIdx[k]] || 1;
            if (mod > 1) natureStyle = 'color: #ff5c5c; font-weight: 900;';
            else if (mod < 1) natureStyle = 'color: #9ec5ff; font-weight: 800;';
        }

        const evMax = isChampionsMode ? 32 : 252;
        const evStep = isChampionsMode ? 1 : 1;
        const speedHint = (k === 'spe' && speedBoosted)
            ? `<span class="stat-mod-hint">×${speedMods.reduce((a, m) => a * m.mult, 1)}</span>`
            : '';

        return `
            <tr>
                <td class="stat-label">${k.toUpperCase()}</td>
                <td>${base}</td>
                <td><input type="number" value="${iv}" min="0" max="31" onchange="updateStatVal(${pk.id}, '${k}', 'ivs', this.value)"></td>
                <td><input type="number" value="${ev}" min="0" max="${evMax}" step="${evStep}" onchange="updateStatVal(${pk.id}, '${k}', 'evs', this.value)"></td>
                <td>
                    ${k === 'hp' ? '' : `
                    <select onchange="updateStatVal(${pk.id}, '${k}', 'boosts', this.value)" class="boost-select">
                        ${[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(b => `<option value="${b}" ${boost == b ? 'selected' : ''}>${b > 0 ? '+' : ''}${b}</option>`).join('')}
                    </select>
                    `}
                </td>
                <td class="stat-total" id="${p}-${k}-total" style="${natureStyle}"${choiceTitle}>${boostedTotal}${speedHint}</td>
            </tr>
        `;
    }).join('');

    syncHpUI(pk);
}


function updateStatVal(id, k, type, val) {
    const pk = id === 1 ? p1 : p2;
    pk[type][k] = parseInt(val) || 0;
    if (type === 'evs') clampPokemonEvs(pk);
    updateStatsUI(pk);
    recalculate();
}

function getEffectiveMoveType(pk, move) {
    if (!pk || !move || !move.name || move.name === 'None') return move?.type || 'Normal';
    const moveRecord = (typeof BattleCalc !== 'undefined' && BattleCalc.MoveIndex)
        ? BattleCalc.MoveIndex.get(move.name)
        : null;
    const item = (pk.item || '').toLowerCase();
    if (typeof BattleCalc !== 'undefined' && typeof BattleCalc.resolveMoveType === 'function') {
        const resolved = BattleCalc.resolveMoveType(pk, move, moveRecord, item, field);
        return resolved?.moveType || move.type || 'Normal';
    }
    return move.type || 'Normal';
}

function typeIconHtml(type, size = 22) {
    const raw = (type || 'Normal').toString();
    const key = raw.toLowerCase().replace(/[^a-z]/g, '') || 'normal';
    return `<img src="../assets/type-icons/${key}_type.png" class="move-type-icon" alt="${raw}" title="${raw}" width="${size}" height="${size}" loading="lazy" onerror="this.style.display='none'">`;
}

function typeIconSrc(type, { tera = false } = {}) {
    const key = (type || 'Normal').toString().toLowerCase().replace(/[^a-z]/g, '') || 'normal';
    if (tera) return `../assets/type-icons/tera_type_${key}.png`;
    return `../assets/type-icons/${key}_type.png`;
}

function syncTypeIcons(pk) {
    if (!pk) return;
    const p = pk.id === 1 ? 'p1' : 'p2';
    const setIcon = (id, type, opts = {}) => {
        const img = document.getElementById(id);
        if (!img) return;
        const empty = !type || type === 'None' || type === '';
        const fallback = opts.tera ? 'normal' : 'normal';
        const useType = empty ? fallback : type;
        img.src = typeIconSrc(useType, opts);
        img.alt = empty ? '' : String(useType);
        img.title = empty ? '' : String(useType);
        img.classList.toggle('is-empty', empty);
        img.style.display = empty && !opts.tera ? 'none' : '';
    };
    setIcon(`${p}-type1-icon`, pk.type1);
    setIcon(`${p}-type2-icon`, pk.type2);
    setIcon(`${p}-tera-type-icon`, pk.teraType || 'Normal', { tera: true });
}

function categoryIconHtml(category, size = 16) {
    const c = (category || 'Physical').toString().toLowerCase();
    const file = c === 'special' ? 'move-special.png'
        : c === 'status' ? 'move-status.png'
        : 'move-physical.png';
    const label = c === 'special' ? 'Special' : c === 'status' ? 'Status' : 'Physical';
    return `<img src="../assets/${file}" class="move-category-icon" alt="${label}" title="${label}" width="${size}" height="${size}" loading="lazy" onerror="this.style.display='none'">`;
}

const TYPE_ACCENT = {
    normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030', grass: '#78c850',
    ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0', ground: '#e0c068', flying: '#a890f0',
    psychic: '#f85888', bug: '#a8b820', rock: '#b8a038', ghost: '#705898', dragon: '#7038f8',
    dark: '#705848', steel: '#b8b8d0', fairy: '#ee99ac', stellar: '#7cc7b2'
};

function moveTypeBadgeHtml(pk, move, idx) {
    const base = move?.type || 'Normal';
    const eff = getEffectiveMoveType(pk, move);
    const changed = eff.toLowerCase() !== base.toLowerCase();
    return `
        <span class="move-type-badge" data-move-idx="${idx}" title="${changed ? `${base} → ${eff}` : eff}">
            ${typeIconHtml(eff, 18)}
        </span>
    `;
}

function refreshMoveTypeBadges(pk) {
    if (!pk) return;
    const container = document.getElementById(`p${pk.id}-moves`);
    if (!container) return;
    container.querySelectorAll('.move-type-badge').forEach(el => {
        const idx = parseInt(el.dataset.moveIdx, 10);
        const move = pk.moves[idx];
        if (!move || move.name === 'None') return;
        const base = move.type || 'Normal';
        const eff = getEffectiveMoveType(pk, move);
        const changed = eff.toLowerCase() !== base.toLowerCase();
        el.title = changed ? `${base} → ${eff}` : eff;
        el.innerHTML = typeIconHtml(eff, 18);
    });
}

function syncBattleStats(pk) {
    if (!pk?.baseStats) return;
    const champs = typeof isChampionsMode === 'boolean' ? isChampionsMode : true;
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(k => {
        const base = pk.baseStats[k] || 0;
        pk.stats[k] = calculateStat(base, pk.ivs[k], pk.evs[k], pk.level, pk.nature, k, champs);
    });
}

function formatRollsDisplay(rolls) {
    if (!rolls.length) return '(0)';
    if (rolls.length <= 20) return `(${rolls.join(', ')})`;
    const unique = [...new Set(rolls)].sort((a, b) => a - b);
    if (unique.length <= 20) return `(${unique.join(', ')})`;
    return `(${unique[0]}, ${unique[1]}, …, ${unique[unique.length - 2]}, ${unique[unique.length - 1]}) · ${rolls.length} combinations`;
}

function formatHealingRange(res) {
    if (res.healMin == null || res.healMax == null) return '';
    const hp = res.healMin === res.healMax ? `${res.healMin}` : `${res.healMin}–${res.healMax}`;
    const pct = res.healPercentMin === res.healPercentMax
        ? `${res.healPercentMin}%`
        : `${res.healPercentMin}%–${res.healPercentMax}%`;
    const label = res.healMax < 0 ? 'HP loss' : 'Healing';
    let actual = '';
    if (res.actualHealMin != null && res.actualHealMax != null
        && (res.actualHealMin !== res.healMin || res.actualHealMax !== res.healMax)) {
        const actualHp = res.actualHealMin === res.actualHealMax
            ? `${res.actualHealMin}`
            : `${res.actualHealMin}–${res.actualHealMax}`;
        actual = ` · Actual at current HP: ${actualHp} HP`;
    }
    return `${label}: ${hp} HP (${pct} max HP)${actual}${res.bigRootBoosted ? ' · Big Root' : ''}`;
}

function signedHp(value) {
    return `${value > 0 ? '+' : ''}${value}`;
}

function recalculate() {
    if (!p1 || !p2) return;

    syncBattleStats(p1);
    syncBattleStats(p2);
    refreshMoveTypeBadges(p1);
    refreshMoveTypeBadges(p2);

    const p1Results = p1.moves.map(m => m.name !== 'None' ? calculateDamage(p1, p2, m, field) : null);
    const p2Results = p2.moves.map(m => m.name !== 'None' ? calculateDamage(p2, p1, m, field) : null);

    renderMoveResults(p1Results, p2Results);

    let res = null;
    let moveIdx = -1;
    let attackerSide = 1;
    if (selectedMoveIdx1 >= 0 && p1Results[selectedMoveIdx1]) {
        res = p1Results[selectedMoveIdx1];
        moveIdx = selectedMoveIdx1;
        attackerSide = 1;
    } else if (selectedMoveIdx2 >= 0 && p2Results[selectedMoveIdx2]) {
        res = p2Results[selectedMoveIdx2];
        moveIdx = selectedMoveIdx2;
        attackerSide = 2;
    } else {
        const p1Hit = p1Results.findIndex(Boolean);
        if (p1Hit >= 0) {
            res = p1Results[p1Hit];
            moveIdx = p1Hit;
            attackerSide = 1;
        } else {
            const p2Hit = p2Results.findIndex(Boolean);
            if (p2Hit >= 0) {
                res = p2Results[p2Hit];
                moveIdx = p2Hit;
                attackerSide = 2;
            }
        }
    }

    const banner = document.getElementById('main-result');
    const subBanner = document.getElementById('sub-result');
    const koResult = document.getElementById('ko-result');

    const speedEl = document.getElementById('speed-result');
    const damageBar = document.getElementById('damage-bar');
    const damageBarFill = document.getElementById('damage-bar-fill');
    const damageBarRange = document.getElementById('damage-bar-range');
    const heatmapEl = document.getElementById('roll-heatmap');

    const spe1 = BattleCalc.getEffectiveSpeed?.(p1, field) ?? 0;
    const spe2 = BattleCalc.getEffectiveSpeed?.(p2, field) ?? 0;
    const speedCmp = BattleCalc.compareSpeedTier?.(spe1, spe2, !!field.trickRoom) || 'tie';
    const mods1 = BattleCalc.getSpeedModifiers?.(p1, field) || [];
    const mods2 = BattleCalc.getSpeedModifiers?.(p2, field) || [];
    const modTag = (mods) => mods.length ? ` (${mods.map(m => m.label).join(', ')})` : '';
    if (speedEl) {
        const trTag = field.trickRoom ? ' · Trick Room' : '';
        if (speedCmp === 'tie') {
            speedEl.textContent = `Speed tie ${spe1}${modTag(mods1)} = ${spe2}${modTag(mods2)}${trTag}`;
        } else if (speedCmp === 'faster') {
            speedEl.textContent = `${p1.name} outspeeds ${spe1}${modTag(mods1)} → ${spe2}${modTag(mods2)}${trTag}`;
        } else {
            speedEl.textContent = `${p2.name} outspeeds ${spe2}${modTag(mods2)} → ${spe1}${modTag(mods1)}${trTag}`;
        }
    }

    if (!res) {
        banner.innerText = "Select moves to see damage results";
        subBanner.innerText = "Damage rolls: (0)";
        koResult.innerText = '';
        const accKoClear = document.getElementById('acc-ko-result');
        if (accKoClear) {
            accKoClear.hidden = true;
            accKoClear.textContent = '';
        }
        if (damageBar) damageBar.hidden = true;
        if (heatmapEl) {
            heatmapEl.hidden = true;
            heatmapEl.innerHTML = '';
        }
        syncMobileSummary();
        return;
    }

    const attacker = attackerSide === 1 ? p1 : p2;
    const defender = attackerSide === 1 ? p2 : p1;
    const move = attacker.moves[moveIdx];
    const effHp = res.effectiveHp ?? getEffectiveHp(defender);
    const hazardNote = getHazardDamageFor(defender) > 0 ? ` (${effHp} HP after hazards)` : '';

    if (res.effectKind === 'pain_split') {
        banner.innerText = `${attacker.name} Pain Split: ${attacker.name} ${res.userHpBefore}→${res.userHpAfter} HP, ${defender.name} ${res.targetHpBefore}→${res.targetHpAfter} HP`;
    } else if (res.effectKind === 'healing' || res.effectKind === 'hp_loss') {
        banner.innerText = `${attacker.name} used ${res.move}: ${formatHealingRange(res)}${res.healsAllies ? ' · also heals its ally' : ''}`;
    } else if (res.effectKind === 'failed') {
        banner.innerText = `${attacker.name} used ${res.move}: ${res.effectLabel || 'No effect'}`;
    } else if (BattleCalc.formatShowdownLine && move) {
        banner.innerText = BattleCalc.formatShowdownLine(attacker, defender, move, res, field) + hazardNote;
        if (res.userFaints) banner.innerText += ` · ${attacker.name} faints`;
    } else {
        const hitLabel = res.hitCount > 1 ? ` (${res.hitCount} hits)` : '';
        banner.innerText = `${attacker.name} ${res.move}${hitLabel} vs. ${defender.name}: ${res.minDmg ?? res.minPercent}-${res.maxDmg ?? res.maxPercent}%`;
    }
    if (res.effectKind === 'pain_split') {
        subBanner.innerText = `${attacker.name}: ${signedHp(res.userHpChange)} HP · ${defender.name}: ${signedHp(res.targetHpChange)} HP`;
    } else if (res.effectKind === 'healing' || res.effectKind === 'hp_loss' || res.effectKind === 'failed') {
        const attackChange = res.targetAttackChange === 1
            ? 'Target Attack: +1 stage (Contrary)'
            : res.targetAttackChange === 0
                ? 'Target Attack: unchanged'
                : res.targetAttackChange === -1
                    ? 'Target Attack: −1 stage'
                    : '';
        subBanner.innerText = res.effectLabel || attackChange;
    } else {
        const healing = formatHealingRange(res);
        subBanner.innerText = `Damage rolls: ${formatRollsDisplay(res.rolls)}${healing ? ` · ${healing}` : ''}`;
    }

    const utilityResult = ['pain_split', 'healing', 'hp_loss', 'failed'].includes(res.effectKind);
    koResult.innerText = utilityResult ? '' : getKOChance(res.rolls, effHp);

    const accKoEl = document.getElementById('acc-ko-result');
    const accToggle = document.getElementById('acc-adjusted-ko');
    if (accKoEl) {
        if (!utilityResult && accToggle?.checked && move) {
            const adj = getAccuracyAdjustedKo(res.rolls, effHp, move, attacker, field);
            accKoEl.hidden = !adj;
            accKoEl.textContent = adj || '';
        } else {
            accKoEl.hidden = true;
            accKoEl.textContent = '';
        }
    }

    if (damageBar && damageBarFill && damageBarRange && !utilityResult) {
        const minPct = Math.min(100, Math.max(0, Number(res.minPercent) || 0));
        const maxPct = Math.min(100, Math.max(0, Number(res.maxPercent) || 0));
        damageBar.hidden = false;
        damageBarFill.style.width = `${maxPct}%`;
        damageBarFill.style.setProperty('--bar-min', `${minPct}%`);
        damageBarRange.textContent = `${minPct}% – ${maxPct}% of HP`;
        damageBarFill.classList.toggle('ko', maxPct >= 100);
        damageBarFill.classList.toggle('near-ko', maxPct >= 80 && maxPct < 100);
    } else if (damageBar) {
        damageBar.hidden = true;
    }

    renderRollHeatmap(utilityResult ? [] : res.rolls, effHp);

    syncMobileSummary();
}

function renderRollHeatmap(rolls, hp) {
    const el = document.getElementById('roll-heatmap');
    if (!el) return;
    if (!rolls?.length) {
        el.hidden = true;
        el.innerHTML = '';
        return;
    }
    const counts = new Map();
    rolls.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    const maxCount = Math.max(...sorted.map(([, c]) => c));
    el.hidden = false;
    el.innerHTML = sorted.map(([dmg, count]) => {
        const px = Math.max(4, Math.round((count / maxCount) * 32));
        const ko = dmg >= hp ? ' is-ko' : '';
        const pct = ((count / rolls.length) * 100).toFixed(1);
        return `<div class="roll-heatmap__bar${ko}" style="height:${px}px" title="${dmg} dmg · ${count}/${rolls.length} (${pct}%)"></div>`;
    }).join('');
}


function renderMoveResults(p1Results, p2Results) {
    const p1Container = document.getElementById('p1-move-results');
    const p2Container = document.getElementById('p2-move-results');

    const renderSide = (pk, results, selectedIdx, sideId) => {
        return `<h4>${pk.name}'s Moves</h4>` + results.map((res, i) => {
            if (!res) return '';
            const active = selectedIdx === i ? 'active' : '';
            const dmg = res.minDmg != null ? `${res.minDmg}–${res.maxDmg}` : '';
            let effectSummary = '';
            if (res.effectKind === 'pain_split') {
                effectSummary = `${res.userHpAfter} / ${res.targetHpAfter} HP`;
            } else if (res.effectKind === 'healing' || res.effectKind === 'hp_loss') {
                effectSummary = `${res.healMax >= 0 ? '+' : ''}${res.healMax} HP (${res.healPercentMax}%)`;
            } else if (res.effectKind === 'failed') {
                effectSummary = res.effectLabel || 'No effect';
            } else if (res.healMin != null) {
                const heal = res.healMin === res.healMax ? res.healMin : `${res.healMin}–${res.healMax}`;
                effectSummary = `Heal ${heal} HP`;
            }
            const move = pk.moves[i];
            const effType = getEffectiveMoveType(pk, move);
            const baseType = move?.type || 'Normal';
            const changed = effType.toLowerCase() !== baseType.toLowerCase();
            const accent = TYPE_ACCENT[effType.toLowerCase()] || TYPE_ACCENT.normal;
            const converted = changed
                ? `<span class="move-converted-pill" title="${baseType} → ${effType}">${baseType}→${effType}</span>`
                : '';
            return `
                <div class="result-move-box ${active}" onclick="selectMove(${sideId}, ${i})" style="--type-accent:${accent}">
                    <span class="move-name-summary">
                        ${typeIconHtml(effType, 22)}
                        ${categoryIconHtml(move?.category, 14)}
                        <span class="move-name-text">
                            <span class="move-name-label">${res.move}</span>
                            ${converted}
                        </span>
                    </span>
                    <span class="move-damage-summary">
                        ${dmg ? `<span class="dmg-abs">${dmg}</span>` : ''}
                        ${effectSummary
                            ? `<span class="dmg-pct">${effectSummary}</span>`
                            : `<span class="dmg-pct">${res.minPercent}% – ${res.maxPercent}%</span>`}
                    </span>
                </div>
            `;
        }).join('');
    };

    p1Container.innerHTML = renderSide(p1, p1Results, selectedMoveIdx1, 1);
    p2Container.innerHTML = renderSide(p2, p2Results, selectedMoveIdx2, 2);
}

function selectMove(pId, idx) {
    if (pId === 1) {
        selectedMoveIdx1 = idx;
        selectedMoveIdx2 = -1;
    } else {
        selectedMoveIdx2 = idx;
        selectedMoveIdx1 = -1;
    }
    recalculate();
    if (window.matchMedia('(max-width: 768px)').matches) {
        setMobileCalcTab('results');
    }
}


function updateFieldState() {
    field.format = document.getElementById('f-doubles').classList.contains('active') ? 'Doubles' : 'Singles';
    refreshTopMetaList();
    const activeWeather = document.querySelector('[data-weather].active');
    field.weather = activeWeather ? activeWeather.getAttribute('data-weather') : 'None';
    const activeTerrain = document.querySelector('[data-terrain].active');
    field.terrain = activeTerrain ? activeTerrain.getAttribute('data-terrain') : 'None';

    const fieldPanel = document.getElementById('field-panel');
    if (fieldPanel) {
        field.gravity = fieldPanel.querySelector('[data-effect="Gravity"]')?.classList.contains('active') || false;
        field.magicRoom = fieldPanel.querySelector('[data-effect="Magic Room"]')?.classList.contains('active') || false;
        field.wonderRoom = fieldPanel.querySelector('[data-effect="Wonder Room"]')?.classList.contains('active') || false;
        field.trickRoom = fieldPanel.querySelector('[data-effect="Trick Room"]')?.classList.contains('active') || false;

        field.ruins = {
            tablets: fieldPanel.querySelector('[data-ruin="tablets"]')?.classList.contains('active') || false,
            vessel: fieldPanel.querySelector('[data-ruin="vessel"]')?.classList.contains('active') || false,
            sword: fieldPanel.querySelector('[data-ruin="sword"]')?.classList.contains('active') || false,
            beads: fieldPanel.querySelector('[data-ruin="beads"]')?.classList.contains('active') || false
        };
    }

    ['side1', 'side2'].forEach((side, i) => {
        const panel = document.querySelectorAll('.sides-row .side-controls')[i];
        if (panel) {
            const btns = panel.querySelectorAll('.field-btn.active');
            const activeSpikes = panel.querySelector('.spikes-btn.active');
            field[side] = {
                reflect: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Reflect'),
                lightScreen: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Light Screen'),
                auroraVeil: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Aurora Veil'),
                protect: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Protect'),
                helpingHand: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Helping Hand'),
                friendGuard: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Friend Guard'),
                battery: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Battery'),
                powerSpot: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Power Spot'),
                steelySpirit: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Steely Spirit'),
                protosynthesis: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Protosynthesis'),
                quarkDrive: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Quark Drive'),
                leechSeed: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Leech Seed'),
                tailwind: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Tailwind'),
                stealthRock: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Stealth Rock'),
                spikes: parseInt(activeSpikes?.getAttribute('data-count') || '0', 10)
            };
        }
    });

    if (p1?.name) populateBuildSelect(p1);
    if (p2?.name) populateBuildSelect(p2);
}

function updateHPBar(id, percent) {
    const bar = document.getElementById(`p${id}-hp-bar`);
    bar.style.width = percent + '%';
    if (percent > 50) bar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    else if (percent > 20) bar.style.background = 'linear-gradient(90deg, #FFC107, #FFEB3B)';
    else bar.style.background = 'linear-gradient(90deg, #F44336, #E91E63)';
}

function canUseMegaEvolution(pk) {
    if (!pk?.name || !pk?.item || pk.item === 'None') return false;
    const form = typeof MegaSprites !== 'undefined' && MegaSprites.megaFormSuffixFromItem
        ? MegaSprites.megaFormSuffixFromItem(pk.item)
        : null;
    if (!form) return false;

    const base = pk.name.replace(/-Mega(?:-[XYZ])?$|-Primal$/i, '');
    const suffixes = {
        'mega-x': ['-Mega-X'],
        'mega-y': ['-Mega-Y'],
        'mega-z': ['-Mega-Z'],
        primal: ['-Primal'],
        mega: ['-Mega', '-Mega-X', '-Mega-Y', '-Mega-Z']
    };
    return (suffixes[form] || []).some(suffix =>
        pokemonDB.some(p => p.Name === `${base}${suffix}`)
    );
}

function updateMegaButtonVisibility(pk) {
    const btn = document.getElementById(`p${pk.id}-mega-toggle`);
    if (!btn) return;
    const show = canUseMegaEvolution(pk);
    btn.style.display = show ? 'inline-block' : 'none';
    btn.classList.toggle('active', show && /-Mega|-Primal/i.test(pk.name));
}

function generatePokemonPaste(pk) {
    if (!pk?.name) return '';
    let line = pk.name;
    if (pk.item && pk.item !== 'None') line += ` @ ${pk.item}`;
    let paste = line + '\n';
    if (pk.ability && pk.ability !== 'None') paste += `Ability: ${pk.ability}\n`;
    if (pk.level && pk.level !== 50) paste += `Level: ${pk.level}\n`;
    if (pk.tera && pk.teraType) paste += `Tera Type: ${pk.teraType}\n`;

    const evParts = [];
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(k => {
        const val = pk.evs?.[k] || 0;
        if (!val) return;
        const label = k === 'spa' ? 'SpA' : k === 'spd' ? 'SpD' : k === 'spe' ? 'Spe' : k.charAt(0).toUpperCase() + k.slice(1);
        evParts.push(`${val} ${label}`);
    });
    if (evParts.length) paste += `EVs: ${evParts.join(' / ')}\n`;
    paste += `${pk.nature || 'Serious'} Nature\n`;

    const ivParts = [];
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(k => {
        const val = pk.ivs?.[k];
        if (val !== undefined && val !== 31) {
            const label = k === 'spa' ? 'SpA' : k === 'spd' ? 'SpD' : k === 'spe' ? 'Spe' : k.charAt(0).toUpperCase() + k.slice(1);
            ivParts.push(`${val} ${label}`);
        }
    });
    if (ivParts.length) paste += `IVs: ${ivParts.join(' / ')}\n`;

    (pk.moves || []).forEach(m => {
        if (m?.name && m.name !== 'None') paste += `- ${m.name}\n`;
    });
    return paste.trim();
}

let exportTargetId = 1;

function openExportModal(id) {
    exportTargetId = id;
    const pk = id === 1 ? p1 : p2;
    const label = document.getElementById('export-target-label');
    if (label) label.textContent = `Exporting ${pk?.name || 'Pokemon ' + id}`;
    document.getElementById('export-output').value = generatePokemonPaste(pk);
    document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('active');
}

async function copyExportPaste() {
    const text = document.getElementById('export-output').value;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Paste copied to clipboard!');
    } catch (e) {
        const area = document.getElementById('export-output');
        area.select();
        document.execCommand('copy');
        showToast('Paste copied to clipboard!');
    }
}

function openImportModal(id) {
    importTargetId = id;
    const label = document.getElementById('import-target-label');
    if (label) label.innerText = `Importing for Pokemon ${id}`;

    const modal = document.getElementById('import-modal');
    modal.classList.add('active');

    // Auto-focus input
    const input = document.getElementById('paste-input');
    input.value = '';
    setTimeout(() => input.focus(), 100);

    // One-time listener for background click
    const closeOnBg = (e) => {
        if (e.target === modal) {
            closeImportModal();
            modal.removeEventListener('click', closeOnBg);
        }
    };
    modal.addEventListener('click', closeOnBg);
}

function closeImportModal() {
    document.getElementById('import-modal').classList.remove('active');
}

function calcSpeciesSpriteUrl(species, shiny = false) {
    if (!species) return 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    const base = shiny ? 'ani-shiny' : 'ani';
    return `https://play.pokemonshowdown.com/sprites/${base}/${clean}.gif`;
}

function parseBuildHead(buildStr) {
    const lines = String(buildStr || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return { species: '', item: '' };
    const head = lines[0];
    const itemSplit = head.split('@');
    const item = itemSplit[1] ? itemSplit[1].trim() : '';
    let namePart = itemSplit[0].trim();
    const brackets = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(namePart)) !== null) brackets.push(match[1].trim());
    let mainName = namePart.split('(')[0].trim();
    let species = mainName;
    if (brackets.length === 2) species = brackets[0];
    else if (brackets.length === 1 && brackets[0] !== 'M' && brackets[0] !== 'F') species = brackets[0];
    return { species, item };
}

function getCalcBestTeamEntries() {
    const entries = [];
    ['Doubles', 'Singles'].forEach(format => {
        const teams = bestTeamsData?.[format] || {};
        Object.entries(teams).forEach(([name, ids]) => {
            const members = (ids || []).slice(0, 6).map(id => {
                const build = buildsDB.find(b => String(b.id) === String(id));
                if (!build) {
                    return { id, missing: true, species: `Missing #${id}`, item: '', build: null };
                }
                const head = parseBuildHead(build.build);
                return {
                    id,
                    missing: false,
                    species: head.species || build.pokemon,
                    item: head.item || '',
                    build
                };
            });
            entries.push({ name, format, source: 'curated', ids: ids || [], members });
        });
    });

    let savedLibrary = [];
    try {
        const parsed = JSON.parse(localStorage.getItem('pkm_library') || '[]');
        if (Array.isArray(parsed)) savedLibrary = parsed;
    } catch (_) { /* ignore malformed local data */ }

    savedLibrary.forEach((saved) => {
        const sections = String(saved?.paste || '').trim().split(/\n\s*\n/).filter(Boolean).slice(0, 6);
        const members = sections.map((section, index) => {
            const head = parseBuildHead(section);
            return {
                id: `${saved.id || 'saved'}-${index}`,
                missing: !head.species,
                species: head.species || 'Unknown',
                item: head.item || '',
                build: head.species ? { id: `${saved.id || 'saved'}-${index}`, pokemon: head.species, build: section } : null
            };
        }).filter(member => !member.missing);
        if (!members.length) return;
        entries.push({
            name: saved.name || saved.pokemon || 'Saved Team',
            format: 'Library',
            source: 'library',
            ids: members.map(member => member.id),
            members
        });
    });

    return entries;
}

function setupCalcBestTeamsUI() {
    const search = document.getElementById('calc-best-teams-search');
    if (search) search.addEventListener('input', renderCalcBestTeamsList);
    document.querySelectorAll('[data-calc-best-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            bestTeamsFormatFilter = btn.getAttribute('data-calc-best-format') || 'All';
            document.querySelectorAll('[data-calc-best-format]').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-calc-best-format') === bestTeamsFormatFilter);
            });
            renderCalcBestTeamsList();
        });
    });

    const modal = document.getElementById('best-teams-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCalcBestTeams();
        });
    }
}

function openCalcBestTeams(id) {
    bestTeamsTargetId = id === 2 ? 2 : 1;
    const label = document.getElementById('best-teams-target-label');
    if (label) {
        label.textContent = bestTeamsTargetId === 1
            ? 'Click a Pokémon to load into Attacker — pins this team on the attacker side only'
            : 'Click a Pokémon to load into Defender — pins this team on the defender side only';
    }
    const search = document.getElementById('calc-best-teams-search');
    if (search) search.value = '';
    renderCalcBestTeamsList();
    const modal = document.getElementById('best-teams-modal');
    if (modal) {
        modal.classList.add('active');
        const panel = modal.querySelector('.modal-content');
        if (panel) panel.scrollTop = 0;
    }
}

function closeCalcBestTeams() {
    document.getElementById('best-teams-modal')?.classList.remove('active');
}

function renderCalcBestTeamsList() {
    const list = document.getElementById('calc-best-teams-list');
    const meta = document.getElementById('calc-best-teams-meta');
    if (!list) return;

    const q = (document.getElementById('calc-best-teams-search')?.value || '').trim().toLowerCase();
    let entries = getCalcBestTeamEntries();
    if (bestTeamsFormatFilter !== 'All') {
        entries = entries.filter(e => e.format === bestTeamsFormatFilter);
    }
    if (q) {
        entries = entries.filter(e =>
            e.name.toLowerCase().includes(q) ||
            e.members.some(m =>
                (m.species || '').toLowerCase().includes(q) ||
                (m.item || '').toLowerCase().includes(q)
            )
        );
    }

    const side = bestTeamsTargetId === 1 ? 'Attacker' : 'Defender';
    if (meta) {
        meta.textContent = entries.length
            ? `${entries.length} team${entries.length === 1 ? '' : 's'} · loading into ${side}`
            : 'No matching teams';
    }

    if (!entries.length) {
        list.innerHTML = '<div class="calc-best-teams-empty">No matching curated or saved teams found.</div>';
        return;
    }

    list.innerHTML = entries.map((entry, entryIndex) => {
        const badgeClass = entry.format === 'Singles'
            ? 'calc-best-team-card__badge calc-best-team-card__badge--singles'
            : 'calc-best-team-card__badge';
        const mons = entry.members.map((m, mi) => {
            const sprite = calcSpeciesSpriteUrl(m.missing ? '' : m.species);
            return `
                <button type="button" class="calc-best-team-mon" data-entry-index="${entryIndex}" data-member="${mi}"
                    ${m.missing || !m.build ? 'disabled' : ''}
                    title="${(m.species || '').replace(/"/g, '&quot;')}${m.item ? ' @ ' + m.item.replace(/"/g, '&quot;') : ''}">
                    <img class="calc-best-team-mon__sprite" src="${sprite}" alt=""
                        onerror="handleSpriteError(this, '${(m.species || '').replace(/'/g, "\\'")}', false)">
                    <span class="calc-best-team-mon__name">${(m.species || '—').replace(/</g, '&lt;')}</span>
                    <span class="calc-best-team-mon__item">${m.item ? '@ ' + m.item.replace(/</g, '&lt;') : (m.missing ? 'missing' : '—')}</span>
                </button>`;
        }).join('');

        return `
            <article class="calc-best-team-card">
                <div class="calc-best-team-card__top">
                    <h4 class="calc-best-team-card__title">${entry.name.replace(/</g, '&lt;')}</h4>
                    <span class="${badgeClass}">${entry.format}</span>
                </div>
                <div class="calc-best-team-sprites">${mons}</div>
                <p class="calc-best-team-hint">Click any Pokémon to load it into ${side}. That team pins under this side only.</p>
            </article>`;
    }).join('');

    list.querySelectorAll('.calc-best-team-mon').forEach(btn => {
        btn.addEventListener('click', () => {
            const entryIndex = parseInt(btn.getAttribute('data-entry-index'), 10);
            const mi = parseInt(btn.getAttribute('data-member'), 10);
            const entry = entries[entryIndex];
            const member = entry?.members?.[mi];
            if (!entry || !member?.build) return;
            loadCalcTeamMember(bestTeamsTargetId, entry, member);
        });
    });
}

function loadCalcTeamMember(sideId, entry, member) {
    if (!member?.build?.build) return;
    const side = sideId === 2 ? 2 : 1;
    pinnedCalcTeams[side] = {
        name: entry.name,
        format: entry.format,
        members: entry.members.map(m => ({ ...m }))
    };
    importPokePaste(side, member.build.build, { silent: true });
    renderCalcTeamTrays();
    closeCalcBestTeams();
    const sideLabel = side === 1 ? 'Attacker' : 'Defender';
    showToast(`${member.species} → ${sideLabel} (${entry.name})`);
}

function renderCalcTeamTrays() {
    [1, 2].forEach(sideId => {
        const tray = document.getElementById(`p${sideId}-team-tray`);
        if (!tray) return;
        const pinned = pinnedCalcTeams[sideId];
        if (!pinned?.members?.length) {
            tray.hidden = true;
            tray.innerHTML = '';
            return;
        }

        const pk = sideId === 1 ? p1 : p2;
        const activeName = (pk?.name || '').toLowerCase();
        tray.hidden = false;
        tray.innerHTML = pinned.members.map((m, mi) => {
            const isActive = !m.missing && m.species && m.species.toLowerCase() === activeName;
            return `
                <button type="button" class="calc-team-tray__mon ${isActive ? 'is-active' : ''}" data-tray-member="${mi}"
                    ${m.missing || !m.build ? 'disabled' : ''}
                    title="${(m.species || '').replace(/"/g, '&quot;')}${m.item ? ' @ ' + m.item.replace(/"/g, '&quot;') : ''}">
                    <img class="calc-team-tray__sprite" src="${calcSpeciesSpriteUrl(m.missing ? '' : m.species)}" alt=""
                        onerror="handleSpriteError(this, '${(m.species || '').replace(/'/g, "\\'")}', false)">
                    <span class="calc-team-tray__name">${(m.species || '—').replace(/</g, '&lt;')}</span>
                </button>`;
        }).join('');

        tray.querySelectorAll('[data-tray-member]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mi = parseInt(btn.getAttribute('data-tray-member'), 10);
                const member = pinnedCalcTeams[sideId]?.members?.[mi];
                if (!member?.build?.build) return;
                importPokePaste(sideId, member.build.build, { silent: true });
                renderCalcTeamTrays();
                showToast(`${member.species} → ${sideId === 1 ? 'Attacker' : 'Defender'}`);
            });
        });
    });
}

function importPokePaste(id, paste, opts = {}) {
    const pk = id === 1 ? p1 : p2;
    const lines = paste.split('\n').map(l => l.trim()).filter(l => !!l);
    if (!lines.length) return;
    if (!opts.silent) {
        pinnedCalcTeams[id] = null;
        renderCalcTeamTrays();
    }

    try {
        const head = lines[0];
        const itemSplit = head.split('@');
        let itemPart = 'None';
        if (itemSplit[1]) itemPart = itemSplit[1].trim();

        let namePart = itemSplit[0].trim();
        const brackets = [];
        const bracketRegex = /\(([^)]+)\)/g;
        let match;
        while ((match = bracketRegex.exec(namePart)) !== null) {
            brackets.push(match[1].trim());
        }

        let mainName = namePart.split('(')[0].trim();
        let speciesName = mainName;

        if (brackets.length === 2) {
            speciesName = brackets[0];
        } else if (brackets.length === 1) {
            const b = brackets[0];
            if (b !== 'M' && b !== 'F') speciesName = b;
        }

        if (!pokemonDB.some(entry => entry.Name === speciesName)) {
            showToast(`Unknown Pokémon: ${speciesName}`);
            return;
        }

        pk.level = 50;
        pk.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        pk.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        pk.boosts = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        pk.nature = 'Hardy';
        pk.item = 'None';
        pk.status = 'Healthy';
        pk.tera = false;
        pk.teraType = 'Normal';
        pk.hpPercent = 100;
        pk.alliesFainted = 0;
        pk.timesHit = 0;
        pk.abilityActive = false;
        pk.itemEnabled = true;
        pk.shiny = false;
        pk.moves = Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false }));
        loadPokemon(id, speciesName, { preserveSet: true, preservePinned: true, silent: true });
        pk.item = itemPart;

        lines.slice(1).forEach(l => {
            const line = l.trim();
            if (line.match(/^Ability\s*:/i)) pk.ability = line.split(':')[1].trim();
            else if (line.match(/^Level\s*:/i)) pk.level = parseInt(line.split(':')[1].trim());
            else if (line.match(/^Shiny\s*:\s*Yes/i)) pk.shiny = true;
            else if (line.match(/^Tera Type\s*:/i)) pk.teraType = line.split(':')[1].trim();
            else if (line.match(/^EVs\s*:/i)) {
                line.split(':')[1].split('/').forEach(p => {
                    const matchObj = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                    if (matchObj) {
                        let key = matchObj[2].toLowerCase();
                        if (key === 'hp') key = 'hp';
                        else if (key === 'atk') key = 'atk';
                        else if (key === 'def') key = 'def';
                        else if (key === 'spa' || key === 'spatk' || key === 'satk') key = 'spa';
                        else if (key === 'spd' || key === 'spdef' || key === 'sdef') key = 'spd';
                        else if (key === 'spe' || key === 'speed') key = 'spe';
                        if (pk.evs[key] !== undefined) pk.evs[key] = parseInt(matchObj[1]);
                    }
                });
            } else if (line.match(/^IVs\s*:/i)) {
                line.split(':')[1].split('/').forEach(p => {
                    const matchObj = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                    if (matchObj) {
                        let key = matchObj[2].toLowerCase();
                        if (key === 'hp') key = 'hp';
                        else if (key === 'atk') key = 'atk';
                        else if (key === 'def') key = 'def';
                        else if (key === 'spa' || key === 'spatk' || key === 'satk') key = 'spa';
                        else if (key === 'spd' || key === 'spdef' || key === 'sdef') key = 'spd';
                        else if (key === 'spe' || key === 'speed') key = 'spe';
                        if (pk.ivs[key] !== undefined) pk.ivs[key] = parseInt(matchObj[1]);
                    }
                });
            } else if (line.toLowerCase().endsWith('nature')) pk.nature = line.substring(0, line.length - 6).trim();
            else if (line.startsWith('-')) {
                const moveName = line.substring(1).trim();
                const emptyIdx = pk.moves.findIndex(m => m.name === 'None');
                if (emptyIdx !== -1) {
                    const mData = movesDB.find(m => m.name.toLowerCase() === moveName.toLowerCase());
                    if (mData) {
                        pk.moves[emptyIdx] = BattleCalc.MoveIndex.createMoveState(mData.name, {
                            crit: false,
                            ...(isMultiHitMove(mData.name) ? { hits: getDefaultHitCount(mData.name, pk) } : {})
                        });
                        if (!pk.moves[emptyIdx]?.name || pk.moves[emptyIdx].name === 'None') {
                            pk.moves[emptyIdx] = {
                                name: mData.name,
                                basePower: parseInt(mData.power, 10) || 0,
                                type: mData.type || 'Normal',
                                category: mData.damage_class || mData.category || 'Physical',
                                crit: false,
                                ...(isMultiHitMove(mData.name) ? { hits: getDefaultHitCount(mData.name, pk) } : {})
                            };
                        }
                    }
                }
            }
        });

        if (typeof coerceEvsForMode === 'function') {
            pk.evs = coerceEvsForMode(pk.evs, isChampionsMode);
        } else if (isChampionsMode) {
            const maxEv = Math.max(...['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(k => pk.evs[k] || 0));
            pk.evs = maxEv > 32 ? convertEvsToChampions(pk.evs) : clampEvsForMode(pk.evs, true);
        } else {
            pk.evs = clampEvsForMode(pk.evs, false);
        }

        populatePokemonUI(pk);
        clampPokemonEvs(pk);
        updateStatsUI(pk);
        recalculate();
        if (pinnedCalcTeams[1] || pinnedCalcTeams[2]) renderCalcTeamTrays();
        if (!opts.silent) showToast("Import successful!");
    } catch (e) {
        console.error("Import error", e);
        showToast("Failed to parse PokePaste!");
    }
}

function populateDropdowns() {
    const typeList = TYPE_LIST;
    ['p1-type1', 'p1-type2', 'p1-tera-type', 'p2-type1', 'p2-type2', 'p2-tera-type'].forEach(s => {
        document.getElementById(s).innerHTML = typeList.map(t => `<option value="${t}">${t}</option>`).join('');
    });

    const natureList = Object.keys(natures);
    ['p1-nature', 'p2-nature'].forEach(s => {
        document.getElementById(s).innerHTML = natureList.map(n => `<option value="${n}">${n}</option>`).join('');
    });

    populateItemSelects();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return console.log("Toast:", msg);
    t.innerText = msg || '';
    if (!msg) {
        t.classList.remove('active');
        return;
    }
    t.classList.add('active');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('active'), 3000);
}

window.toggleChampionsMode = toggleChampionsMode;
window.updateMove = updateMove;
window.updateMoveField = updateMoveField;
window.updateHits = updateHits;
window.toggleCrit = toggleCrit;
window.selectMove = selectMove;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.copyExportPaste = copyExportPaste;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.openCalcBestTeams = openCalcBestTeams;
window.closeCalcBestTeams = closeCalcBestTeams;
window.handleSpriteError = function (img, name, shiny) {
    if (!name || img.dataset.fallbackState === 'final' || img.dataset.fallback === 'true') return;

    const clean = name.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    const isMegaURL = img.src && (img.src.includes('mega') || img.src.includes('primal')) && !img.src.includes('assets/');

    if (!img.dataset.fallbackState && isMegaURL) {
        img.dataset.fallbackState = '1';
        if (typeof MegaSprites !== 'undefined' && MegaSprites.applyLocalMegaFallback(img, name)) {
            return;
        }
        let suffix = 'mega';
        if (img.src.includes('mega-x') || img.src.includes('megax')) suffix = 'mega-x';
        else if (img.src.includes('mega-y') || img.src.includes('megay')) suffix = 'mega-y';
        else if (img.src.includes('mega-z') || img.src.includes('megaz')) suffix = 'mega-z';

        const hasSuffix = clean.endsWith(suffix) || clean.endsWith(suffix.replace('-', ''));
        const fileName = hasSuffix ? clean : `${clean}-${suffix}`;
        img.src = `../assets/mega-sprites/${fileName}.gif`;
        
        if (img.classList.contains('mega-toggle')) img.dataset.mega = img.src;
        return;
    }

    img.dataset.fallbackState = 'final';
    img.dataset.fallback = 'true';
    img.classList.remove('mega-toggle');
    const folder = shiny ? 'xy-shiny' : 'xy';
    img.src = `https://www.smogon.com/dex/media/sprites/${folder}/${clean}.gif`;
}



function getMegaSpriteUrl(p) {
    if (!p || !p.name || !p.item) return null;
    // Only resolve mega art when the loaded species is already mega/primal.
    const n = p.name;
    if (!n.includes('-Mega') && !n.includes('-Primal')) return null;

    if (typeof MegaSprites !== 'undefined') {
        const resolved = MegaSprites.resolveMegaSpriteUrl(p.name, p.item, { shiny: !!p.shiny, preferLocal: true });
        if (resolved) return resolved;
    }

    const it = p.item.toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = p.shiny ? 'ani-shiny' : 'ani';

    if (!it.endsWith('ite') && !it.endsWith('itex') && !it.endsWith('itey') && !it.endsWith('itez')) return null;
    if (it === 'eviolite' || it === 'meteorite') return null;

    let suffix = '-mega';
    if (it.endsWith('itex')) suffix = '-megax';
    else if (it.endsWith('itey')) suffix = '-megay';
    else if (it.endsWith('itez')) suffix = '-megaz';

    const clean = p.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    return `https://play.pokemonshowdown.com/sprites/${base}/${clean}${suffix}.gif`;
}

// Mega preview blinker removed — sprites must match the active forme only.

function getItemSpriteUrl(item) {
    if (!item || item.toLowerCase() === 'none') return '';
    const clean = item.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return `https://www.serebii.net/itemdex/sprites/sv/${clean}.png`;
}

window.handleItemError = function (img, item) {
    if (img.dataset.fallback === 'true' || !item) {
        img.style.display = 'none';
        return;
    }
    img.dataset.fallback = 'true';
    const clean = item.toLowerCase().replace(/[^a-z0-9]/g, '');
    img.src = `https://www.serebii.net/itemdex/sprites/${clean}.png`;
    img.style.display = 'block';
};

const MOBILE_CALC_TABS = ['results', 'p1', 'field', 'p2'];

function setMobileCalcTab(tab) {
    if (!MOBILE_CALC_TABS.includes(tab)) tab = 'results';
    document.body.classList.remove(...MOBILE_CALC_TABS.map(t => `calc-tab-${t}`));
    document.body.classList.add(`calc-tab-${tab}`);
    document.querySelectorAll('.calc-mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.calcTab === tab);
    });
    try { sessionStorage.setItem('calcMobileTab', tab); } catch (_) { /* ignore */ }
    window.scrollTo(0, 0);
}

function syncMobileSummary() {
    const line = document.getElementById('main-result')?.innerText || '';
    const speed = document.getElementById('speed-result')?.innerText || '';
    const ko = document.getElementById('ko-result')?.innerText || '';
    const lineEl = document.getElementById('mobile-line-mirror');
    const koEl = document.getElementById('mobile-ko-mirror');
    if (lineEl) {
        lineEl.textContent = [line, speed].filter(Boolean).join(' · ') || 'Select moves to see damage';
    }
    if (koEl) koEl.textContent = ko || '—';
}

function serializePokemon(pk) {
    return {
        n: pk.name,
        l: pk.level,
        a: pk.ability,
        i: pk.item,
        nat: pk.nature,
        t1: pk.type1,
        t2: pk.type2,
        tera: !!pk.tera,
        tt: pk.teraType,
        st: pk.status,
        hp: pk.hpPercent,
        af: pk.alliesFainted || 0,
        th: pk.timesHit || 0,
        aa: !!pk.abilityActive,
        ie: pk.itemEnabled !== false,
        ev: { ...pk.evs },
        iv: { ...pk.ivs },
        b: { ...pk.boosts },
        m: (pk.moves || []).map(mv => ({
            n: mv.name,
            c: !!mv.crit,
            h: mv.hits || undefined,
            r: !!mv.roundBoosted || undefined
        })),
        shiny: !!pk.shiny
    };
}

function applySerializedPokemon(id, data) {
    if (!data?.n) return;
    loadPokemon(id, data.n);
    const pk = id === 1 ? p1 : p2;
    if (data.l != null) pk.level = data.l;
    if (data.a) pk.ability = data.a;
    if (data.i) pk.item = data.i;
    if (data.nat) pk.nature = data.nat;
    if (data.t1) pk.type1 = data.t1;
    if (data.t2 != null) pk.type2 = data.t2;
    pk.tera = !!data.tera;
    if (data.tt) pk.teraType = data.tt;
    if (data.st) pk.status = data.st;
    if (data.hp != null) pk.hpPercent = data.hp;
    if (data.af != null) pk.alliesFainted = data.af;
    if (data.th != null) pk.timesHit = data.th;
    if (data.aa != null) pk.abilityActive = !!data.aa;
    if (data.ie != null) pk.itemEnabled = !!data.ie;
    if (data.ev) pk.evs = { ...pk.evs, ...data.ev };
    if (data.iv) pk.ivs = { ...pk.ivs, ...data.iv };
    if (data.b) pk.boosts = { ...pk.boosts, ...data.b };
    pk.shiny = !!data.shiny;
    if (Array.isArray(data.m)) {
        data.m.forEach((mv, idx) => {
            if (idx >= 4 || !mv?.n || mv.n === 'None') return;
            const rec = BattleCalc.MoveIndex.findInArray(movesDB, mv.n);
            if (rec) {
                pk.moves[idx] = BattleCalc.MoveIndex.createMoveState(rec.name, {
                    crit: !!mv.c,
                    ...(mv.h ? { hits: mv.h } : {}),
                    ...(mv.r ? { roundBoosted: true } : {})
                });
            }
        });
    }
    const lvl = document.getElementById(`p${id}-level`);
    if (lvl) lvl.value = pk.level;
    populatePokemonUI(pk);
}

function serializeField() {
    return {
        f: field.format,
        w: field.weather,
        t: field.terrain,
        g: !!field.gravity,
        mr: !!field.magicRoom,
        wr: !!field.wonderRoom,
        tr: !!field.trickRoom,
        r: { ...field.ruins },
        s1: { ...field.side1 },
        s2: { ...field.side2 }
    };
}

function applySerializedField(data) {
    if (!data) return;
    if (data.f) field.format = data.f;
    if (data.w) field.weather = data.w;
    if (data.t) field.terrain = data.t;
    field.gravity = !!data.g;
    field.magicRoom = !!data.mr;
    field.wonderRoom = !!data.wr;
    field.trickRoom = !!data.tr;
    if (data.r) field.ruins = { ...field.ruins, ...data.r };
    if (data.s1) field.side1 = { ...field.side1, ...data.s1 };
    if (data.s2) field.side2 = { ...field.side2, ...data.s2 };
    syncFieldUIFromState();
}

function syncFieldUIFromState() {
    const panel = document.getElementById('field-panel');
    if (!panel) return;

    const singles = document.getElementById('f-singles');
    const doubles = document.getElementById('f-doubles');
    if (singles && doubles) {
        singles.classList.toggle('active', field.format === 'Singles');
        doubles.classList.toggle('active', field.format === 'Doubles');
    }
    panel.querySelectorAll('[data-weather]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-weather') === field.weather);
    });
    panel.querySelectorAll('[data-terrain]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-terrain') === field.terrain);
    });

    const mechMap = {
        Gravity: field.gravity,
        'Magic Room': field.magicRoom,
        'Wonder Room': field.wonderRoom,
        'Trick Room': field.trickRoom
    };
    Object.entries(mechMap).forEach(([effect, on]) => {
        panel.querySelectorAll(`[data-effect="${effect}"]`).forEach(btn => {
            if (!btn.closest('.side-controls')) btn.classList.toggle('active', !!on);
        });
    });

    Object.entries(field.ruins || {}).forEach(([key, on]) => {
        panel.querySelectorAll(`[data-ruin="${key}"]`).forEach(btn => btn.classList.toggle('active', !!on));
    });

    ['side1', 'side2'].forEach((sideKey, i) => {
        const sidePanel = document.querySelectorAll('.sides-row .side-controls')[i];
        if (!sidePanel) return;
        const side = field[sideKey] || {};
        const effectMap = {
            Reflect: side.reflect,
            'Light Screen': side.lightScreen,
            'Aurora Veil': side.auroraVeil,
            Protect: side.protect,
            'Helping Hand': side.helpingHand,
            'Friend Guard': side.friendGuard,
            Battery: side.battery,
            'Power Spot': side.powerSpot,
            'Steely Spirit': side.steelySpirit,
            Protosynthesis: side.protosynthesis,
            'Quark Drive': side.quarkDrive,
            'Leech Seed': side.leechSeed,
            Tailwind: side.tailwind,
            'Stealth Rock': side.stealthRock
        };
        Object.entries(effectMap).forEach(([effect, on]) => {
            sidePanel.querySelectorAll(`[data-effect="${effect}"]`).forEach(btn => {
                if (!btn.classList.contains('spikes-btn')) btn.classList.toggle('active', !!on);
            });
        });
        sidePanel.querySelectorAll('.spikes-btn').forEach(btn => {
            const count = parseInt(btn.getAttribute('data-count') || '0', 10);
            btn.classList.toggle('active', count === (side.spikes || 0));
        });
    });
}

function encodeCalcState() {
    const payload = {
        v: 1,
        p1: serializePokemon(p1),
        p2: serializePokemon(p2),
        field: serializeField(),
        sm1: selectedMoveIdx1,
        sm2: selectedMoveIdx2,
        champs: typeof isChampionsMode === 'boolean' ? isChampionsMode : true
    };
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCalcState(token) {
    try {
        const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
        const json = decodeURIComponent(escape(atob(b64 + pad)));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

async function shareCalcLink() {
    if (!p1?.name || !p2?.name) {
        showToast('Load both Pokémon first');
        return;
    }
    const token = encodeCalcState();
    const longUrl = `${location.origin}${location.pathname}#calc=${token}`;
    try {
        showToast('Creating short calc link…');
        const shortUrl = await createShortShareUrl(longUrl);
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shortUrl);
            showToast('Short calc link copied');
        } else {
            prompt('Copy this calc link:', shortUrl);
        }
    } catch (error) {
        showToast(error.message || 'Could not create a short calc link');
    }
}

function copyCalcResult() {
    const main = document.getElementById('main-result')?.innerText || '';
    const speed = document.getElementById('speed-result')?.innerText || '';
    const sub = document.getElementById('sub-result')?.innerText || '';
    const ko = document.getElementById('ko-result')?.innerText || '';
    const text = [main, speed, sub, ko].filter(Boolean).join('\n');
    if (!text || main.includes('Select moves')) {
        showToast('No result to copy');
        return;
    }
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('Result copied')).catch(() => showToast('Copy failed'));
    } else {
        prompt('Copy result:', text);
    }
}

function tryLoadCalcFromHash() {
    const hash = location.hash || '';
    const m = hash.match(/#calc=([A-Za-z0-9_-]+)/);
    if (!m) return false;
    const data = decodeCalcState(m[1]);
    if (!data?.p1 || !data?.p2) return false;
    applySerializedPokemon(1, data.p1);
    applySerializedPokemon(2, data.p2);
    applySerializedField(data.field);
    if (typeof data.champs === 'boolean' && typeof isChampionsMode === 'boolean' && data.champs !== isChampionsMode) {
        toggleChampionsMode();
    }
    selectedMoveIdx1 = data.sm1 ?? -1;
    selectedMoveIdx2 = data.sm2 ?? -1;
    updateFieldState();
    recalculate();
    showToast('Shared calc loaded');
    return true;
}

window.shareCalcLink = shareCalcLink;
window.copyCalcResult = copyCalcResult;

function swapCalcSides() {
    if (!p1 || !p2) return;
    const tmp = p1;
    p1 = p2;
    p2 = tmp;
    p1.id = 1;
    p2.id = 2;
    window.p1 = p1;
    window.p2 = p2;
    const tmpMove = selectedMoveIdx1;
    selectedMoveIdx1 = selectedMoveIdx2;
    selectedMoveIdx2 = tmpMove;
    populatePokemonUI(p1);
    populatePokemonUI(p2);
    const s1 = document.getElementById('p1-search');
    const s2 = document.getElementById('p2-search');
    if (s1) s1.value = p1.name || '';
    if (s2) s2.value = p2.name || '';
    const tmpTeam = pinnedCalcTeams[1];
    pinnedCalcTeams[1] = pinnedCalcTeams[2];
    pinnedCalcTeams[2] = tmpTeam;
    renderCalcTeamTrays();
    recalculate();
    showToast('Sides swapped');
}

function getEmptySideState() {
    return {
        reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false,
        protect: false, helpingHand: false, friendGuard: false, battery: false, powerSpot: false,
        steelySpirit: false, protosynthesis: false, quarkDrive: false, leechSeed: false, tailwind: false
    };
}

function resetFieldConditions() {
    field.weather = 'None';
    field.terrain = 'None';
    field.gravity = false;
    field.magicRoom = false;
    field.wonderRoom = false;
    field.trickRoom = false;
    field.ruins = { tablets: false, vessel: false, sword: false, beads: false };
    field.side1 = getEmptySideState();
    field.side2 = getEmptySideState();
    syncFieldUIFromState();
    updateFieldState();
    recalculate();
    showToast('Field reset');
}

function resetCalcSide(id, opts = {}) {
    const pk = id === 1 ? p1 : p2;
    if (!pk) return;
    const speciesName = pk.name;
    clearPokemonSetState(pk);
    if (speciesName) loadPokemon(id, speciesName, { preserveSet: true, preservePinned: true, silent: true });

    pinnedCalcTeams[id] = null;
    renderCalcTeamTrays();
    field[id === 1 ? 'side1' : 'side2'] = getEmptySideState();
    syncFieldUIFromState();
    updateFieldState();

    if (!opts.silent) {
        recalculate();
        showToast(`${pk.name || 'Side ' + id} fully reset`);
    }
}

function resetBothSides() {
    resetCalcSide(1, { silent: true });
    resetCalcSide(2, { silent: true });
    recalculate();
    showToast('Both sides reset');
}

function getMoveAccuracy(move, attacker, fieldState) {
    if (!move?.name || move.name === 'None') return 100;
    const rec = BattleCalc.MoveIndex.findInArray(movesDB, move.name);
    let acc = rec?.accuracy;
    if (acc == null || acc === true || acc === -1) return 100;
    acc = Number(acc);
    if (!Number.isFinite(acc) || acc <= 0) return 100;

    const nameKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const weather = fieldState?.weather || 'None';
    if ((nameKey === 'thunder' || nameKey === 'hurricane') && (weather === 'Rain' || weather === 'Heavy Rain')) return 100;
    if ((nameKey === 'thunder' || nameKey === 'hurricane') && (weather === 'Sun' || weather === 'Harsh Sun')) return Math.min(acc, 50);
    if (nameKey === 'blizzard' && (weather === 'Snow' || weather === 'Hail')) return 100;
    if (fieldState?.gravity) {
        acc = Math.min(100, Math.floor(acc * 5 / 3));
    }
    if ((attacker?.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'compoundeyes') {
        acc = Math.min(100, Math.floor(acc * 1.3));
    }
    return Math.max(1, Math.min(100, acc));
}

function getAccuracyAdjustedKo(rolls, hp, move, attacker, fieldState) {
    const baseLabel = getKOChance(rolls, hp);
    if (!baseLabel || baseLabel === 'No data' || baseLabel === 'No immediate KO') return '';

    const acc = getMoveAccuracy(move, attacker, fieldState);
    if (acc >= 100) return `Acc-adjusted: ${baseLabel} (100% acc)`;

    const hit = acc / 100;
    const ohkoCount = rolls.filter(r => r >= hp).length;
    if (ohkoCount > 0) {
        const ohkoProb = ohkoCount / rolls.length;
        const adj = ohkoProb * hit * 100;
        const label = adj >= 99.95 ? 'Guaranteed OHKO' : `${adj.toFixed(1)}% chance to OHKO`;
        return `Acc-adjusted (${acc}%): ${label}`;
    }

    let twoHKOCount = 0;
    for (let i = 0; i < rolls.length; i++) {
        for (let j = 0; j < rolls.length; j++) {
            if (rolls[i] + rolls[j] >= hp) twoHKOCount++;
        }
    }
    const total2 = rolls.length * rolls.length;
    if (twoHKOCount > 0) {
        const twoProb = twoHKOCount / total2;
        // Both hits must connect for a true 2HKO sequence
        const adj = twoProb * hit * hit * 100;
        const label = adj >= 99.95 ? 'Guaranteed 2HKO' : `${adj.toFixed(1)}% chance to 2HKO`;
        return `Acc-adjusted (${acc}%): ${label}`;
    }

    let threeHKOCount = 0;
    for (let i = 0; i < rolls.length; i++) {
        for (let j = 0; j < rolls.length; j++) {
            for (let k = 0; k < rolls.length; k++) {
                if (rolls[i] + rolls[j] + rolls[k] >= hp) threeHKOCount++;
            }
        }
    }
    const total3 = Math.pow(rolls.length, 3);
    if (threeHKOCount > 0) {
        const threeProb = threeHKOCount / total3;
        const adj = threeProb * hit * hit * hit * 100;
        const label = adj >= 99.95 ? 'Guaranteed 3HKO' : `${adj.toFixed(1)}% chance to 3HKO`;
        return `Acc-adjusted (${acc}%): ${label}`;
    }
    return '';
}

function getSelectedCalcContext() {
    if (!p1 || !p2) return null;
    let attacker = p1;
    let defender = p2;
    let moveIdx = selectedMoveIdx1;
    if (selectedMoveIdx1 >= 0 && p1.moves[selectedMoveIdx1]?.name !== 'None') {
        attacker = p1;
        defender = p2;
        moveIdx = selectedMoveIdx1;
    } else if (selectedMoveIdx2 >= 0 && p2.moves[selectedMoveIdx2]?.name !== 'None') {
        attacker = p2;
        defender = p1;
        moveIdx = selectedMoveIdx2;
    } else {
        const p1Hit = p1.moves.findIndex(m => m?.name && m.name !== 'None' && (m.basePower > 0 || m.category !== 'Status'));
        const p2Hit = p2.moves.findIndex(m => m?.name && m.name !== 'None' && (m.basePower > 0 || m.category !== 'Status'));
        if (p1Hit >= 0) {
            attacker = p1;
            defender = p2;
            moveIdx = p1Hit;
        } else if (p2Hit >= 0) {
            attacker = p2;
            defender = p1;
            moveIdx = p2Hit;
        } else {
            return null;
        }
    }
    const move = attacker.moves[moveIdx];
    if (!move || move.name === 'None') return null;
    return { attacker, defender, move, moveIdx };
}

function clonePkForCalc(pk) {
    return {
        ...pk,
        baseStats: { ...pk.baseStats },
        stats: { ...pk.stats },
        ivs: { ...pk.ivs },
        evs: { ...pk.evs },
        boosts: { ...pk.boosts },
        moves: (pk.moves || []).map(m => ({ ...m }))
    };
}

function evBudgetUsed(evs, exceptKey) {
    return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((sum, k) => {
        if (k === exceptKey) return sum;
        return sum + (parseInt(evs[k], 10) || 0);
    }, 0);
}

function rollsGuaranteeOhko(rolls, hp) {
    return rolls.length > 0 && rolls.every(r => r >= hp);
}

function rollsGuarantee2hko(rolls, hp) {
    if (!rolls.length) return false;
    const min = rolls[0];
    return min * 2 >= hp;
}

function rollsCanOhko(rolls, hp) {
    return rolls.some(r => r >= hp);
}

let _evFinderPending = null;

function runEvFinder() {
    const ctx = getSelectedCalcContext();
    const out = document.getElementById('ev-finder-result');
    const applyBtn = document.getElementById('ev-finder-apply');
    if (applyBtn) applyBtn.disabled = true;
    _evFinderPending = null;

    if (!ctx) {
        if (out) out.textContent = 'Select a damaging move first.';
        return;
    }

    const goal = document.getElementById('ev-finder-goal')?.value || 'ohko';
    const limits = getEvLimits();
    const attacker = clonePkForCalc(ctx.attacker);
    const defender = clonePkForCalc(ctx.defender);
    const move = { ...ctx.move };
    const cat = (move.category || '').toLowerCase();
    const isSpecial = cat === 'special';
    const atkKey = isSpecial ? 'spa' : 'atk';
    const defKey = isSpecial ? 'spd' : 'def';

    syncBattleStats(attacker);
    syncBattleStats(defender);

    if (goal === 'ohko' || goal === '2hko') {
        const otherUsed = evBudgetUsed(attacker.evs, atkKey);
        const maxForStat = Math.min(limits.maxStat, Math.max(0, limits.maxTotal - otherUsed));
        let found = null;
        for (let ev = 0; ev <= maxForStat; ev++) {
            attacker.evs[atkKey] = ev;
            syncBattleStats(attacker);
            const res = calculateDamage(attacker, defender, move, field);
            const hp = res.effectiveHp ?? getEffectiveHp(defender);
            const ok = goal === 'ohko'
                ? rollsGuaranteeOhko(res.rolls, hp)
                : rollsGuarantee2hko(res.rolls, hp);
            if (ok) {
                found = { side: attacker.id, key: atkKey, ev, label: goal.toUpperCase() };
                break;
            }
        }
        if (!found) {
            if (out) {
                out.textContent = `Cannot ${goal.toUpperCase()} even at ${maxForStat} ${atkKey.toUpperCase()} EV (budget left).`;
            }
            return;
        }
        _evFinderPending = found;
        if (applyBtn) applyBtn.disabled = false;
        if (out) {
            out.textContent = `${found.ev} ${found.key.toUpperCase()} EV → guaranteed ${found.label} (${ctx.attacker.name} ${move.name})`;
        }
        return;
    }

    // Defensive: minimize HP then Def/SpD to live
    const liveOhko = goal === 'live-ohko';
    const atkClone = clonePkForCalc(ctx.attacker);
    syncBattleStats(atkClone);
    let best = null;

    const hpOther = evBudgetUsed(defender.evs, 'hp');
    const maxHp = Math.min(limits.maxStat, Math.max(0, limits.maxTotal - hpOther));

    for (let hpEv = 0; hpEv <= maxHp; hpEv++) {
        const defOtherBase = evBudgetUsed({ ...defender.evs, hp: hpEv }, defKey);
        const maxDef = Math.min(limits.maxStat, Math.max(0, limits.maxTotal - defOtherBase));
        for (let defEv = 0; defEv <= maxDef; defEv++) {
            defender.evs.hp = hpEv;
            defender.evs[defKey] = defEv;
            syncBattleStats(defender);
            const res = calculateDamage(atkClone, defender, move, field);
            const hp = res.effectiveHp ?? getEffectiveHp(defender);

            let survives;
            if (liveOhko) {
                survives = !rollsCanOhko(res.rolls, hp);
            } else {
                let can2 = false;
                for (let i = 0; i < res.rolls.length && !can2; i++) {
                    for (let j = 0; j < res.rolls.length; j++) {
                        if (res.rolls[i] + res.rolls[j] >= hp) { can2 = true; break; }
                    }
                }
                survives = !can2;
            }

            if (survives) {
                const total = hpEv + defEv;
                if (!best || total < best.total || (total === best.total && hpEv < best.hpEv)) {
                    best = { side: defender.id, hpEv, defEv, defKey, total };
                }
                break; // min defEv for this hpEv
            }
        }
        if (best && best.defEv === 0 && best.hpEv <= hpEv) {
            // Already found a pure-HP solution; further HP only costs more
            if (best.hpEv < hpEv) break;
        }
    }

    if (!best) {
        if (out) out.textContent = `Cannot live with current ${limits.maxStat}/${limits.maxTotal} EV limits.`;
        return;
    }

    _evFinderPending = {
        side: best.side,
        mode: 'bulk',
        hpEv: best.hpEv,
        defKey: best.defKey,
        defEv: best.defEv
    };
    if (applyBtn) applyBtn.disabled = false;
    if (out) {
        out.textContent = `${best.hpEv} HP / ${best.defEv} ${best.defKey.toUpperCase()} EV → lives ${liveOhko ? 'OHKO' : '2HKO'} from ${move.name}`;
    }
}

function applyEvFinderResult() {
    if (!_evFinderPending) return;
    const pending = _evFinderPending;
    const pk = pending.side === 1 ? p1 : p2;
    if (!pk) return;

    if (pending.mode === 'bulk') {
        pk.evs.hp = pending.hpEv;
        pk.evs[pending.defKey] = pending.defEv;
    } else {
        pk.evs[pending.key] = pending.ev;
    }
    clampPokemonEvs(pk);
    updateStatsUI(pk);
    populatePokemonUI(pk);
    recalculate();
    showToast('EV spread applied');
}

function buildTempPokemonFromSpecies(name, paste) {
    const data = pokemonDB.find(x => x.Name === name);
    if (!data) return null;
    const pk = setupPokemonState(99);
    pk.name = data.Name;
    pk.type1 = data.Type_1;
    pk.type2 = data.Type_2 || 'None';
    pk.baseStats = {
        hp: parseInt(data.HP) || 0,
        atk: parseInt(data.Attack) || 0,
        def: parseInt(data.Defense) || 0,
        spa: parseInt(data['Sp.Atk']) || 0,
        spd: parseInt(data['Sp.Def']) || 0,
        spe: parseInt(data.Speed) || 0,
        weight: parseFloat(data['Weight{kg}']) || 10.0
    };
    pk.ability = Array.isArray(data.Ability) ? data.Ability[0] : (data.Ability || 'None');
    pk.level = p1?.level || 50;

    if (paste) {
        const lines = paste.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines[0]) {
            const itemSplit = lines[0].split('@');
            if (itemSplit[1]) pk.item = itemSplit[1].trim();
        }
        lines.slice(1).forEach(line => {
            if (line.match(/^Ability\s*:/i)) pk.ability = line.split(':')[1].trim();
            else if (line.match(/^Level\s*:/i)) pk.level = parseInt(line.split(':')[1].trim(), 10) || pk.level;
            else if (line.match(/^Tera Type\s*:/i)) pk.teraType = line.split(':')[1].trim();
            else if (line.match(/^EVs\s*:/i)) {
                line.split(':')[1].split('/').forEach(p => {
                    const m = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                    if (!m) return;
                    let key = m[2].toLowerCase();
                    if (key === 'spatk' || key === 'satk') key = 'spa';
                    else if (key === 'spdef' || key === 'sdef') key = 'spd';
                    else if (key === 'speed') key = 'spe';
                    if (pk.evs[key] !== undefined) pk.evs[key] = parseInt(m[1], 10);
                });
            } else if (line.match(/^IVs\s*:/i)) {
                line.split(':')[1].split('/').forEach(p => {
                    const m = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                    if (!m) return;
                    let key = m[2].toLowerCase();
                    if (key === 'spatk' || key === 'satk') key = 'spa';
                    else if (key === 'spdef' || key === 'sdef') key = 'spd';
                    else if (key === 'speed') key = 'spe';
                    if (pk.ivs[key] !== undefined) pk.ivs[key] = parseInt(m[1], 10);
                });
            } else if (line.toLowerCase().endsWith('nature')) {
                pk.nature = line.substring(0, line.length - 6).trim();
            } else if (line.startsWith('-')) {
                const moveName = line.substring(1).trim();
                const emptyIdx = pk.moves.findIndex(m => m.name === 'None');
                if (emptyIdx === -1) return;
                const mData = movesDB.find(m => m.name.toLowerCase() === moveName.toLowerCase());
                if (!mData) return;
                pk.moves[emptyIdx] = BattleCalc.MoveIndex.createMoveState(mData.name, { crit: false });
            }
        });
        if (typeof coerceEvsForMode === 'function') {
            pk.evs = coerceEvsForMode(pk.evs, isChampionsMode);
        } else {
            clampPokemonEvs(pk);
        }
    }
    syncBattleStats(pk);
    return pk;
}

function runCalcVsMeta() {
    const list = document.getElementById('calc-vs-meta-list');
    const ctx = getSelectedCalcContext();
    if (!list) return;
    if (!ctx) {
        list.innerHTML = `<p class="calc-vs-meta-empty">Select a damaging move first.</p>`;
        return;
    }

    const count = parseInt(document.getElementById('calc-vs-meta-count')?.value, 10) || 12;
    const names = (topMetaNames.length ? topMetaNames : []).slice(0, count);
    if (!names.length) {
        list.innerHTML = `<p class="calc-vs-meta-empty">No meta list loaded for ${field.format}.</p>`;
        return;
    }

    const attacker = clonePkForCalc(ctx.attacker);
    syncBattleStats(attacker);
    const move = { ...ctx.move };
    const format = field.format || 'Doubles';

    const rows = names.map((name, idx) => {
        const latest = typeof findLatestBuildForSpecies === 'function'
            ? findLatestBuildForSpecies(name, format, buildsDB)
            : null;
        const defender = buildTempPokemonFromSpecies(name, latest?.build || null);
        if (!defender) return null;
        defender.id = ctx.defender.id;
        const res = calculateDamage(attacker, defender, move, field);
        const hp = res.effectiveHp ?? getEffectiveHp(defender);
        const ko = getKOChance(res.rolls, hp);
        return {
            rank: idx + 1,
            name,
            dmg: `${res.minPercent}–${res.maxPercent}%`,
            ko: ko || '—',
            build: !!latest?.build
        };
    }).filter(Boolean);

    if (!rows.length) {
        list.innerHTML = `<p class="calc-vs-meta-empty">Could not build meta targets.</p>`;
        return;
    }

    list.innerHTML = rows.map(r => `
        <div class="calc-vs-meta-row" title="${r.build ? 'Using library build' : 'Base species stats'}">
            <span class="cvm-name">#${r.rank} ${r.name}${r.build ? '' : ' · base'}</span>
            <span class="cvm-dmg">${r.dmg}</span>
            <span class="cvm-ko">${r.ko}</span>
        </div>
    `).join('');
}

window.resetFieldConditions = resetFieldConditions;
window.resetCalcSide = resetCalcSide;
window.resetBothSides = resetBothSides;
window.runEvFinder = runEvFinder;
window.applyEvFinderResult = applyEvFinderResult;
window.runCalcVsMeta = runCalcVsMeta;

function initMobileCalcNav() {
    let tab = 'results';
    try { tab = sessionStorage.getItem('calcMobileTab') || 'results'; } catch (_) { /* ignore */ }
    if (!MOBILE_CALC_TABS.includes(tab)) tab = 'results';
    setMobileCalcTab(tab);
    syncMobileSummary();
}

init();
initMobileCalcNav();
