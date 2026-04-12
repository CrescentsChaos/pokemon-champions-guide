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

let field = {
    format: 'Singles',
    weather: 'None',
    terrain: 'None',
    gravity: false,
    magicRoom: false,
    wonderRoom: false,
    side1: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false },
    side2: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false }
};

const natures = {
    'Hardy': [1, 1, 1, 1, 1], 'Lonely': [1.1, 0.9, 1, 1, 1], 'Brave': [1.1, 1, 1, 1, 0.9], 'Adamant': [1.1, 1, 0.9, 1, 1], 'Naughty': [1.1, 1, 1, 0.9, 1],
    'Bold': [0.9, 1.1, 1, 1, 1], 'Docile': [1, 1, 1, 1, 1], 'Relaxed': [1, 1.1, 1, 1, 0.9], 'Impish': [1, 1.1, 0.9, 1, 1], 'Lax': [1, 1.1, 1, 0.9, 1],
    'Timid': [0.9, 1, 1, 1, 1.1], 'Hasty': [1, 0.9, 1, 1, 1.1], 'Serious': [1, 1, 1, 1, 1], 'Jolly': [1, 1, 0.9, 1, 1.1], 'Naive': [1, 1, 1, 0.9, 1.1],
    'Modest': [0.9, 1, 1.1, 1, 1], 'Mild': [1, 0.9, 1.1, 1, 1], 'Quiet': [1, 1, 1.1, 1, 0.9], 'Bashful': [1, 1, 1, 1, 1], 'Rash': [1, 1, 1.1, 0.9, 1],
    'Calm': [0.9, 1, 1, 1.1, 1], 'Gentle': [1, 0.9, 1, 1.1, 1], 'Sassy': [1, 1, 1, 1.1, 0.9], 'Careful': [1, 1, 0.9, 1.1, 1], 'Quirky': [1, 1, 1, 1, 1]
};

const typeChart = {
    normal: { ghost: 0, rock: 0.5, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, fighting: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

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

        window.p1 = setupPokemonState(1);
        window.p2 = setupPokemonState(2);

        p1 = window.p1;
        p2 = window.p2;

        updateStatsUI(p1);
        updateStatsUI(p2);
        setupEventListeners();
        populateDropdowns();

        // Load defaults
        loadPokemon(1, 'Abomasnow');
        loadPokemon(2, 'Abomasnow');

        recalculate();
    } catch (e) {
        console.error("Load fail", e);
        showToast("Error loading game data!");
    }
}

function setupPokemonState(id) {
    return {
        id,
        name: '', baseStats: {}, stats: {},
        level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        nature: 'Hardy', ability: 'None', item: 'None', status: 'Healthy',
        type1: 'None', type2: 'None', tera: false, teraType: 'Normal',
        moves: Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false })),
        hpPercent: 100
    };
}

function setupEventListeners() {
    ['p1', 'p2'].forEach(p => {
        const id = p === 'p1' ? 1 : 2;
        const pk = id === 1 ? p1 : p2;

        const searchInput = document.getElementById(`${p}-search`);
        searchInput.addEventListener('input', (e) => handleSearch(p, e.target.value));
        
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

        document.getElementById(`${p}-hp-percent`).addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            pk.hpPercent = val;
            updateHPBar(id, val);
            recalculate();
        });

        ['nature', 'ability', 'item', 'status'].forEach(field => {
            const el = document.getElementById(`${p}-${field}`);
            const eventType = (field === 'ability' || field === 'item') ? 'input' : 'change';
            el.addEventListener(eventType, (e) => {
                pk[field] = e.target.value;

                // Handle Form Changes (Item-based)
                if (field === 'item') {
                    const nextForm = getPermanentForm(pk);
                    if (nextForm && nextForm !== pk.name) {
                        loadPokemon(id, nextForm);
                        return;
                    }
                    
                    // Update Item Sprite specifically
                    const itemSprite = document.getElementById(`${p}-item-sprite`);
                    if (itemSprite) {
                        if (pk.item && pk.item !== 'None') {
                            itemSprite.src = getItemSpriteUrl(pk.item);
                            itemSprite.style.display = 'block';
                        } else {
                            itemSprite.style.display = 'none';
                            itemSprite.src = '';
                        }
                    }
                }

                if (field === 'ability' || field === 'item' || field === 'nature') updateStatsUI(pk);
                recalculate();
            });
        });


        document.getElementById(`${p}-tera`).addEventListener('change', (e) => {
            pk.tera = e.target.checked;
            recalculate();
        });

        document.getElementById(`${p}-tera-type`).addEventListener('change', (e) => {
            pk.teraType = e.target.value;
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
            const parent = btn.parentElement;
            if (!btn.classList.contains('toggle-btn')) {
                parent.querySelectorAll('.field-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else {
                btn.classList.toggle('active');
            }
            updateFieldState();
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
            let top  = e.clientY + offset;

            // Flip left if overflowing right edge
            if (left + tipW > vw - 10) left = e.clientX - tipW - offset;
            // Flip up if overflowing bottom edge
            if (top + tipH > vh - 10) top = e.clientY - tipH - offset;

            pasteTooltip.style.left = left + 'px';
            pasteTooltip.style.top  = top  + 'px';
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

function handleSearch(p, query) {
    const resultsDiv = document.getElementById(`${p}-search-results`);
    if (!query || query.length < 2) {
        resultsDiv.classList.remove('active');
        return;
    }

    // Filter base pokemon matches
    const filteredDB = pokemonDB.filter(x => (x.Name || '').toLowerCase().includes(query.toLowerCase())).slice(0, 10);
    
    // All matching builds
    const rawBuilds = buildsDB.filter(b => (b.pokemon || '').toLowerCase().includes(query.toLowerCase()));

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

    let html = '';
    
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
    document.getElementById(`${p}-ability`).value = pk.ability;
    document.getElementById(`${p}-item`).value = pk.item;
    document.getElementById(`${p}-hp-percent`).value = pk.hpPercent;

    // Tera UI Sync
    document.getElementById(`${p}-tera`).checked = pk.tera || false;
    if (pk.teraType) document.getElementById(`${p}-tera-type`).value = pk.teraType;

    updateHPBar(pk.id, pk.hpPercent);

    const pkData = pokemonDB.find(x => x.Name === pk.name);
    if (pkData) {
        const abilities = getPokemonAbilities(pkData);
        document.getElementById(`${p}-abilities-list`).innerHTML = abilities.map(a => `<option value="${a}">`).join('');
    }

    // Item Sprite Sync
    const itemSprite = document.getElementById(`${p}-item-sprite`);
    if (itemSprite) {
        if (pk.item && pk.item !== 'None') {
            itemSprite.src = getItemSpriteUrl(pk.item);
            itemSprite.style.display = 'block';
        } else {
            itemSprite.style.display = 'none';
        }
    }

    // Sprite Sync
    const spriteImg = document.getElementById(`${p}-sprite`);
    if (spriteImg) {
        const clean = pk.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
        const base = pk.shiny ? 'ani-shiny' : 'ani';
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/${base}/${clean}.gif`;
        const megaUrl = getMegaSpriteUrl(pk);

        spriteImg.src = spriteUrl;
        spriteImg.dataset.base = spriteUrl;
        spriteImg.dataset.fallbackState = '0';
        spriteImg.dataset.fallback = 'false';

        if (megaUrl) {
            spriteImg.dataset.mega = megaUrl;
            spriteImg.dataset.currentSrc = 'base';
            spriteImg.classList.add('mega-toggle');
        } else {
            spriteImg.classList.remove('mega-toggle');
        }
    }

    const moveContainer = document.getElementById(`${p}-moves`);
    moveContainer.innerHTML = Array(4).fill().map((_, i) => {
        const move = pk.moves[i];
        const mData = movesDB.find(m => m.name === move.name);
        const isMulti = mData && (mData.name === 'Bullet Seed' || mData.name === 'Water Shuriken' || mData.name === 'Icicle Spear' || mData.name === 'Rock Blast' || mData.name === 'Pin Missile' || mData.name === 'Population Bomb' || mData.name === 'Dual Wingbeat' || mData.name === 'Surging Strikes' || mData.name === 'Bonemerang' || mData.name === 'Dragon Dart' || mData.name === 'Double Iron Bash');

        return `
        <div class="move-row">
            <select class="move-selector" onchange="updateMove(${pk.id}, ${i}, this.value)">
                <option value="None">None</option>
                ${movesDB.map(m => `<option value="${m.name}" ${move.name === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
            <div class="move-configs">
                ${isMulti ? `
                <select class="hits-select" onchange="updateHits(${pk.id}, ${i}, this.value)">
                    ${[2, 3, 4, 5, 10].map(h => `<option value="${h}" ${move.hits == h ? 'selected' : ''}>${h} hits</option>`).join('')}
                </select>` : ''}
                <label class="crit-label">
                    <input type="checkbox" onchange="toggleCrit(${pk.id}, ${i}, this.checked)" ${move.crit ? 'checked' : ''}> 
                    <span class="crit-text">CRIT</span>
                </label>
            </div>
        </div>
    `}).join('');
}

function updateHits(pId, idx, hits) {
    const pk = pId === 1 ? p1 : p2;
    pk.moves[idx].hits = parseInt(hits);
    recalculate();
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

function updateMove(pId, idx, moveName) {
    const pk = pId === 1 ? p1 : p2;
    const mData = movesDB.find(x => x.name === moveName);
    if (mData) {
        pk.moves[idx] = {
            name: mData.name, basePower: parseInt(mData.power) || 0,
            type: mData.type, category: mData.damage_class, crit: pk.moves[idx].crit
        };
    } else {
        pk.moves[idx] = { name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false };
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

    tbody.innerHTML = statsKeys.map(k => {
        const base = pk.baseStats[k] || 0;
        const iv = pk.ivs[k];
        const ev = pk.evs[k];
        const boost = pk.boosts[k] || 0;
        const total = calculateStat(base, iv, ev, pk.level, pk.nature, k);
        pk.stats[k] = total;

        const boostedTotal = k === 'hp' ? total : getBoostValue(total, boost);

        return `
            <tr>
                <td class="stat-label">${k.toUpperCase()}</td>
                <td>${base}</td>
                <td><input type="number" value="${iv}" onchange="updateStatVal(${pk.id}, '${k}', 'ivs', this.value)"></td>
                <td><input type="number" value="${ev}" onchange="updateStatVal(${pk.id}, '${k}', 'evs', this.value)"></td>
                <td>
                    ${k === 'hp' ? '' : `
                    <select onchange="updateStatVal(${pk.id}, '${k}', 'boosts', this.value)" class="boost-select">
                        ${[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(b => `<option value="${b}" ${boost == b ? 'selected' : ''}>${b > 0 ? '+' : ''}${b}</option>`).join('')}
                    </select>
                    `}
                </td>
                <td class="stat-total" id="${p}-${k}-total">${boostedTotal}</td>
            </tr>
        `;
    }).join('');
}

function getBoostValue(val, boost) {
    if (boost === 0) return val;
    if (boost > 0) return Math.floor(val * (2 + boost) / 2);
    return Math.floor(val * 2 / (2 + Math.abs(boost)));
}

function updateStatVal(id, k, type, val) {
    const pk = id === 1 ? p1 : p2;
    pk[type][k] = parseInt(val) || 0;
    updateStatsUI(pk);
    recalculate();
}

function recalculate() {
    if (!p1 || !p2) return;

    const p1Results = p1.moves.map(m => m.name !== 'None' ? calculateDamage(p1, p2, m, field) : null);
    const p2Results = p2.moves.map(m => m.name !== 'None' ? calculateDamage(p2, p1, m, field) : null);

    renderMoveResults(p1Results, p2Results);

    const res = p1Results[selectedMoveIdx1] || p2Results[selectedMoveIdx2];
    const banner = document.getElementById('main-result');
    const subBanner = document.getElementById('sub-result');

    if (!res) {
        banner.innerText = "Select moves to see results";
        subBanner.innerText = "(Select an attacker move)";
        return;
    }

    const attacker = res.attackerId === 1 ? p1 : p2;
    const defender = res.attackerId === 1 ? p2 : p1;
    banner.innerText = `${attacker.name} ${res.move} vs. ${defender.name}: ${res.minPercent}% - ${res.maxPercent}%`;
    subBanner.innerText = `Damage rolls: (${res.rolls.join(', ')})`;

    // KO Probability
    const koResult = document.getElementById('ko-result');
    const hp = defender.stats.hp * (defender.hpPercent / 100);
    const rolls = res.rolls;
    const ohkoCount = rolls.filter(r => r >= hp).length;
    const ohkoProb = (ohkoCount / rolls.length * 100).toFixed(1);

    if (ohkoProb > 0) {
        koResult.innerText = ohkoProb === "100.0" ? "Guaranteed OHKO" : `${ohkoProb}% chance to OHKO`;
    } else {
        // Check 2HKO (Simplified: average of roll sums)
        const avg = rolls.reduce((a, b) => a + b, 0) / rolls.length;
        if (avg * 2 >= hp) {
            koResult.innerText = "Possible 2HKO";
        } else {
            koResult.innerText = "Nice play! (No immediate KO)";
        }
    }
}

function renderMoveResults(p1Results, p2Results) {
    const p1Container = document.getElementById('p1-move-results');
    const p2Container = document.getElementById('p2-move-results');

    p1Container.innerHTML = `<h4>${p1.name}'s Moves</h4>` + p1Results.map((res, i) => {
        if (!res) return '';
        const active = selectedMoveIdx1 === i ? 'active' : '';
        return `
            <div class="result-move-box ${active}" onclick="selectMove(1, ${i})">
                <span class="move-name-summary">${res.move}</span>
                <span class="move-damage-summary">${res.minPercent}% - ${res.maxPercent}%</span>
            </div>
        `;
    }).join('');

    p2Container.innerHTML = `<h4>${p2.name}'s Moves</h4>` + p2Results.map((res, i) => {
        if (!res) return '';
        const active = selectedMoveIdx2 === i ? 'active' : '';
        return `
            <div class="result-move-box ${active}" onclick="selectMove(2, ${i})">
                <span class="move-name-summary">${res.move}</span>
                <span class="move-damage-summary">${res.minPercent}% - ${res.maxPercent}%</span>
            </div>
        `;
    }).join('');
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

function calculateDamage(attacker, defender, move, field) {
    const res = { move: move.name, attackerId: attacker.id, minPercent: 0, maxPercent: 0, rolls: [0] };
    if (move.basePower === 0) return res;

    const level = attacker.level;
    const isSpecial = move.category === 'Special';

    // --- Stats & Boosts ---
    let atkBoost = isSpecial ? attacker.boosts.spa : attacker.boosts.atk;
    let defBoost = isSpecial ? defender.boosts.spd : defender.boosts.def;

    // Critical hits ignore negative attack boosts and positive defense boosts
    if (move.crit) {
        if (atkBoost < 0) atkBoost = 0;
        if (defBoost > 0) defBoost = 0;
    }

    let rawAtk = isSpecial ? attacker.stats.spa : attacker.stats.atk;
    let rawDef = isSpecial ? defender.stats.spd : defender.stats.def;

    // --- Foul Play Mechanic ---
    if (move.name === 'Foul Play') {
        rawAtk = defender.stats.atk;
        atkBoost = defender.boosts.atk;
    }

    // --- Weather Stat Boosts ---
    if (field.weather === 'Snow' && (defender.type1 === 'Ice' || defender.type2 === 'Ice' || (defender.tera && defender.teraType === 'Ice')) && !isSpecial) {
        rawDef = Math.floor(rawDef * 1.5);
    }
    if (field.weather === 'Sand' && (defender.type1 === 'Rock' || defender.type2 === 'Rock' || (defender.tera && defender.teraType === 'Rock')) && isSpecial) {
        rawDef = Math.floor(rawDef * 1.5);
    }

    // --- Ability Stat Boosts ---
    if (attacker.ability === 'Huge Power' || attacker.ability === 'Pure Power') {
        if (!isSpecial) rawAtk *= 2;
    }
    if (attacker.ability === 'Guts' && attacker.status !== 'Healthy') {
        if (!isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    }
    // Flare Boost / Toxic Boost could go here too

    // Apply Items to raw stats
    const item = (attacker.item || '').toLowerCase();
    if (item === 'choice band' && !isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    if (item === 'choice specs' && isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    if (item === 'eviolite' && defender.name.includes('Line')) rawDef = Math.floor(rawDef * 1.5);

    let atk = getBoostValue(rawAtk, atkBoost);
    let def = getBoostValue(rawDef, defBoost);

    // --- Move BP Adjustments ---
    let basePower = move.basePower;

    // Status boosts
    if (move.name === 'Facade' && attacker.status !== 'Healthy') basePower = 140;
    if (move.name === 'Hex' && defender.status !== 'Healthy') basePower = 130;

    // HP-based moves (Eruption, Water Spout, Dragon Energy)
    if (['Eruption', 'Water Spout', 'Dragon Energy'].includes(move.name)) {
        const hpRatio = attacker.hpPercent / 100;
        basePower = Math.max(1, Math.floor(150 * hpRatio));
    }

    // HP-based moves (Reversal, Flail — power increases as HP lowers)
    if (['Reversal', 'Flail'].includes(move.name)) {
        const hpRatio = attacker.hpPercent / 100;
        if (hpRatio <= 0.0417) basePower = 200;
        else if (hpRatio <= 0.1042) basePower = 150;
        else if (hpRatio <= 0.2083) basePower = 100;
        else if (hpRatio <= 0.3542) basePower = 80;
        else if (hpRatio <= 0.6875) basePower = 40;
        else basePower = 20;
    }

    // Weight-based moves (Heavy Slam, Heat Crash)
    if (['Heavy Slam', 'Heat Crash'].includes(move.name)) {
        const atkWeight = attacker.baseStats?.weight || 10.0;
        const defWeight = defender.baseStats?.weight || 10.0;
        const ratio = atkWeight / defWeight;
        if (ratio >= 5) basePower = 120;
        else if (ratio >= 4) basePower = 100;
        else if (ratio >= 3) basePower = 80;
        else if (ratio >= 2) basePower = 60;
        else basePower = 40;
    }

    // Weight-based moves (Low Kick, Grass Knot — power based on defender weight)
    if (['Low Kick', 'Grass Knot'].includes(move.name)) {
        const defWeight = defender.baseStats?.weight || 10.0;
        if (defWeight >= 200.0) basePower = 120;
        else if (defWeight >= 100.0) basePower = 100;
        else if (defWeight >= 50.0) basePower = 80;
        else if (defWeight >= 25.0) basePower = 60;
        else if (defWeight >= 10.0) basePower = 40;
        else basePower = 20;
    }

    // Stored Power / Power Trip
    if (move.name === 'Stored Power' || move.name === 'Power Trip') {
        let positiveBoosts = 0;
        for (let k in attacker.boosts) {
            if (attacker.boosts[k] > 0) positiveBoosts += attacker.boosts[k];
        }
        basePower = 20 + (20 * positiveBoosts);
    }

    // Tera BP Boost (60 BP floor)
    if (attacker.tera && move.type === attacker.teraType && basePower < 60 && basePower > 0) {
        // Exclude Priority and Multi-hit from the 60 BP floor
        const isPriority = ['Quick Attack', 'Mach Punch', 'Aqua Jet', 'Ice Shard', 'Shadow Sneak', 'Sucker Punch', 'Fake Out', 'Bullet Punch', 'Vacuum Wave', 'Extreme Speed', 'Water Shuriken'].includes(move.name);
        if (!isPriority && !move.hits) {
            basePower = 60;
        }
    }


    // --- Base Damage Calculation ---
    let baseDamage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * atk / def) / 50) + 2;

    // --- Modifiers ---
    let modifier = 1.0;

    // 1. Weather
    if (field.weather === 'Sun') {
        if (move.type === 'Fire') modifier *= 1.5;
        if (move.type === 'Water') modifier *= 0.5;
    } else if (field.weather === 'Rain') {
        if (move.type === 'Water') modifier *= 1.5;
        if (move.type === 'Fire') modifier *= 0.5;
    }

    // 2. Critical Hit
    if (move.crit) modifier *= 1.5;

    // 3. STAB
    let stab = 1.0;
    let isOriginalSTAB = (move.type === attacker.type1 || move.type === attacker.type2);

    if (attacker.tera) {
        if (move.type === attacker.teraType) {
            stab = isOriginalSTAB ? 2.0 : 1.5;
            if (attacker.ability === 'Adaptability') stab = isOriginalSTAB ? 2.25 : 2.0;
        } else if (isOriginalSTAB) {
            stab = 1.5;
        }
    } else if (isOriginalSTAB) {
        stab = (attacker.ability === 'Adaptability') ? 2.0 : 1.5;
    }
    modifier *= stab;

    // 4. Type Effectiveness & Ability Immunities
    let typeMod = 1.0;
    const isMoldBreaker = attacker.ability === 'Mold Breaker';

    // Defender Tera Types
    let defTypes = [defender.type1, defender.type2].filter(t => t && t !== 'None');
    if (defender.tera) {
        defTypes = [defender.teraType];
    }

    // Calculate effectiveness first for Wonder Guard and Filter
    defTypes.forEach(t => {
        const interaction = typeChart[move.type.toLowerCase()]?.[t.toLowerCase()];
        if (interaction !== undefined) typeMod *= interaction;
    });

    // Ability-based Immunities
    if (!isMoldBreaker) {
        if (defender.ability === 'Wonder Guard' && typeMod <= 1 && move.type !== 'None') return res;
        if (defender.ability === 'Levitate' && move.type === 'Ground') return res;
        if (defender.ability === 'Flash Fire' && move.type === 'Fire') return res;
        if ((defender.ability === 'Water Absorb' || defender.ability === 'Storm Drain') && move.type === 'Water') return res;
        if ((defender.ability === 'Volt Absorb' || defender.ability === 'Lightning Rod') && move.type === 'Electric') return res;
        if (defender.ability === 'Sap Sipper' && move.type === 'Grass') return res;
        if (defender.ability === 'Earth Eater' && move.type === 'Ground') return res;
        if (defender.ability === 'Well-Baked Body' && move.type === 'Fire') return res;
    }

    // Filter/Solid Rock/Primal Armor
    if (!isMoldBreaker && typeMod > 1 && (defender.ability === 'Filter' || defender.ability === 'Solid Rock')) {
        modifier *= 0.75;
    }

    modifier *= typeMod;
    if (typeMod === 0) return res;

    // 5. Burn
    if (attacker.status === 'Burned' && !isSpecial && attacker.ability !== 'Guts') {
        modifier *= 0.5;
    }

    // 6. Screens
    const defSide = defender.id === 1 ? field.side1 : field.side2;
    if (!move.crit) {
        if (isSpecial && defSide.lightScreen) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
        if (!isSpecial && defSide.reflect) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
    }

    // 7. Life Orb
    if (item === 'life orb') modifier *= 1.3;

    // 8. Helping Hand
    const attackerSide = attacker.id === 1 ? field.side1 : field.side2;
    if (attackerSide.helpingHand) modifier *= 1.5;

    // --- Damage Rolls ---
    let rolls = [];
    for (let i = 85; i <= 100; i++) {
        let r = Math.floor(baseDamage * i / 100);
        r = Math.floor(r * modifier);
        rolls.push(r);
    }

    // Protection Check
    if (defSide.protect && attacker.ability !== 'Unseen Fist') {
        rolls = rolls.map(() => 0);
    }

    // Parental Bond Check
    if (attacker.ability === 'Parental Bond' && move.category !== 'Status') {
        rolls = rolls.map(r => r + Math.floor(r * 0.25));
    }

    // Multi-hit logic
    const hits = move.hits || 1;
    if (hits > 1) {
        rolls = rolls.map(r => r * hits);
    }

    const defHp = defender.stats.hp;
    res.minPercent = (rolls[0] / defHp * 100).toFixed(1);
    res.maxPercent = (rolls[15] / defHp * 100).toFixed(1);
    res.rolls = rolls;
    return res;
}

function updateFieldState() {
    field.format = document.getElementById('f-doubles').classList.contains('active') ? 'Doubles' : 'Singles';
    const activeWeather = document.querySelector('[data-weather].active');
    field.weather = activeWeather ? activeWeather.getAttribute('data-weather') : 'None';
    const activeTerrain = document.querySelector('[data-terrain].active');
    field.terrain = activeTerrain ? activeTerrain.getAttribute('data-terrain') : 'None';

    // Side Effects
    ['side1', 'side2'].forEach((side, i) => {
        const panel = document.querySelectorAll('.sides-row .side-controls')[i];
        if (panel) {
            const btns = panel.querySelectorAll('.field-btn.active');
            field[side] = {
                reflect: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Reflect'),
                lightScreen: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Light Screen'),
                auroraVeil: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Aurora Veil'),
                protect: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Protect'),
                helpingHand: Array.from(btns).some(b => b.getAttribute('data-effect') === 'Helping Hand'),
                spikes: parseInt(Array.from(btns).find(b => b.getAttribute('data-effect') === 'Spikes')?.getAttribute('data-count') || 0)
            };
        }
    });
}

function updateHPBar(id, percent) {
    const bar = document.getElementById(`p${id}-hp-bar`);
    bar.style.width = percent + '%';
    if (percent > 50) bar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    else if (percent > 20) bar.style.background = 'linear-gradient(90deg, #FFC107, #FFEB3B)';
    else bar.style.background = 'linear-gradient(90deg, #F44336, #E91E63)';
}

function openImportModal(id) {
    importTargetId = id;
    document.getElementById('import-target-label').innerText = `Importing for Pokemon ${id}`;
    document.getElementById('import-modal').classList.add('active');
    document.getElementById('paste-input').value = '';
    document.getElementById('paste-input').focus();
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
                        pk.moves[emptyIdx] = {
                            name: mData.name, basePower: parseInt(mData.power) || 0,
                            type: mData.type, category: mData.damage_class, crit: false
                        };
                    }
                }
            }
        });

        populatePokemonUI(pk);
        updateStatsUI(pk);
        recalculate();
        showToast("Import successful!");
    } catch (e) {
        console.error("Import error", e);
        showToast("Failed to parse PokePaste!");
    }
}

function populateDropdowns() {
    const typeList = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
    ['p1-type1', 'p1-type2', 'p1-tera-type', 'p2-type1', 'p2-type2', 'p2-tera-type'].forEach(s => {
        document.getElementById(s).innerHTML = typeList.map(t => `<option value="${t}">${t}</option>`).join('');
    });

    const natureList = Object.keys(natures);
    ['p1-nature', 'p2-nature'].forEach(s => {
        document.getElementById(s).innerHTML = natureList.map(n => `<option value="${n}">${n}</option>`).join('');
    });

    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = `<option value="None">` + itemsDB.map(i => `<option value="${i.name}">`).join('');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return console.log("Toast:", msg);
    t.innerText = msg;
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 3000);
}

window.handleSpriteError = function(img, name, shiny) {
    if (!name || img.dataset.fallbackState === 'final' || img.dataset.fallback === 'true') return;

    const clean = name.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    const isMegaURL = img.src && img.src.includes('mega') && !img.src.includes('assets/');

    if (!img.dataset.fallbackState && isMegaURL) {
        img.dataset.fallbackState = '1';
        let suffix = 'mega';
        if (img.src.includes('mega-x') || img.src.includes('megax')) suffix = 'mega-x';
        else if (img.src.includes('mega-y') || img.src.includes('megay')) suffix = 'mega-y';

        const hasSuffix = clean.endsWith(suffix) || clean.endsWith(suffix.replace('-', ''));
        const fileName = hasSuffix ? clean : `${clean}-${suffix}`;
        img.src = `../assets/mega-sprites/${fileName}.gif`;
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
    
    // Exclude permanent forms from Mega toggling if that function exists, 
    // but in calc we swap forms anyway. This is for visual sync.
    const it = p.item.toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = p.shiny ? 'ani-shiny' : 'ani';

    if (!it.endsWith('ite') && !it.endsWith('itex') && !it.endsWith('itey')) return null;
    if (it === 'eviolite' || it === 'meteorite') return null;

    let suffix = '-mega';
    if (it.endsWith('itex')) suffix = '-megax';
    else if (it.endsWith('itey')) suffix = '-megay';

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

window.handleItemError = function(img, item) {
    if (img.dataset.fallback === 'true' || !item) {
        img.style.display = 'none';
        return;
    }
    img.dataset.fallback = 'true';
    if (item.toLowerCase().endsWith('ite')) {
        const clean = item.toLowerCase().replace(/[^a-z0-9-]/g, '');
        img.src = `https://www.serebii.net/itemdex/sprites/pgl/${clean}.png`;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
};

init();
