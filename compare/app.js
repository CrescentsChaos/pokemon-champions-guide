let pokemonData = [];  // array of pokemon objects
let movesData = {};
let itemsData = [];

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
    type2: ''
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

        initMetaSelects();
        populateItemsList();
        setupSearchListeners();
        setupInputListeners();
        
        // Initial Empty Render
        renderStatsEditor(1);
        renderStatsEditor(2);
        updateComparison();

    } catch (e) {
        showToast("Error loading data");
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

        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            results.innerHTML = '';
            if (q.length < 2) return;

            results.innerHTML = filtered.map(x => `
                <div class="search-item" data-name="${x.Name}">
                    <span class="search-item-name">${x.Name}</span>
                    <span class="search-item-types">${x.Type_1}${x.Type_2 ? ' / ' + x.Type_2 : ''}</span>
                </div>
            `).join('');
            results.classList.add('active');
        });

        // Search Selection via Delegation
        results.addEventListener('click', (e) => {
            const item = e.target.closest('.search-item');
            if (item) {
                const name = item.getAttribute('data-name');
                input.value = name;
                results.innerHTML = '';
                results.classList.remove('active');
                selectPokemon(num, name);
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (e.target !== input) results.innerHTML = '';
        });
    });
}

function selectPokemon(num, species) {
    const pd = pokemonData.find(p => p.Name === species);
    if (!pd) return;

    const p = num === 1 ? p1 : p2;

    p.species = species;
    p.base = {
        hp:  pd.HP   || 0,
        atk: pd.Attack  || 0,
        def: pd.Defense || 0,
        spa: pd['Sp.Atk'] || 0,
        spd: pd['Sp.Def'] || 0,
        spe: pd.Speed   || 0
    };
    p.type1 = pd.Type_1;
    p.type2 = pd.Type_2 || '';

    // Update UI headers
    document.getElementById(`p${num}-search`).value = species;
    document.getElementById(`p${num}-type1`).value = p.type1;
    document.getElementById(`p${num}-type2`).value = p.type2 || '-';
    
    // Ability datalist
    const abList = document.getElementById(`p${num}-abilities-list`);
    abList.innerHTML = '';
    const abilities = getPokemonAbilities(pd);
    abilities.forEach(ab => {
        const opt = document.createElement('option');
        opt.value = ab;
        abList.appendChild(opt);
    });
    // Set first ability by default if none
    if (!p.ability && abilities.length > 0) {
        p.ability = abilities[0];
        document.getElementById(`p${num}-ability`).value = p.ability;
    }

    // Set sprite
    const img = document.getElementById(`p${num}-sprite`);
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    img.src = `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`;
    img.dataset.fallbackState = '0'; // reset error state

    recalcStats(num);
}

// Ensure the requested fallback for mega sprites
window.handleSpriteError = function(img, species, shiny, item) {
    if (!species || img.dataset.fallbackState === 'final') return;
    
    item = item || '';
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');

    // The user requested extra fallback for mega sprites located in assets/mega-sprites/{name}-{mega/megax/megay/megaz}.gif
    let isMega = false;
    let suffix = 'mega';
    const it = item.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (it.endsWith('ite') && it !== 'eviolite' && it !== 'meteorite') {
        isMega = true;
        if (it.endsWith('itex')) suffix = 'megax';
        else if (it.endsWith('itey')) suffix = 'megay';
    }

    if (!img.dataset.fallbackState || img.dataset.fallbackState === '0') {
        img.dataset.fallbackState = '1';
        if (isMega) {
            // First fallback if Mega Item is present: check local mega-sprites folder
            img.src = `../assets/mega-sprites/${clean}-${suffix}.gif`;
            return;
        }
    }

    if (img.dataset.fallbackState === '1') {
        img.dataset.fallbackState = 'final';
        // Second fallback: Smogon XY static sprites
        const folder = shiny ? 'xy-shiny' : 'xy';
        img.src = `https://www.smogon.com/dex/media/sprites/${folder}/${clean}.gif`;
    }
}


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
    p.ability = pd.Ability_1 || '';

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
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    img.dataset.fallbackState = '0';
    img.src = `https://play.pokemonshowdown.com/sprites/ani/${clean}${suffix}.gif`;
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

    STATS.forEach(stat => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td style="font-weight: bold; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">${STAT_NAMES[stat]}</td>
            <td style="text-align: center;">${p.base[stat] || 0}</td>
            <td style="text-align: center;">
                <input type="number" class="type-input" style="width: 60px; text-align: center; padding: 4px;" id="p${num}-ev-${stat}" value="${p.evs[stat]}" min="0" max="252" step="4">
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
            if (val > 252) val = 252;
            if (val < 0) val = 0;
            p.evs[stat] = val;
            e.target.value = val;
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
    if (!p.species) return;

    const level = p.level || 50;
    const nature = NATURES[p.nature] || NATURES['Serious'];

    STATS.forEach(stat => {
        const base = p.base[stat];
        const iv = p.ivs[stat];
        const ev = p.evs[stat];

        if (stat === 'hp') {
            if (base === 1) p.stats.hp = 1; // Shedinja
            else p.stats.hp = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
        } else {
            let val = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
            if (nature.plus === stat) val = Math.floor(val * 1.1);
            if (nature.minus === stat) val = Math.floor(val * 0.9);
            p.stats[stat] = val;
        }
    });

    renderStatsEditor(num);
    updateComparison();
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

// ------ MODAL / POKEPASTE IMPORTER ------
let currentImportNum = 1;

window.openImportModal = function(num) {
    currentImportNum = num;
    document.getElementById('import-target-label').textContent = `Importing for Build ${num === 1 ? 'A' : 'B'}`;
    const modal = document.getElementById('import-modal');
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.getElementById('paste-input').value = '';
    document.getElementById('paste-input').focus();
}

window.closeImportModal = function() {
    const modal = document.getElementById('import-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
}

document.getElementById('confirm-import').addEventListener('click', async () => {
    const text = document.getElementById('paste-input').value.trim();
    if (!text) return;
    
    let pasteText = text;
    // Check if URL
    if (text.startsWith('http')) {
        const btn = document.getElementById('confirm-import');
        btn.textContent = 'Fetching...';
        btn.disabled = true;
        try {
            const pasteId = text.split('/').pop().toUpperCase();
            if(!pasteId) throw new Error("Invalid Pokepaste URL");
            const res = await fetch(`https://pokepast.es/${pasteId}/json`);
            if(!res.ok) throw new Error("Could not load from pokepast.es");
            const data = await res.json();
            pasteText = data.paste || '';
        } catch (e) {
            console.error(e);
            showToast("Failed to fetch paste. Try pasting raw text.");
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

function importFromText(num, text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const p = num === 1 ? p1 : p2;
    
    try {
        // Line 1: Name @ Item
        const line1 = lines[0];
        const namePart = line1.split('@')[0].split('(')[0].trim();
        const itemPart = line1.includes('@') ? line1.split('@')[1].trim() : 'None';
        
        selectPokemon(num, namePart);
        p.item = itemPart;

        lines.slice(1).forEach(line => {
            if (line.startsWith('Ability:')) p.ability = line.replace('Ability:', '').trim();
            else if (line.startsWith('Level:')) p.level = parseInt(line.replace('Level:', '')) || 50;
            else if (line.startsWith('EVs:')) {
                const evs = line.replace('EVs:', '').split('/');
                evs.forEach(ev => {
                    const [val, stat] = ev.trim().split(' ');
                    const key = stat.toLowerCase().replace('sp.atk', 'spa').replace('sp.def', 'spd').replace('spe', 'spe').replace('spd', 'spd').replace('atk', 'atk').replace('def', 'def').replace('hp', 'hp');
                    if (p.evs[key] !== undefined) p.evs[key] = parseInt(val) || 0;
                });
            }
            else if (line.endsWith('Nature')) p.nature = line.replace('Nature', '').trim();
            else if (line.startsWith('IVs:')) {
                const ivs = line.replace('IVs:', '').split('/');
                ivs.forEach(iv => {
                    const [val, stat] = iv.trim().split(' ');
                    const key = stat.toLowerCase().replace('sp.atk', 'spa').replace('sp.def', 'spd').replace('spe', 'spe').replace('spd', 'spd').replace('atk', 'atk').replace('def', 'def').replace('hp', 'hp');
                    if (p.ivs[key] !== undefined) p.ivs[key] = parseInt(val) || 0;
                });
            }
        });

        // Update UI headers
        const searchInput = document.getElementById(`p${num}-search`);
        if (searchInput) searchInput.value = p.species;
        document.getElementById(`p${num}-level`).value = p.level;
        document.getElementById(`p${num}-nature`).value = p.nature;
        document.getElementById(`p${num}-ability`).value = p.ability;
        document.getElementById(`p${num}-item`).value = p.item;

        recalcStats(num);
        showToast(`Build ${num === 1 ? 'A' : 'B'} Imported!`);
    } catch (e) {
        console.error("Import error", e);
        showToast("Failed to parse PokePaste!");
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.animation = 'fadeIn 0.3s ease forwards';
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.style.display = 'none', 300);
    }, 2500);
}
