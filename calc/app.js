// State Management
let pokemonDB = [];
let movesDB = [];
let itemsDB = [];
let buildsDB = [];
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
    format: 'Singles',
    weather: 'None',
    terrain: 'None',
    gravity: false,
    magicRoom: false,
    wonderRoom: false,
    ruins: { tablets: false, vessel: false, sword: false, beads: false },
    side1: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false, leechSeed: false, tailwind: false },
    side2: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false, leechSeed: false, tailwind: false }
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
    if (!itemSprite) return;
    if (pk.item && pk.item !== 'None') {
        itemSprite.src = getItemSpriteUrl(pk.item);
        itemSprite.style.display = 'block';
        itemSprite.dataset.fallback = '';
    } else {
        itemSprite.style.display = 'none';
        itemSprite.src = '';
    }
}


// Initialize
async function init() {
    try {
        const [pkmn, mvs, itms, blds] = await Promise.all([
            fetch('../assets/pokemon.json').then(res => res.json()),
            fetch('../assets/moves.json').then(res => res.json()),
            fetch('../assets/items.json').then(res => res.json()),
            fetch('../assets/builds.json').then(res => res.json())
        ]);
        pokemonDB = pkmn;
        movesDB = mvs;
        itemsDB = itms;
        buildsDB = blds;
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

        // Load defaults — Champions meta pair, not the same species twice
        const meta = topMetaNames.length ? topMetaNames : ['Garchomp', 'Mimikyu'];
        loadPokemon(1, meta[0] || 'Garchomp');
        loadPokemon(2, meta[1] || meta[0] || 'Mimikyu');
        syncChampionsModeButton();

        recalculate();
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
                if (forme && forme !== pk.name) loadPokemon(id, forme);
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
                        loadPokemon(id, nextForm);
                        return;
                    }
                    updateItemSprite(pk);
                    updateMegaButtonVisibility(pk);
                }

                if (field === 'ability' || field === 'item' || field === 'nature') updateStatsUI(pk);
                recalculate();
            });
        });


        document.getElementById(`${p}-tera`).addEventListener('change', (e) => {
            pk.tera = e.target.checked;
            if (pk.name.startsWith("Terapagos") && pk.name !== "Terapagos") {
                const target = (pk.tera && pk.teraType === "Stellar") ? "Terapagos-Stellar" : "Terapagos-Terastal";
                if (pk.name !== target) {
                    loadPokemon(id, target);
                    return; // loadPokemon calls recalculate
                }
            }
            recalculate();
        });

        document.getElementById(`${p}-tera-type`).addEventListener('change', (e) => {
            pk.teraType = e.target.value;
            if (pk.name.startsWith("Terapagos") && pk.name !== "Terapagos") {
                const target = (pk.tera && pk.teraType === "Stellar") ? "Terapagos-Stellar" : "Terapagos-Terastal";
                if (pk.name !== target) {
                    loadPokemon(id, target);
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

function loadPokemon(id, name) {
    const pk = id === 1 ? p1 : p2;
    const data = pokemonDB.find(x => x.Name === name);
    if (!data) return;

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
    recalculate();
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
        const megaUrl = getMegaSpriteUrl(pk);

        spriteImg.src = spriteUrl;
        spriteImg.dataset.base = spriteUrl;
        spriteImg.dataset.fallbackState = '';
        spriteImg.dataset.fallback = '';

        if (megaUrl) {
            spriteImg.dataset.mega = megaUrl;
            spriteImg.dataset.currentSrc = 'base';
            spriteImg.classList.add('mega-toggle');
        } else {
            spriteImg.classList.remove('mega-toggle');
        }
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
                    <input type="number" min="0" max="250" value="${move.basePower ?? 0}"
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
                <label class="crit-label">
                    <input type="checkbox" onchange="toggleCrit(${pk.id}, ${i}, this.checked)" ${move.crit ? 'checked' : ''}>
                    <span class="crit-text">CRIT</span>
                </label>
            </div>
        </div>`;
    }).join('');
}

function updateHits(pId, idx, hits) {
    const pk = pId === 1 ? p1 : p2;
    pk.moves[idx].hits = parseInt(hits, 10);
    recalculate();
}

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

function toggleMega(id) {
    const pk = id === 1 ? p1 : p2;
    const currentName = pk.name;
    const btn = document.getElementById(`p${id}-mega-toggle`);

    let targetName = "";
    if (currentName.includes("-Mega")) {
        // Revert to base
        targetName = currentName.split("-Mega")[0];
        btn.classList.remove('active');
    } else {
        // Try to find Mega
        const mega = pokemonDB.find(p => p.Name === currentName + "-Mega" || p.Name === currentName + "-Mega-X" || p.Name === currentName + "-Mega-Y");
        if (mega) {
            targetName = mega.Name;
            btn.classList.add('active');
        } else {
            showToast("No Mega form found for " + currentName);
            return;
        }
    }

    if (targetName) loadPokemon(id, targetName);
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

    if (targetName) loadPokemon(id, targetName);
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
    pk.moves[idx].crit = checked;
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
        : choiceItem === 'choice scarf' ? 'spe'
        : null;

    const side = pk.id === 1 ? field.side1 : field.side2;

    tbody.innerHTML = statsKeys.map(k => {
        const base = pk.baseStats[k] || 0;
        const iv = pk.ivs[k];
        const ev = pk.evs[k];
        const boost = pk.boosts[k] || 0;

        let displayTotal = pk.stats[k];
        if (k !== 'hp') {
            displayTotal = applyParadoxBoost(pk, displayTotal, k, field, side);
        }

        // Apply choice item visual multiplier
        const isChoiceBoosted = k !== 'hp' && k === choiceBoostStat;
        if (isChoiceBoosted) {
            displayTotal = Math.floor(displayTotal * 1.5);
        }

        const boostedTotal = k === 'hp' ? displayTotal : getBoostValue(displayTotal, boost);

        const choiceStyle = isChoiceBoosted
            ? 'color: #ffd76f; font-weight: 900; text-shadow: 0 0 8px rgba(255,200,80,0.6);'
            : '';
        const choiceTitle = isChoiceBoosted ? ` title="×1.5 from ${pk.item}"` : '';

        const evMax = isChampionsMode ? 32 : 252;
        const evStep = isChampionsMode ? 1 : 1;

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
                <td class="stat-total" id="${p}-${k}-total" style="${choiceStyle}"${choiceTitle}>${boostedTotal}</td>
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

    if (!res) {
        banner.innerText = "Select moves to see damage results";
        subBanner.innerText = "Damage rolls: (0)";
        koResult.innerText = '';
        return;
    }

    const attacker = attackerSide === 1 ? p1 : p2;
    const defender = attackerSide === 1 ? p2 : p1;
    const move = attacker.moves[moveIdx];
    const effHp = res.effectiveHp ?? getEffectiveHp(defender);
    const hazardNote = getHazardDamageFor(defender) > 0 ? ` (${effHp} HP after hazards)` : '';

    if (BattleCalc.formatShowdownLine && move) {
        banner.innerText = BattleCalc.formatShowdownLine(attacker, defender, move, res, field) + hazardNote;
    } else {
        const hitLabel = res.hitCount > 1 ? ` (${res.hitCount} hits)` : '';
        banner.innerText = `${attacker.name} ${res.move}${hitLabel} vs. ${defender.name}: ${res.minDmg ?? res.minPercent}-${res.maxDmg ?? res.maxPercent}%`;
    }
    subBanner.innerText = `Damage rolls: ${formatRollsDisplay(res.rolls)}`;

    koResult.innerText = getKOChance(res.rolls, effHp);
}


function renderMoveResults(p1Results, p2Results) {
    const p1Container = document.getElementById('p1-move-results');
    const p2Container = document.getElementById('p2-move-results');

    const renderSide = (pk, results, selectedIdx, sideId) => {
        return `<h4>${pk.name}'s Moves</h4>` + results.map((res, i) => {
            if (!res) return '';
            const active = selectedIdx === i ? 'active' : '';
            const dmg = res.minDmg != null ? `${res.minDmg}–${res.maxDmg}` : '';
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
                        <span class="dmg-pct">${res.minPercent}% – ${res.maxPercent}%</span>
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
    if (!getMegaSpriteUrl(pk)) return false;
    const base = pk.name.split('-Mega')[0];
    return pokemonDB.some(p =>
        p.Name === `${base}-Mega` || p.Name === `${base}-Mega-X` || p.Name === `${base}-Mega-Y` || p.Name === `${base}-Mega-Z`
    );
}

function updateMegaButtonVisibility(pk) {
    const btn = document.getElementById(`p${pk.id}-mega-toggle`);
    if (!btn) return;
    const show = canUseMegaEvolution(pk);
    btn.style.display = show ? 'inline-block' : 'none';
    if (!show) btn.classList.remove('active');
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

function importPokePaste(id, paste) {
    const pk = id === 1 ? p1 : p2;
    const lines = paste.split('\n').map(l => l.trim()).filter(l => !!l);
    if (!lines.length) return;

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

        loadPokemon(id, speciesName);
        pk.item = itemPart;
        pk.level = 50;
        pk.moves = Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false }));

        lines.slice(1).forEach(l => {
            const line = l.trim();
            if (line.match(/^Ability\s*:/i)) pk.ability = line.split(':')[1].trim();
            else if (line.match(/^Level\s*:/i)) pk.level = parseInt(line.split(':')[1].trim());
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
        showToast("Import successful!");
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
    t.innerText = msg;
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 3000);
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

setInterval(() => {
    document.querySelectorAll('img.mega-toggle').forEach(img => {
        if (img.dataset.fallback === 'true') {
            img.classList.remove('mega-toggle');
            return;
        }
        if (img.dataset.currentSrc !== 'mega') {
            img.src = img.dataset.mega;
            img.dataset.currentSrc = 'mega';
        } else {
            img.src = img.dataset.base;
            img.dataset.currentSrc = 'base';
        }
    });
}, 3000);

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
};;

init();
