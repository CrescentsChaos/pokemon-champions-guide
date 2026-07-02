/* Pokedex page logic */
(() => {
    const D = DexShared;
    const PAGE_SIZE = 24;

    let allPokemon = [], allMoves = [], abilitiesMap = {}, allItems = [];
    let filtered = [], page = 0, loading = false;
    let viewMode = 'grid';

    const grid = document.getElementById('dex-grid');
    const meta = document.getElementById('dex-results-meta');
    const sentinel = document.getElementById('dex-sentinel');
    const modal = D.bindModal('dex-detail-modal', 'dex-close-modal');

    async function init() {
        document.getElementById('dex-nav-slot').innerHTML = D.renderNav('pokemon');
        const cb = '?v=' + Date.now();
        const [pokeRes, movesRes, abRes, itemsRes] = await Promise.all([
            fetch(D.ASSET_PREFIX + 'assets/pokemon.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/moves.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/abilities.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/items.json' + cb)
        ]);
        allPokemon = await pokeRes.json();
        allMoves = await movesRes.json();
        (await abRes.json()).forEach(a => { abilitiesMap[D.normalizeKey(a.name)] = a; });
        allItems = await itemsRes.json();
        populateTypeFilter();
        applyFilters();
        D.setupInfiniteScroll(sentinel, loadMore);
    }

    function populateTypeFilter() {
        const sel = document.getElementById('filter-type');
        D.POKEMON_TYPES.forEach(t => {
            const o = document.createElement('option');
            o.value = t.toLowerCase();
            o.textContent = t;
            sel.appendChild(o);
        });
        const gens = [...new Set(allPokemon.map(p => p.Generation).filter(Boolean))].sort();
        const genSel = document.getElementById('filter-gen');
        gens.forEach(g => {
            const o = document.createElement('option');
            o.value = g;
            o.textContent = g;
            genSel.appendChild(o);
        });
    }

    function getFilters() {
        return {
            q: document.getElementById('dex-search').value.toLowerCase().trim(),
            type: document.getElementById('filter-type').value,
            gen: document.getElementById('filter-gen').value,
            ability: document.getElementById('filter-ability').value.toLowerCase().trim(),
            move: document.getElementById('filter-move').value.toLowerCase().trim(),
            champions: document.getElementById('filter-champions').checked,
            legendary: document.getElementById('filter-legendary').checked,
            sort: document.getElementById('sort-primary').value,
            dir: document.getElementById('sort-dir').value,
            group: document.getElementById('sort-group').value
        };
    }

    function applyFilters() {
        const f = getFilters();
        filtered = allPokemon.filter(p => {
            if (f.q) {
                const hay = [p.Name, p.id, p.Type_1, p.Type_2, p.Generation, ...(p.Ability || [])].join(' ').toLowerCase();
                if (!hay.includes(f.q)) return false;
            }
            if (f.type && p.Type_1?.toLowerCase() !== f.type && p.Type_2?.toLowerCase() !== f.type) return false;
            if (f.gen && p.Generation !== f.gen) return false;
            if (f.champions && p.inChampions !== true) return false;
            if (f.legendary && !p.Is_Legendary && !p.Is_Mythical && !p.Is_Pseudo_Legendary) return false;
            if (f.ability) {
                const abs = Array.isArray(p.Ability) ? p.Ability : [];
                if (!abs.some(a => a.toLowerCase().includes(f.ability))) return false;
            }
            if (f.move) {
                const mv = Array.isArray(p.Moves) ? p.Moves : [];
                if (!mv.some(m => m.toLowerCase().includes(f.move))) return false;
            }
            return true;
        });

        const getters = {
            id: p => p.id,
            name: p => p.Name,
            total: p => p.Total_Stats || 0,
            hp: p => p.HP || 0,
            atk: p => p.Attack || 0,
            def: p => p.Defense || 0,
            spa: p => p['Sp.Atk'] || 0,
            spd: p => p['Sp.Def'] || 0,
            spe: p => p.Speed || 0,
            weight: p => parseFloat(p['Weight{kg}']) || 0,
            height: p => parseFloat(p['Height(m)']) || 0,
            gen: p => p.Generation || '',
            type: p => p.Type_1 || ''
        };
        filtered = D.sortList(filtered, getters[f.sort] || getters.id, f.dir);
        page = 0;
        grid.innerHTML = '';
        render();
    }

    function render() {
        const f = getFilters();
        D.updateResultCount(meta, Math.min((page) * PAGE_SIZE, filtered.length), filtered.length, 'Pokémon');

        if (!filtered.length) {
            grid.innerHTML = '<div class="dex-empty">No Pokémon matched your filters.</div>';
            return;
        }

        if (f.group === 'none') {
            loadMore();
            return;
        }

        const groupFn = f.group === 'type' ? p => p.Type_1 : p => p.Generation || 'Unknown';
        const groups = D.groupList(filtered, groupFn);
        grid.innerHTML = '';
        groups.forEach((items, label) => {
            const hdr = document.createElement('div');
            hdr.className = 'dex-group-header';
            hdr.textContent = label;
            grid.appendChild(hdr);
            items.forEach(p => grid.appendChild(createCard(p)));
        });
        D.updateResultCount(meta, filtered.length, filtered.length, 'Pokémon');
    }

    function loadMore() {
        if (loading || getFilters().group !== 'none') return;
        loading = true;
        const start = page * PAGE_SIZE;
        const batch = filtered.slice(start, start + PAGE_SIZE);
        if (!batch.length) { loading = false; return; }
        batch.forEach(p => grid.appendChild(createCard(p)));
        page++;
        D.updateResultCount(meta, Math.min(page * PAGE_SIZE, filtered.length), filtered.length, 'Pokémon');
        loading = false;
    }

    function createCard(p) {
        const card = document.createElement('article');
        card.className = `dex-card${viewMode === 'compact' ? ' compact' : ''}`;
        card.onclick = () => showDetail(p);
        const abilities = Array.isArray(p.Ability) ? p.Ability : [];
        const moveCount = Array.isArray(p.Moves) ? p.Moves.length : 0;
        const badges = [
            p.inChampions ? '<span class="dex-badge champ">Champions</span>' : '',
            p.Is_Legendary ? '<span class="dex-badge">Legendary</span>' : '',
            p.Is_Mythical ? '<span class="dex-badge">Mythical</span>' : '',
            p.Is_Pseudo_Legendary ? '<span class="dex-badge">Pseudo</span>' : ''
        ].filter(Boolean).join('');

        card.innerHTML = `
            <div class="dex-card-top">
                <span class="dex-card-id">#${String(p.id).padStart(4, '0')}</span>
                <div class="dex-type-row">${D.typeIconHtml(p.Type_1)}${p.Type_2 && p.Type_2 !== 'None' ? D.typeIconHtml(p.Type_2) : ''}</div>
            </div>
            <div class="dex-card-sprite-wrap">${D.spriteImgHtml(p.Name)}</div>
            <div class="dex-card-title">${D.escapeHtml(p.Name)}</div>
            <div class="dex-badge-row">${badges}</div>
            <div class="dex-meta-grid">
                <div class="dex-meta-cell"><strong>BST</strong><span>${p.Total_Stats || '—'}</span></div>
                <div class="dex-meta-cell"><strong>Ability</strong><span>${D.escapeHtml(abilities[0] || '—')}</span></div>
                <div class="dex-meta-cell"><strong>Moves</strong><span>${moveCount}</span></div>
            </div>
            ${D.statBarHtml('HP', p.HP, 'hp')}
            ${D.statBarHtml('ATK', p.Attack, 'atk')}
            ${D.statBarHtml('DEF', p.Defense, 'def')}
            ${D.statBarHtml('SPA', p['Sp.Atk'], 'spa')}
            ${D.statBarHtml('SPD', p['Sp.Def'], 'spd')}
            ${D.statBarHtml('SPE', p.Speed, 'spe')}
        `;
        return card;
    }

    function findMove(name) {
        const key = D.normalizeKey(name);
        return allMoves.find(m => D.normalizeKey(m.name) === key);
    }

    function showDetail(p) {
        const body = document.getElementById('dex-modal-body');
        const abilities = Array.isArray(p.Ability) ? p.Ability : [];
        const moves = Array.isArray(p.Moves) ? p.Moves : [];
        const items = Array.isArray(p.Items) ? p.Items : [];
        const teammates = Array.isArray(p.Teammates) ? p.Teammates : [];

        const abilityHtml = abilities.map(a => {
            const desc = abilitiesMap[D.normalizeKey(a)]?.description || '';
            return `<span class="special-badge" title="${D.escapeHtml(desc)}" style="background:rgba(255,255,255,0.08);color:#fff;">${D.escapeHtml(a)}</span>`;
        }).join('');

        const movesHtml = moves.slice(0, 80).map(mName => {
            const m = findMove(mName) || { name: mName, type: 'Normal', damage_class: 'Status' };
            const desc = m.short_descripton || m.short_description || '';
            return `<div class="dex-move-item">
                <div class="dex-move-item-head">
                    <span class="dex-move-item-name">${D.escapeHtml(m.name || mName)}</span>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        ${D.typeIconHtml(m.type, 22)}
                        ${D.dmgClassIconHtml(m.damage_class, 16)}
                        ${D.dmgClassBadge(m.damage_class)}
                    </div>
                </div>
                ${m.tags ? D.moveTagsHtml(m.tags) : ''}
                <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin:4px 0;">PWR ${m.power ?? '—'} · ACC ${m.accuracy ?? '—'} · PP ${m.pp ?? '—'}${m.priority ? ` · Pri +${m.priority}` : ''}</div>
                <p class="dex-desc" style="font-size:0.82rem;margin:0;">${D.escapeHtml(desc)}</p>
            </div>`;
        }).join('') || '<p class="dex-desc">No move data.</p>';

        const itemsHtml = items.map(it => {
            const js = D.escapeJs(it);
            const url = D.getItemSpriteUrl(it);
            return `<div class="dex-item-icon" title="${D.escapeHtml(it)}"><img src="${url}" alt="${D.escapeHtml(it)}" onerror="DexShared.handleItemError(this,'${js}')"></div>`;
        }).join('');

        const teammateHtml = teammates.map(t => D.spriteCellHtml(t, t)).join('');

        body.innerHTML = `
            <div class="dex-detail-grid">
                <div class="dex-detail-side">
                    <div class="dex-detail-sprite-box">${D.spriteImgHtml(p.Name, 'dex-sprite')}</div>
                    <h2 class="dex-detail-name">${D.escapeHtml(p.Name)}</h2>
                    <p style="color:var(--primary-red);font-family:'JetBrains Mono';font-weight:700;">#${String(p.id).padStart(4, '0')}</p>
                    <div class="dex-type-row" style="justify-content:center;margin:1rem 0;">${D.typeIconHtml(p.Type_1, 36)}${p.Type_2 && p.Type_2 !== 'None' ? D.typeIconHtml(p.Type_2, 36) : ''}</div>
                    <div class="modal-badge-group">${abilityHtml}</div>
                    <div class="modal-info-grid" style="margin-top:1.25rem;">
                        <div class="info-item"><span class="info-label">Height</span><span class="info-value">${p['Height(m)']}m</span></div>
                        <div class="info-item"><span class="info-label">Weight</span><span class="info-value">${p['Weight{kg}']}kg</span></div>
                        <div class="info-item"><span class="info-label">Generation</span><span class="info-value">${p.Generation || '—'}</span></div>
                        <div class="info-item"><span class="info-label">Catch Rate</span><span class="info-value">${p.Capture_Rate ?? '—'}</span></div>
                        <div class="info-item"><span class="info-label">Egg Groups</span><span class="info-value">${[p.Egg_Group_1, p.Egg_Group_2].filter(Boolean).join(' / ') || '—'}</span></div>
                        <div class="info-item"><span class="info-label">Total BST</span><span class="info-value">${p.Total_Stats || '—'}</span></div>
                    </div>
                </div>
                <div>
                    <div class="dex-detail-section">
                        <h3>Base Stats</h3>
                        ${['hp','atk','def','spa','spd','spe'].map((k, i) => {
                            const labels = ['HP','ATK','DEF','SPA','SPD','SPE'];
                            const keys = ['HP','Attack','Defense','Sp.Atk','Sp.Def','Speed'];
                            return D.statBarHtml(labels[i], p[keys[i]], k);
                        }).join('')}
                    </div>
                    ${items.length ? `<div class="dex-detail-section"><h3>Common Items</h3><div class="dex-sprite-row">${itemsHtml}</div></div>` : ''}
                    ${teammates.length ? `<div class="dex-detail-section"><h3>Suggested Teammates</h3><div class="dex-sprite-row">${teammateHtml}</div></div>` : ''}
                    <div class="dex-detail-section">
                        <h3>Moveset (${moves.length})</h3>
                        <div class="dex-move-list">${movesHtml}</div>
                    </div>
                </div>
            </div>`;
        modal.open();
    }

    document.getElementById('dex-search').addEventListener('input', applyFilters);
    ['filter-type', 'filter-gen', 'sort-primary', 'sort-dir', 'sort-group'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    ['filter-ability', 'filter-move'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyFilters);
    });
    ['filter-champions', 'filter-legendary'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('view-toggle').addEventListener('click', () => {
        viewMode = viewMode === 'grid' ? 'compact' : 'grid';
        grid.classList.toggle('compact', viewMode === 'compact');
        document.getElementById('view-toggle').textContent = viewMode === 'grid' ? 'Compact View' : 'Grid View';
        applyFilters();
    });

    init();
})();
