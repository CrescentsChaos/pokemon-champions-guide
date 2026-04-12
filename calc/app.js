// State Management
let pokemonDB = [];
let movesDB = [];
let itemsDB = [];
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
    'Hardy': [1,1,1,1,1], 'Lonely': [1.1, 0.9, 1, 1, 1], 'Brave': [1.1, 1, 1, 1, 0.9], 'Adamant': [1.1, 1, 0.9, 1, 1], 'Naughty': [1.1, 1, 1, 0.9, 1],
    'Bold': [0.9, 1.1, 1, 1, 1], 'Docile': [1,1,1,1,1], 'Relaxed': [1, 1.1, 1, 1, 0.9], 'Impish': [1, 1.1, 0.9, 1, 1], 'Lax': [1, 1.1, 1, 0.9, 1],
    'Timid': [0.9, 1, 1, 1, 1.1], 'Hasty': [1, 0.9, 1, 1, 1.1], 'Serious': [1,1,1,1,1], 'Jolly': [1, 1, 0.9, 1, 1.1], 'Naive': [1, 1, 1, 0.9, 1.1],
    'Modest': [0.9, 1, 1.1, 1, 1], 'Mild': [1, 0.9, 1.1, 1, 1], 'Quiet': [1, 1, 1.1, 1, 0.9], 'Bashful': [1,1,1,1,1], 'Rash': [1, 1, 1.1, 0.9, 1],
    'Calm': [0.9, 1, 1, 1.1, 1], 'Gentle': [1, 0.9, 1, 1.1, 1], 'Sassy': [1, 1, 1, 1.1, 0.9], 'Careful': [1, 1, 0.9, 1.1, 1], 'Quirky': [1,1,1,1,1]
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
        const [pkmn, mvs, itms] = await Promise.all([
            fetch('../assets/pokemon.json').then(res => res.json()),
            fetch('../assets/moves.json').then(res => res.json()),
            fetch('../assets/items.json').then(res => res.json())
        ]);
        pokemonDB = pkmn;
        movesDB = mvs;
        itemsDB = itms;

        p1 = setupPokemonState(1);
        p2 = setupPokemonState(2);
        
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
        level: 100, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
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

        document.getElementById(`${p}-search`).addEventListener('input', (e) => handleSearch(p, e.target.value));
        
        document.getElementById(`${p}-level`).addEventListener('change', (e) => {
            pk.level = parseInt(e.target.value) || 100;
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
                }

                if (field === 'ability' || field === 'item') updateStatsUI(pk);
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
}

function handleSearch(p, query) {
    const resultsDiv = document.getElementById(`${p}-search-results`);
    if (!query || query.length < 2) {
        resultsDiv.classList.remove('active');
        return;
    }
    
    const excludeMegas = document.getElementById('exclude-megas-calc').checked;
    const filtered = pokemonDB.filter(x => {
        const matches = (x.Name || '').toLowerCase().includes(query.toLowerCase());
        if (excludeMegas && (x.Name || '').includes('-Mega')) return false;
        return matches;
    }).slice(0, 10);
    
    resultsDiv.innerHTML = filtered.map(x => `<div class="search-item" onclick="loadPokemon(${p === 'p1' ? 1 : 2}, '${x.Name.replace(/'/g, "\\'")}')">${x.Name}</div>`).join('');
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
        spa: parseInt(data['Sp.Atk']), spd: parseInt(data['Sp.Def']), spe: parseInt(data.Speed)
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
    
    const moveContainer = document.getElementById(`${p}-moves`);
    moveContainer.innerHTML = Array(4).fill().map((_, i) => {
        const move = pk.moves[i];
        const mData = movesDB.find(m => m.name === move.name);
        // Multi-hit moves detection
        const isMulti = mData && (mData.name === 'Bullet Seed' || mData.name === 'Water Shuriken' || mData.name === 'Icicle Spear' || mData.name === 'Rock Blast' || mData.name === 'Pin Missile' || mData.name === 'Population Bomb' || mData.name === 'Dual Wingbeat' || mData.name === 'Surging Strikes' || mData.name === 'Bonemerang' || mData.name === 'Dragon Dart' || mData.name === 'Double Iron Bash');
        
        return `
        <div class="move-row">
            <select class="move-selector" onchange="updateMove(${pk.id}, ${i}, this.value)">
                <option value="None">None</option>
                ${movesDB.map(m => `<option value="${m.name}" ${move.name === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${isMulti ? `
                <select class="hits-select" onchange="updateHits(${pk.id}, ${i}, this.value)">
                    ${[2,3,4,5,10].map(h => `<option value="${h}" ${move.hits == h ? 'selected' : ''}>${h} hits</option>`).join('')}
                </select>` : ''}
                <label class="crit-label"><input type="checkbox" onchange="toggleCrit(${pk.id}, ${i}, this.checked)" ${move.crit ? 'checked' : ''}> Crit</label>
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
        const total = calculateStat(k, base, iv, ev, pk.level, pk.nature);
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
                    <select onchange="updateStatVal(${pk.id}, '${k}', 'boosts', this.value)" style="width: 50px; background: rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:4px; font-size: 0.75rem;">
                        ${[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(b => `<option value="${b}" ${boost == b ? 'selected' : ''}>${b > 0 ? '+' : ''}${b}</option>`).join('')}
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

function calculateStat(k, base, iv, ev, level, nature) {
    if (k === 'hp') {
        if (base === 1) return 1;
        return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    const val = Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5));
    const natureMod = getNaturesMod(nature, k);
    return Math.floor(val * natureMod);
}

function getNaturesMod(natureName, stat) {
    const n = natures[natureName];
    if (!n) return 1;
    const map = { atk:0, def:1, spa:2, spd:3, spe:4 };
    return n[map[stat]] || 1;
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
        const avg = rolls.reduce((a,b) => a+b, 0) / rolls.length;
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
        if (isSpecial && defSide.lightScreen) modifier *= (field.format === 'Doubles' ? 2/3 : 0.5);
        if (!isSpecial && defSide.reflect) modifier *= (field.format === 'Doubles' ? 2/3 : 0.5);
    }
    
    // 7. Life Orb
    if (item === 'life orb') modifier *= 1.3;

    // --- Damage Rolls ---
    let rolls = [];
    for (let i = 85; i <= 100; i++) {
        let r = Math.floor(baseDamage * i / 100);
        r = Math.floor(r * modifier);
        rolls.push(r);
    }

    // Protection Check
    const defSide = defender.id === 1 ? field.side1 : field.side2;
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
    const lines = paste.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return;

    try {
        // Line 1: Name @ Item
        const line1 = lines[0];
        const namePart = line1.split('@')[0].split('(')[0].trim();
        const itemPart = line1.includes('@') ? line1.split('@')[1].trim() : 'None';
        
        loadPokemon(id, namePart);
        pk.item = itemPart;

        lines.slice(1).forEach(line => {
            if (line.startsWith('Ability:')) pk.ability = line.replace('Ability:', '').trim();
            else if (line.startsWith('Level:')) pk.level = parseInt(line.replace('Level:', '')) || 100;
            else if (line.startsWith('Tera Type:')) pk.teraType = line.replace('Tera Type:', '').trim();
            else if (line.startsWith('EVs:')) {
                const evs = line.replace('EVs:', '').split('/');
                evs.forEach(ev => {
                    const [val, stat] = ev.trim().split(' ');
                    const key = stat.toLowerCase().replace('sp.atk', 'spa').replace('sp.def', 'spd').replace('spe', 'spe').replace('spd', 'spd').replace('atk', 'atk').replace('def', 'def').replace('hp', 'hp');
                    if (pk.evs[key] !== undefined) pk.evs[key] = parseInt(val) || 0;
                });
            }
            else if (line.endsWith('Nature')) pk.nature = line.replace('Nature', '').trim();
            else if (line.startsWith('IVs:')) {
                const ivs = line.replace('IVs:', '').split('/');
                ivs.forEach(iv => {
                    const [val, stat] = iv.trim().split(' ');
                    const key = stat.toLowerCase().replace('sp.atk', 'spa').replace('sp.def', 'spd').replace('spe', 'spe').replace('spd', 'spd').replace('atk', 'atk').replace('def', 'def').replace('hp', 'hp');
                    if (pk.ivs[key] !== undefined) pk.ivs[key] = parseInt(val) || 0;
                });
            }
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
    t.innerText = msg;
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 3000);
}

document.getElementById('exclude-megas-calc').addEventListener('change', recalculate);

init();
