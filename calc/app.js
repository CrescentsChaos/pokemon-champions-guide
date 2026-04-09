// State Management
let pokemonDB = [];
let movesDB = [];
let itemsDB = [];
let p1 = null;
let p2 = null;
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
        nature: 'Hardy', ability: 'None', item: 'None', status: 'Healthy',
        type1: 'None', type2: 'None', tera: false, teraType: 'Normal',
        moves: Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false }))
    };
}

function setupEventListeners() {
    // Search inputs
    ['p1', 'p2'].forEach(p => {
        const input = document.getElementById(`${p}-search`);
        input.addEventListener('input', (e) => handleSearch(p, e.target.value));
        
        // Level
        document.getElementById(`${p}-level`).addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if (p === 'p1') p1.level = val; else p2.level = val;
            updateStatsUI(p === 'p1' ? p1 : p2);
            recalculate();
        });

        // Nature, Ability, Item, Status
        ['nature', 'ability', 'item', 'status'].forEach(field => {
            document.getElementById(`${p}-${field}`).addEventListener('change', (e) => {
                const pk = p === 'p1' ? p1 : p2;
                pk[field] = e.target.value;
                updateStatsUI(pk);
                recalculate();
            });
        });
        
        // Tera
        document.getElementById(`${p}-tera`).addEventListener('change', (e) => {
            const pk = p === 'p1' ? p1 : p2;
            pk.tera = e.target.checked;
            recalculate();
        });
    });

    // Field Buttons
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
    
    // Auto populate ability
    pk.ability = data.Abilities?.[0] || 'None';
    
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
    
    const abilitySelect = document.getElementById(`${p}-ability`);
    // Ideally we'd map real abilities, for now just load from DB entry
    const pkData = pokemonDB.find(x => x.Name === pk.name);
    const abilities = [pkData.Ability_1, pkData.Ability_2, pkData.Ability_Hidden].filter(x => x && x !== 'None');
    abilitySelect.innerHTML = abilities.map(a => `<option value="${a}">${a}</option>`).join('');
    
    const moveContainer = document.getElementById(`${p}-moves`);
    moveContainer.innerHTML = Array(4).fill().map((_, i) => `
        <div class="move-row">
            <select class="move-selector" onchange="updateMove(${pk.id}, ${i}, this.value)">
                <option value="None">None</option>
                ${movesDB.map(m => `<option value="${m.Name}">${m.Name}</option>`).join('')}
            </select>
            <label class="crit-label"><input type="checkbox" onchange="toggleCrit(${pk.id}, ${i}, this.checked)"> Crit</label>
        </div>
    `).join('');
}

function updateMove(pId, idx, moveName) {
    const pk = pId === 1 ? p1 : p2;
    const mData = movesDB.find(x => x.Name === moveName);
    if (mData) {
        pk.moves[idx] = {
            name: mData.Name, basePower: parseInt(mData.Power) || 0,
            type: mData.Type, category: mData.Category
        };
    } else {
        pk.moves[idx] = { name: 'None', basePower: 0, type: 'Normal', category: 'Physical' };
    }
    recalculate();
}

function updateStatsUI(pk) {
    const p = pk.id === 1 ? 'p1' : 'p2';
    const tbody = document.getElementById(`${p}-stats`);
    const statsKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    
    tbody.innerHTML = statsKeys.map(k => {
        const base = pk.baseStats[k];
        const iv = pk.ivs[k];
        const ev = pk.evs[k];
        const total = calculateStat(k, base, iv, ev, pk.level, pk.nature);
        pk.stats[k] = total;
        
        return `
            <tr>
                <td class="stat-label">${k.toUpperCase()}</td>
                <td>${base}</td>
                <td><input type="number" value="${iv}" onchange="updateStatVal(${pk.id}, '${k}', 'ivs', this.value)"></td>
                <td><input type="number" value="${ev}" onchange="updateStatVal(${pk.id}, '${k}', 'evs', this.value)"></td>
                <td class="stat-total" id="${p}-${k}-total">${total}</td>
            </tr>
        `;
    }).join('');
}

function updateStatVal(id, k, type, val) {
    const pk = id === 1 ? p1 : p2;
    pk[type][k] = parseInt(val) || 0;
    updateStatsUI(pk);
    recalculate();
}

function calculateStat(k, base, iv, ev, level, nature) {
    if (k === 'hp') {
        if (base === 1) return 1; // Shedinja
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
    
    const results = p1.moves.map(m => {
        if (m.name === 'None') return null;
        return calculateDamage(p1, p2, m, field);
    }).filter(x => x);

    const banner = document.getElementById('main-result');
    const subBanner = document.getElementById('sub-result');
    
    if (results.length === 0) {
        banner.innerText = "Select moves to see results";
        subBanner.innerText = "(Select an attacker move)";
        return;
    }

    const res = results[0]; // For now just show the first move select
    banner.innerText = `${p1.name} ${res.move} vs ${p2.name}: ${res.minPercent}% - ${res.maxPercent}%`;
    subBanner.innerText = `Damage rolls: (${res.rolls.join(', ')})`;
}

function calculateDamage(attacker, defender, move, field) {
    if (move.basePower === 0) return { minPercent: 0, maxPercent: 0, rolls: [0], move: move.name };
    
    // Core Formula: Damage = ((((2 * Level / 5) + 2) * Power * A / D) / 50) + 2
    const level = attacker.level;
    const isSpecial = move.category === 'Special';
    let power = move.basePower;
    let atk = isSpecial ? attacker.stats.spa : attacker.stats.atk;
    let def = isSpecial ? defender.stats.spd : defender.stats.def;

    // Field & Item Modifiers (Simplified for now)
    let modifier = 1;
    
    // STAB
    if (move.type === attacker.type1 || move.type === attacker.type2) modifier *= 1.5;
    
    // Type Effectiveness
    let eff = 1;
    const defTypes = [defender.type1, defender.type2];
    defTypes.forEach(t => {
        const interaction = typeChart[move.type.toLowerCase()]?.[t.toLowerCase()];
        if (interaction !== undefined) eff *= interaction;
    });
    modifier *= eff;

    if (eff === 0) return { minPercent: 0, maxPercent: 0, rolls: [0], move: move.name };

    // Weather
    if (field.weather === 'Sun' && move.type === 'Fire') modifier *= 1.5;
    if (field.weather === 'Sun' && move.type === 'Water') modifier *= 0.5;
    if (field.weather === 'Rain' && move.type === 'Water') modifier *= 1.5;
    if (field.weather === 'Rain' && move.type === 'Fire') modifier *= 0.5;

    const baseDamage = Math.floor(Math.floor(Math.floor((2 * level / 5 + 2) * power * atk / def) / 50) + 2);
    
    const rolls = [];
    for (let i = 85; i <= 100; i++) {
        const roll = Math.floor(baseDamage * i / 100 * modifier);
        rolls.push(roll);
    }
    
    const min = rolls[0];
    const max = rolls[rolls.length - 1];
    const defHp = defender.stats.hp;

    return {
        move: move.name,
        minPercent: (min / defHp * 100).toFixed(1),
        maxPercent: (max / defHp * 100).toFixed(1),
        rolls: rolls
    };
}

function updateFieldState() {
    field.format = document.getElementById('f-doubles').classList.contains('active') ? 'Doubles' : 'Singles';
    const activeWeather = document.querySelector('[data-weather].active');
    field.weather = activeWeather ? activeWeather.getAttribute('data-weather') : 'None';
    const activeTerrain = document.querySelector('[data-terrain].active');
    field.terrain = activeTerrain ? activeTerrain.getAttribute('data-terrain') : 'None';
}

function populateDropdowns() {
    const typeList = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
    const selects = ['p1-type1', 'p1-type2', 'p1-tera-type', 'p2-type1', 'p2-type2', 'p2-tera-type'];
    selects.forEach(s => {
        const el = document.getElementById(s);
        el.innerHTML = typeList.map(t => `<option value="${t}">${t}</option>`).join('');
    });

    const natureList = Object.keys(natures);
    ['p1-nature', 'p2-nature'].forEach(s => {
        const el = document.getElementById(s);
        el.innerHTML = natureList.map(n => `<option value="${n}">${n}</option>`).join('');
    });

    // Populate items - simplified
    const itemOpts = itemsDB.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
    ['p1-item', 'p2-item'].forEach(s => {
        document.getElementById(s).innerHTML = `<option value="None">None</option>` + itemOpts;
    });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 3000);
}

document.getElementById('exclude-megas-calc').addEventListener('change', recalculate);

init();
