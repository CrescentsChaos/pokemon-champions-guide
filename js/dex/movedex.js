/* Movedex page logic */
(() => {
    const D = DexShared;
    let allMoves = [], allPokemon = [], filtered = [];
    const grid = document.getElementById('dex-grid');
    const meta = document.getElementById('dex-results-meta');
    const modal = D.bindModal('dex-detail-modal', 'dex-close-modal');

    async function init() {
        document.getElementById('dex-nav-slot').innerHTML = D.renderNav('move');
        injectCategoryLegend();
        const cb = '?v=' + Date.now();
        const [movesRes, pokeRes] = await Promise.all([
            fetch(D.ASSET_PREFIX + 'assets/moves.json' + cb),
            fetch(D.ASSET_PREFIX + 'assets/pokemon.json' + cb)
        ]);
        allMoves = await movesRes.json();
        allPokemon = await pokeRes.json();
        buildLearners();
        populateTagFilter();
        applyFilters();
    }

    function buildLearners() {
        allMoves.forEach(move => {
            const key = D.normalizeKey(move.name);
            move.learners = allPokemon.filter(p =>
                Array.isArray(p.Moves) && p.Moves.some(m => D.normalizeKey(m) === key)
            );
        });
    }

    function populateTagFilter() {
        const sel = document.getElementById('filter-tag');
        D.MOVE_TAGS.forEach(t => {
            const o = document.createElement('option');
            o.value = t;
            o.textContent = t;
            sel.appendChild(o);
        });
        const gens = [...new Set(allMoves.map(m => m.generation).filter(Boolean))].sort();
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
            dmg: document.getElementById('filter-dmg').value,
            tag: document.getElementById('filter-tag').value,
            gen: document.getElementById('filter-gen').value,
            damaging: document.getElementById('filter-damaging').checked,
            sort: document.getElementById('sort-primary').value,
            dir: document.getElementById('sort-dir').value,
            group: document.getElementById('sort-group').value
        };
    }

    function injectCategoryLegend() {
        const row = document.querySelector('.dex-filters-row:last-of-type');
        if (!row || document.getElementById('dmg-category-legend')) return;
        const legend = document.createElement('div');
        legend.id = 'dmg-category-legend';
        legend.className = 'dex-dmg-legend';
        legend.innerHTML = `
            <span class="dex-label">Category</span>
            ${D.dmgClassIconOnlyHtml('Physical', 22)}
            <span class="dex-dmg-legend__text">Physical</span>
            ${D.dmgClassIconOnlyHtml('Special', 22)}
            <span class="dex-dmg-legend__text">Special</span>
            ${D.dmgClassIconOnlyHtml('Status', 22)}
            <span class="dex-dmg-legend__text">Status</span>`;
        row.appendChild(legend);
    }

    function applyFilters() {
        const f = getFilters();
        filtered = allMoves.filter(m => {
            if (f.q) {
                const text = [m.name, m.type, m.damage_class, m.short_descripton, ...(m.tags || [])].join(' ').toLowerCase();
                if (!text.includes(f.q)) return false;
            }
            if (f.type && (m.type || '').toLowerCase() !== f.type) return false;
            if (f.dmg && (m.damage_class || '').toLowerCase() !== f.dmg.toLowerCase()) return false;
            if (f.tag && !(m.tags || []).includes(f.tag)) return false;
            if (f.gen && m.generation !== f.gen) return false;
            if (f.damaging && (!m.power || m.power === 0)) return false;
            return true;
        });

        const getters = {
            name: m => m.name,
            type: m => m.type || '',
            power: m => m.power != null ? Number(m.power) : -1,
            accuracy: m => m.accuracy != null ? Number(m.accuracy) : -1,
            pp: m => m.pp != null ? Number(m.pp) : -1,
            priority: m => m.priority != null ? Number(m.priority) : 0,
            dmg: m => m.damage_class || '',
            gen: m => m.generation || '',
            learners: m => (m.learners || []).length,
            id: m => m.id || 0
        };
        filtered = D.sortList(filtered, getters[f.sort] || getters.name, f.dir);
        render();
    }

    function render() {
        D.updateResultCount(meta, filtered.length, allMoves.length, 'moves');
        grid.innerHTML = '';
        if (!filtered.length) {
            grid.innerHTML = '<div class="dex-empty">No moves matched your filters.</div>';
            return;
        }

        const f = getFilters();
        if (f.group === 'none') {
            filtered.forEach(m => grid.appendChild(createCard(m)));
            return;
        }

        const groupFn = f.group === 'type' ? m => m.type || 'Unknown'
            : f.group === 'dmg' ? m => m.damage_class || 'Status'
            : m => m.generation || 'Unknown';
        const groups = D.groupList(filtered, groupFn);
        groups.forEach((items, label) => {
            const hdr = document.createElement('div');
            hdr.className = 'dex-group-header';
            hdr.textContent = label;
            grid.appendChild(hdr);
            items.forEach(m => grid.appendChild(createCard(m)));
        });
    }

    function createCard(move) {
        const card = document.createElement('article');
        card.className = 'dex-card';
        card.onclick = () => showDetail(move);
        const learners = move.learners || [];
        const spriteRow = learners.slice(0, 14).map(p => D.spriteCellHtml(p.Name)).join('');

        card.innerHTML = `
            <div class="dex-card-top">
                <div>
                    <div class="dex-card-title">${D.escapeHtml(move.name)}</div>
                    <div class="dex-card-type-row">
                        ${D.typeIconHtml(move.type, 26)}
                        ${D.dmgClassIconOnlyHtml(move.damage_class, 26)}
                        <span class="dex-dmg-badge dex-dmg-${(move.damage_class || 'Status').toLowerCase()}">${D.escapeHtml(move.damage_class || 'Status')}</span>
                    </div>
                </div>
                <span class="dex-card-id">#${move.id || '—'}</span>
            </div>
            ${move.tags && move.tags.length ? D.moveTagsHtml(move.tags) : ''}
            <div class="dex-meta-grid">
                <div class="dex-meta-cell"><strong>Category</strong><span class="dex-meta-icon">${D.dmgClassIconOnlyHtml(move.damage_class, 24)}</span></div>
                <div class="dex-meta-cell"><strong>Power</strong><span>${move.power ?? '—'}</span></div>
                <div class="dex-meta-cell"><strong>Acc</strong><span>${move.accuracy ?? '—'}</span></div>
                <div class="dex-meta-cell"><strong>PP</strong><span>${move.pp ?? '—'}</span></div>
                <div class="dex-meta-cell"><strong>Priority</strong><span>${move.priority > 0 ? '+' + move.priority : move.priority || 0}</span></div>
                <div class="dex-meta-cell"><strong>Learners</strong><span>${learners.length}</span></div>
            </div>
            <p class="dex-desc">${D.escapeHtml(move.short_descripton || move.short_description || '')}</p>
            <div class="dex-sprite-row">${spriteRow}${learners.length > 14 ? `<span class="dex-sprite-more">+${learners.length - 14}</span>` : ''}</div>
        `;
        return card;
    }

    function showDetail(move) {
        const body = document.getElementById('dex-modal-body');
        const learners = move.learners || [];
        const sprites = learners.map(p => D.spriteCellHtml(p.Name, p.Name)).join('');

        body.innerHTML = `
            <div class="dex-detail-grid">
                <div class="dex-detail-side">
                    <div style="display:flex;gap:12px;align-items:center;justify-content:center;margin-bottom:1rem;">
                        ${D.typeIconHtml(move.type, 48)}
                    </div>
                    <h2 class="dex-detail-name">${D.escapeHtml(move.name)}</h2>
                    <p style="color:rgba(255,255,255,0.65);font-size:0.85rem;">${D.escapeHtml(move.generation || '')}</p>
                    <div class="dex-detail-category-row">
                        ${D.dmgClassIconOnlyHtml(move.damage_class, 40)}
                        ${D.dmgClassHtml(move.damage_class, 28)}
                    </div>
                    ${move.tags ? D.moveTagsHtml(move.tags) : ''}
                    <div class="modal-info-grid" style="margin-top:1.25rem;">
                        <div class="info-item"><span class="info-label">Power</span><span class="info-value">${move.power ?? '—'}</span></div>
                        <div class="info-item"><span class="info-label">Accuracy</span><span class="info-value">${move.accuracy ?? '—'}</span></div>
                        <div class="info-item"><span class="info-label">PP</span><span class="info-value">${move.pp ?? '—'}</span></div>
                        <div class="info-item"><span class="info-label">Priority</span><span class="info-value">${move.priority > 0 ? '+' + move.priority : move.priority || 0}</span></div>
                    </div>
                    <p class="dex-desc" style="margin-top:1.25rem;text-align:left;">${D.escapeHtml(move.short_descripton || move.short_description || 'No description.')}</p>
                </div>
                <div class="dex-detail-section">
                    <h3>Pokémon that learn this move (${learners.length})</h3>
                    <div class="dex-sprite-row">${sprites || '<span class="dex-desc">No learners in dataset.</span>'}</div>
                </div>
            </div>`;
        modal.open();
    }

    document.getElementById('dex-search').addEventListener('input', applyFilters);
    ['filter-type', 'filter-dmg', 'filter-tag', 'filter-gen', 'sort-primary', 'sort-dir', 'sort-group'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('filter-damaging').addEventListener('change', applyFilters);

    D.POKEMON_TYPES.forEach(t => {
        const o = document.createElement('option');
        o.value = t.toLowerCase();
        o.textContent = t;
        document.getElementById('filter-type').appendChild(o);
    });

    init();
})();
