/* Abilitydex page logic */
(() => {
    const D = DexShared;
    let allAbilities = [], allPokemon = [], filtered = [];
    const grid = document.getElementById('dex-grid');
    const meta = document.getElementById('dex-results-meta');
    const modal = D.bindModal('dex-detail-modal', 'dex-close-modal');

    async function init() {
        document.getElementById('dex-nav-slot').innerHTML = D.renderNav('ability');
        const cb = '?v=10.0.1';
        const [abRes, pokeRes] = await Promise.all([
            fetch(D.ASSET_PREFIX + 'assets/abilities.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/pokemon.json' + cb)
        ]);
        allAbilities = await abRes.json();
        allPokemon = await pokeRes.json();
        buildLearners();
        applyFilters();
    }

    function buildLearners() {
        allAbilities.forEach(ab => {
            const key = D.normalizeKey(ab.name);
            ab.learners = allPokemon.filter(p => {
                const list = Array.isArray(p.Ability) ? p.Ability : (p.Ability ? [p.Ability] : []);
                return list.some(a => D.normalizeKey(a) === key);
            });
        });
    }

    function applyFilters() {
        const q = document.getElementById('dex-search').value.toLowerCase().trim();
        const sort = document.getElementById('sort-primary').value;
        const dir = document.getElementById('sort-dir').value;
        const group = document.getElementById('sort-group').value;
        const popular = document.getElementById('filter-popular').checked;

        filtered = allAbilities.filter(ab => {
            if (!q) return true;
            const users = (ab.learners || []).map(p => p.Name).join(' ').toLowerCase();
            return (ab.name || '').toLowerCase().includes(q) ||
                (ab.description || '').toLowerCase().includes(q) ||
                users.includes(q);
        });

        if (popular) filtered = filtered.filter(ab => (ab.learners || []).length >= 5);

        const getters = {
            name: ab => ab.name || '',
            learners: ab => (ab.learners || []).length,
            desc: ab => (ab.description || '').length
        };
        filtered = D.sortList(filtered, getters[sort] || getters.name, dir);
        render(group);
    }

    function render(group) {
        D.updateResultCount(meta, filtered.length, allAbilities.length, 'abilities');
        grid.innerHTML = '';
        if (!filtered.length) {
            grid.innerHTML = '<div class="dex-empty">No abilities matched your search.</div>';
            return;
        }

        if (group === 'none') {
            filtered.forEach(ab => grid.appendChild(createCard(ab)));
            return;
        }

        const groupFn = ab => {
            const n = (ab.learners || []).length;
            if (n >= 20) return 'Very Common (20+)';
            if (n >= 10) return 'Common (10–19)';
            if (n >= 3) return 'Uncommon (3–9)';
            return 'Rare (1–2)';
        };
        const groups = D.groupList(filtered, groupFn);
        groups.forEach((items, label) => {
            const hdr = document.createElement('div');
            hdr.className = 'dex-group-header';
            hdr.textContent = label;
            grid.appendChild(hdr);
            items.forEach(ab => grid.appendChild(createCard(ab)));
        });
    }

    function createCard(ab) {
        const card = document.createElement('article');
        card.className = 'dex-card';
        card.onclick = () => showDetail(ab);
        const learners = ab.learners || [];
        const sprites = learners.slice(0, 16).map(p => D.spriteCellHtml(p.Name)).join('');

        card.innerHTML = `
            <div class="dex-card-title">${D.escapeHtml(ab.name)}</div>
            <div class="dex-meta-grid">
                <div class="dex-meta-cell"><strong>Pokémon</strong><span>${learners.length}</span></div>
            </div>
            <p class="dex-desc">${D.escapeHtml(ab.description || 'No description available.')}</p>
            <div class="dex-sprite-row">${sprites}${learners.length > 16 ? `<span class="dex-sprite-more">+${learners.length - 16}</span>` : ''}</div>
        `;
        return card;
    }

    function showDetail(ab) {
        const body = document.getElementById('dex-modal-body');
        const learners = ab.learners || [];
        const sprites = learners.map(p => D.spriteCellHtml(p.Name, p.Name)).join('');

        body.innerHTML = `
            <div class="dex-detail-grid">
                <div class="dex-detail-side">
                    <h2 class="dex-detail-name">${D.escapeHtml(ab.name)}</h2>
                    <p class="dex-desc" style="text-align:left;margin-top:1rem;">${D.escapeHtml(ab.description || 'No description.')}</p>
                    <div class="info-item" style="margin-top:1.25rem;">
                        <span class="info-label">Pokémon with this ability</span>
                        <span class="info-value">${learners.length}</span>
                    </div>
                </div>
                <div class="dex-detail-section">
                    <h3>Compatible Pokémon</h3>
                    <div class="dex-sprite-row">${sprites || '<span class="dex-desc">None in dataset.</span>'}</div>
                </div>
            </div>`;
        modal.open();
    }

    document.getElementById('dex-search').addEventListener('input', applyFilters);
    ['sort-primary', 'sort-dir', 'sort-group'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('filter-popular').addEventListener('change', applyFilters);

    init();
})();
