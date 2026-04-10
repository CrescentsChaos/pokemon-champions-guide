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

            const matches = pokemonData
                .filter(p => p.Name && p.Name.toLowerCase().includes(q))
                .slice(0, 10)
                .map(p => p.Name);
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.textContent = m;
                div.onclick = () => {
                    input.value = m;
                    results.innerHTML = '';
                    selectPokemon(num, m);
                };
                results.appendChild(div);
            });
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
    const abilities = [pd.Ability_1, pd.Ability_2, pd.Hidden_Ability].filter(x => x && x !== '' && x !== 'None');
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
                    (num === 1 ? p1 : p2)[field] = val;
                    if (field === 'nature') recalcStats(num);
                    if (field === 'item') {
                        // Resync sprite in case it's a mega stone
                        const p = num === 1 ? p1 : p2;
                        if (p.species) {
                            const img = document.getElementById(`p${num}-sprite`);
                            const clean = p.species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
                            // If Mega Stone equipped, try showdown mega sprite first
                            let suffix = '';
                            const it = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (it.endsWith('ite') && it !== 'eviolite' && it !== 'meteorite') {
                                suffix = '-mega';
                                if (it.endsWith('itex')) suffix = '-megax';
                                else if (it.endsWith('itey')) suffix = '-megay';
                            }
                            img.dataset.fallbackState = '0';
                            img.src = `https://play.pokemonshowdown.com/sprites/ani/${clean}${suffix}.gif`;
                        }
                    }
                });
            }
        });
    });
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
    const lines = text.trim().split('\n').map(l => l.trim());
    if (lines.length === 0) return;

    const slot = {
        species: '', item: '', ability: '', level: 50, nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    };

    // Header: Name @ Item
    const head = lines[0];
    const itemSplit = head.split('@');
    if (itemSplit[1]) slot.item = itemSplit[1].trim();
    let namePart = itemSplit[0].split('(')[0].trim();
    if(namePart.includes(')')) namePart = namePart.split(')')[1].trim(); 
    if(!namePart) namePart = itemSplit[0].replace(/\([^)]+\)/g, '').trim(); 
    
    // Attempt match with DB (array of objects)
    let sMatch = pokemonData.find(x => x.Name && x.Name.toLowerCase() === namePart.toLowerCase());
    if(!sMatch && namePart.includes('-')) {
         const baseName = namePart.split('-')[0].trim();
         sMatch = pokemonData.find(x => x.Name && x.Name.toLowerCase() === baseName.toLowerCase());
    }
    if(sMatch) slot.species = sMatch.Name;
    else slot.species = namePart; // raw guess

    for(let i=1; i<lines.length; i++) {
        const L = lines[i];
        if (L.startsWith('Ability:')) slot.ability = L.split(':')[1].trim();
        else if (L.startsWith('Level:')) slot.level = parseInt(L.split(':')[1].trim());
        else if (L.includes('Nature')) slot.nature = L.split(' ')[0].trim();
        else if (L.startsWith('EVs:')) {
            const evParts = L.split(':')[1].split('/');
            evParts.forEach(part => {
                const [val, statKeyRaw] = part.trim().split(' ');
                if (!statKeyRaw) return;
                const key = statKeyRaw.toLowerCase();
                const v = parseInt(val) || 0;
                if (key.includes('hp')) slot.evs.hp = v;
                else if (key.includes('atk')) slot.evs.atk = v;
                else if (key.includes('def')) slot.evs.def = v;
                else if (key.includes('spa')) slot.evs.spa = v;
                else if (key.includes('spd')) slot.evs.spd = v;
                else if (key.includes('spe')) slot.evs.spe = v;
            });
        }
        else if (L.startsWith('IVs:')) {
            const ivParts = L.split(':')[1].split('/');
            ivParts.forEach(part => {
                const [val, statKeyRaw] = part.trim().split(' ');
                if (!statKeyRaw) return;
                const key = statKeyRaw.toLowerCase();
                const v = parseInt(val) || 0;
                if (key.includes('hp')) slot.ivs.hp = v;
                else if (key.includes('atk')) slot.ivs.atk = v;
                else if (key.includes('def')) slot.ivs.def = v;
                else if (key.includes('spa')) slot.ivs.spa = v;
                else if (key.includes('spd')) slot.ivs.spd = v;
                else if (key.includes('spe')) slot.ivs.spe = v;
            });
        }
    }

    // Apply to target
    const p = num === 1 ? p1 : p2;
    p.species = slot.species;
    
    // Reselect so Base stats load
    if (pokemonData.find(x => x.Name === p.species)) {
        selectPokemon(num, p.species);
    }

    p.level = slot.level;
    p.nature = slot.nature;
    p.ability = slot.ability;
    p.item = slot.item;
    p.evs = slot.evs;
    p.ivs = slot.ivs;

    // Update Form fields
    document.getElementById(`p${num}-level`).value = p.level;
    document.getElementById(`p${num}-nature`).value = p.nature;
    document.getElementById(`p${num}-ability`).value = p.ability;
    document.getElementById(`p${num}-item`).value = p.item;
    
    // Simulate item change so mega updates if relevant
    const itEvent = new Event('change');
    const itInput = document.getElementById(`p${num}-item`);
    if(itInput) itInput.dispatchEvent(itEvent);

    recalcStats(num);
    showToast(`Build ${num === 1 ? 'A' : 'B'} Imported!`);
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
