/* Itemdex page logic */
(() => {
    const D = DexShared;
    let allItems = [], allPokemon = [], allBuilds = [], filtered = [];
    let usageMap = {}, buildMap = {};
    const grid = document.getElementById('dex-grid');
    const meta = document.getElementById('dex-results-meta');
    const modal = D.bindModal('dex-detail-modal', 'dex-close-modal');

    async function init() {
        document.getElementById('dex-nav-slot').innerHTML = D.renderNav('item');
        const cb = '?v=' + Date.now();
        const [itemsRes, pokeRes, buildsRes] = await Promise.all([
            fetch(D.ASSET_PREFIX + 'assets/items.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/pokemon.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/builds.json' + cb)
        ]);
        allItems = await itemsRes.json();
        allPokemon = await pokeRes.json();
        allBuilds = await buildsRes.json();
        buildMaps();
        applyFilters();
    }

    function buildMaps() {
        usageMap = {};
        buildMap = {};
        allPokemon.forEach(p => {
            const items = Array.isArray(p.Items) ? p.Items : (p.Items ? [p.Items] : []);
            items.forEach(item => {
                const key = D.normalizeKey(item);
                if (!usageMap[key]) usageMap[key] = new Set();
                usageMap[key].add(p.Name);
            });
        });
        allBuilds.forEach(b => {
            const line = (b.build || '').split('\n')[0] || '';
            const match = line.match(/@\s*(.+)$/);
            if (!match) return;
            const key = D.normalizeKey(match[1].trim());
            if (!buildMap[key]) buildMap[key] = new Set();
            buildMap[key].add(b.pokemon || 'Unknown');
        });
    }

    function enrichItem(item) {
        const name = item.name || item.Name || 'Unknown';
        const key = D.normalizeKey(name);
        const users = Array.from(new Set([...(usageMap[key] || []), ...(buildMap[key] || [])])).sort();
        return {
            item, name, key,
            users,
            buildCount: (buildMap[key] || new Set()).size,
            pokemonCount: (usageMap[key] || new Set()).size
        };
    }

    function inferCategory(item) {
        const n = (item.name || '').toLowerCase();
        const d = (item.description || '').toLowerCase();
        if (n.includes('ite') && !n.includes('eviolite')) return 'Mega Stone';
        if (n.includes('z') || d.includes('z-move') || d.includes('z-power')) return 'Z-Crystal';
        if (n.includes('plate') || n.includes('memory') || n.includes('mask')) return 'Type Item';
        if (n.includes('berry') || d.includes('berry')) return 'Berry';
        if (d.includes('held by')) return 'Held Item';
        return 'Other';
    }

    function applyFilters() {
        const q = document.getElementById('dex-search').value.toLowerCase().trim();
        const sort = document.getElementById('sort-primary').value;
        const dir = document.getElementById('sort-dir').value;
        const group = document.getElementById('sort-group').value;
        const champions = document.getElementById('filter-champions').checked;
        const category = document.getElementById('filter-category').value;

        filtered = allItems.map(enrichItem).filter(entry => {
            if (champions && entry.item.inChampions !== true) return false;
            if (category && inferCategory(entry.item) !== category) return false;
            if (!q) return true;
            const text = [entry.name, entry.item.description, entry.users.join(' ')].join(' ').toLowerCase();
            return text.includes(q);
        });

        const getters = {
            name: e => e.name,
            pokemon: e => e.users.length,
            builds: e => e.buildCount,
            category: e => inferCategory(e.item),
            champions: e => e.item.inChampions === true ? 1 : 0
        };
        filtered = D.sortList(filtered, getters[sort] || getters.name, dir);
        render(group);
    }

    function render(group) {
        D.updateResultCount(meta, filtered.length, allItems.length, 'items');
        grid.innerHTML = '';
        if (!filtered.length) {
            grid.innerHTML = '<div class="dex-empty">No items matched your filters.</div>';
            return;
        }

        if (group === 'none') {
            filtered.forEach(e => grid.appendChild(createCard(e)));
            return;
        }

        const groupFn = e => inferCategory(e.item);
        const groups = D.groupList(filtered, groupFn);
        groups.forEach((items, label) => {
            const hdr = document.createElement('div');
            hdr.className = 'dex-group-header';
            hdr.textContent = label;
            grid.appendChild(hdr);
            items.forEach(e => grid.appendChild(createCard(e)));
        });
    }

    function createCard(entry) {
        const card = document.createElement('article');
        card.className = 'dex-card';
        card.onclick = () => showDetail(entry);
        const js = D.escapeJs(entry.name);
        const url = D.getItemSpriteUrl(entry.name);
        const sprites = entry.users.slice(0, 14).map(n => D.spriteCellHtml(n)).join('');
        const cat = inferCategory(entry.item);

        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;">
                <div class="dex-item-icon"><img src="${url}" alt="${D.escapeHtml(entry.name)}" onerror="DexShared.handleItemError(this,'${js}')"></div>
                <div style="flex:1;">
                    <div class="dex-card-title">${D.escapeHtml(entry.name)}</div>
                    <div class="dex-badge-row" style="margin-top:6px;">
                        <span class="dex-badge">${cat}</span>
                        ${entry.item.inChampions ? '<span class="dex-badge champ">Champions</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="dex-meta-grid">
                <div class="dex-meta-cell"><strong>Pokémon</strong><span>${entry.users.length}</span></div>
                <div class="dex-meta-cell"><strong>Builds</strong><span>${entry.buildCount}</span></div>
            </div>
            <p class="dex-desc">${D.escapeHtml(entry.item.description || '')}</p>
            <div class="dex-sprite-row">${sprites}${entry.users.length > 14 ? `<span class="dex-sprite-more">+${entry.users.length - 14}</span>` : ''}</div>
        `;
        return card;
    }

    function showDetail(entry) {
        const body = document.getElementById('dex-modal-body');
        const js = D.escapeJs(entry.name);
        const url = D.getItemSpriteUrl(entry.name);
        const sprites = entry.users.map(n => D.spriteCellHtml(n, n)).join('');

        body.innerHTML = `
            <div class="dex-detail-grid">
                <div class="dex-detail-side">
                    <div class="dex-item-icon" style="width:80px;height:80px;margin:0 auto 1rem;">
                        <img src="${url}" style="width:56px;height:56px;" alt="${D.escapeHtml(entry.name)}" onerror="DexShared.handleItemError(this,'${js}')">
                    </div>
                    <h2 class="dex-detail-name">${D.escapeHtml(entry.name)}</h2>
                    <div class="dex-badge-row" style="justify-content:center;margin:0.75rem 0;">
                        <span class="dex-badge">${inferCategory(entry.item)}</span>
                        ${entry.item.inChampions ? '<span class="dex-badge champ">Champions</span>' : ''}
                    </div>
                    <div class="modal-info-grid">
                        <div class="info-item"><span class="info-label">Pokémon</span><span class="info-value">${entry.users.length}</span></div>
                        <div class="info-item"><span class="info-label">Builds</span><span class="info-value">${entry.buildCount}</span></div>
                    </div>
                    <p class="dex-desc" style="margin-top:1.25rem;text-align:left;">${D.escapeHtml(entry.item.description || 'No description.')}</p>
                </div>
                <div class="dex-detail-section">
                    <h3>Used by</h3>
                    <div class="dex-sprite-row">${sprites || '<span class="dex-desc">No Pokémon in dataset.</span>'}</div>
                </div>
            </div>`;
        modal.open();
    }

    document.getElementById('dex-search').addEventListener('input', applyFilters);
    ['sort-primary', 'sort-dir', 'sort-group', 'filter-category'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('filter-champions').addEventListener('change', applyFilters);

    init();
})();
