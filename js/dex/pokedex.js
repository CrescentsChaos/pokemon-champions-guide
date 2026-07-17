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
        const cb = '?v=10.0.1';
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

    function statTier(value) {
        const v = Number(value) || 0;
        if (v >= 150) return { label: 'Elite', cls: 'elite' };
        if (v >= 120) return { label: 'Excellent', cls: 'excellent' };
        if (v >= 100) return { label: 'Great', cls: 'great' };
        if (v >= 80) return { label: 'Solid', cls: 'solid' };
        if (v >= 60) return { label: 'Average', cls: 'average' };
        return { label: 'Low', cls: 'low' };
    }

    function bstTier(total) {
        const v = Number(total) || 0;
        if (v >= 670) return 'Restricted / Legendary tier';
        if (v >= 600) return 'Pseudo-legendary tier';
        if (v >= 535) return 'Strong competitive BST';
        if (v >= 480) return 'Viable competitive BST';
        if (v >= 420) return 'Support / niche BST';
        return 'Below typical competitive BST';
    }

    function matchupChip(entry) {
        const multLabel = entry.mult === 0 ? '0×'
            : entry.mult === 0.25 ? '¼×'
            : entry.mult === 0.5 ? '½×'
            : entry.mult === 2 ? '2×'
            : entry.mult >= 4 ? '4×'
            : `${entry.mult}×`;
        return `<span class="pkd-matchup-chip" title="${D.escapeHtml(entry.type)} deals ${multLabel} damage" style="--chip:${D.typeColor(entry.type)}">
            ${D.typeIconHtml(entry.type, 18)}
            <span>${D.escapeHtml(entry.type)}</span>
            <em>${multLabel}</em>
        </span>`;
    }

    function matchupGroup(title, entries, tone) {
        if (!entries.length) return '';
        return `<div class="pkd-matchup-group pkd-matchup-group--${tone}">
            <div class="pkd-matchup-group__head"><span>${title}</span><strong>${entries.length}</strong></div>
            <div class="pkd-matchup-chips">${entries.map(matchupChip).join('')}</div>
        </div>`;
    }

    function showDetail(p) {
        const body = document.getElementById('dex-modal-body');
        const abilities = Array.isArray(p.Ability) ? p.Ability : [];
        const moves = Array.isArray(p.Moves) ? p.Moves : [];
        const items = Array.isArray(p.Items) ? p.Items : [];
        const teammates = Array.isArray(p.Teammates) ? p.Teammates : [];
        const types = [p.Type_1, p.Type_2].filter(t => t && t !== 'None');
        const c1 = D.typeColor(p.Type_1);
        const c2 = p.Type_2 && p.Type_2 !== 'None' ? D.typeColor(p.Type_2) : c1;
        const matchups = D.getDefensiveMatchups(types);
        const encName = encodeURIComponent(p.Name);

        const badges = [];
        if (p.inChampions) badges.push({ text: 'Champions', cls: 'champions' });
        if (p.Is_Legendary) badges.push({ text: 'Legendary', cls: 'legendary' });
        if (p.Is_Mythical) badges.push({ text: 'Mythical', cls: 'mythical' });
        if (p.Is_Pseudo_Legendary) badges.push({ text: 'Pseudo-Legendary', cls: 'pseudo' });
        if (p.Is_Baby) badges.push({ text: 'Baby', cls: 'baby' });
        if (p.Past_Type) badges.push({ text: `Past: ${p.Past_Type}`, cls: 'past' });

        const abilityHtml = abilities.map((a, i) => {
            const meta = abilitiesMap[D.normalizeKey(a)];
            const desc = meta?.description || meta?.short_description || 'No ability description available.';
            const slot = abilities.length === 1 ? 'Ability' : `Ability ${i + 1}`;
            return `<article class="pkd-ability">
                <div class="pkd-ability__top">
                    <span class="pkd-ability__slot">${slot}</span>
                    <h4>${D.escapeHtml(a)}</h4>
                </div>
                <p>${D.escapeHtml(desc)}</p>
            </article>`;
        }).join('') || '<p class="pkd-empty-note">No ability data.</p>';

        const stats = [
            { key: 'hp', label: 'HP', full: 'Hit Points', value: p.HP },
            { key: 'atk', label: 'ATK', full: 'Attack', value: p.Attack },
            { key: 'def', label: 'DEF', full: 'Defense', value: p.Defense },
            { key: 'spa', label: 'SPA', full: 'Sp. Attack', value: p['Sp.Atk'] },
            { key: 'spd', label: 'SPD', full: 'Sp. Defense', value: p['Sp.Def'] },
            { key: 'spe', label: 'SPE', full: 'Speed', value: p.Speed }
        ];
        const maxStat = Math.max(...stats.map(s => Number(s.value) || 0), 1);
        const statsHtml = stats.map(s => {
            const tier = statTier(s.value);
            const pct = Math.min(100, (Number(s.value) / 255) * 100);
            const highlight = Number(s.value) === maxStat ? ' pkd-stat--peak' : '';
            return `<div class="pkd-stat${highlight}" title="${s.full}">
                <div class="pkd-stat__meta">
                    <span class="pkd-stat__label">${s.label}</span>
                    <span class="pkd-stat__tier pkd-stat__tier--${tier.cls}">${tier.label}</span>
                </div>
                <div class="pkd-stat__bar"><span class="pkd-stat__fill stat-${s.key}" style="width:${pct}%"></span></div>
                <span class="pkd-stat__val mono">${s.value ?? '—'}</span>
            </div>`;
        }).join('');

        const resolvedMoves = moves.map(mName => {
            const m = findMove(mName) || { name: mName, type: 'Normal', damage_class: 'Status' };
            return { ...m, _name: m.name || mName };
        }).sort((a, b) => {
            const aStab = types.some(t => D.capitalizeType(t) === D.capitalizeType(a.type)) ? 1 : 0;
            const bStab = types.some(t => D.capitalizeType(t) === D.capitalizeType(b.type)) ? 1 : 0;
            if (aStab !== bStab) return bStab - aStab;
            return (Number(b.power) || 0) - (Number(a.power) || 0);
        });

        const counts = {
            all: resolvedMoves.length,
            physical: resolvedMoves.filter(m => (m.damage_class || '').toLowerCase() === 'physical').length,
            special: resolvedMoves.filter(m => (m.damage_class || '').toLowerCase() === 'special').length,
            status: resolvedMoves.filter(m => (m.damage_class || 'status').toLowerCase() === 'status').length
        };

        const movesHtml = resolvedMoves.map(m => {
            const desc = m.short_descripton || m.short_description || m.description || '';
            const cls = (m.damage_class || 'Status').toLowerCase();
            const isStab = types.some(t => D.capitalizeType(t) === D.capitalizeType(m.type));
            const tags = m.tags ? D.moveTagsHtml(m.tags) : '';
            return `<article class="pkd-move" data-class="${cls}" data-name="${D.escapeHtml((m._name || '').toLowerCase())}" data-type="${D.escapeHtml((m.type || '').toLowerCase())}">
                <div class="pkd-move__main">
                    <div class="pkd-move__title">
                        <h4>${D.escapeHtml(m._name)}</h4>
                        ${isStab ? '<span class="pkd-stab">STAB</span>' : ''}
                    </div>
                    <div class="pkd-move__nums">
                        <span><em>PWR</em>${m.power ?? '—'}</span>
                        <span><em>ACC</em>${m.accuracy ?? '—'}</span>
                        <span><em>PP</em>${m.pp ?? '—'}</span>
                        ${m.priority ? `<span><em>PRI</em>+${m.priority}</span>` : ''}
                    </div>
                    ${tags ? `<div class="pkd-move__tags">${tags}</div>` : ''}
                    ${desc ? `<p class="pkd-move__desc">${D.escapeHtml(desc)}</p>` : ''}
                </div>
                <div class="pkd-move__side">
                    ${D.typeIconHtml(m.type, 28)}
                    ${D.dmgClassHtml(m.damage_class, 16)}
                </div>
            </article>`;
        }).join('') || '<p class="pkd-empty-note">No move data.</p>';

        const itemsHtml = items.map(it => {
            const js = D.escapeJs(it);
            const url = D.getItemSpriteUrl(it);
            return `<div class="pkd-item" title="${D.escapeHtml(it)}">
                <div class="pkd-item__icon"><img src="${url}" alt="" onerror="DexShared.handleItemError(this,'${js}')"></div>
                <span>${D.escapeHtml(it)}</span>
            </div>`;
        }).join('');

        const teammateHtml = teammates.map(t => `
            <button type="button" class="pkd-teammate" data-species="${D.escapeHtml(t)}" title="Open ${D.escapeHtml(t)}">
                ${D.spriteImgHtml(t, 'dex-sprite-mini')}
                <span>${D.escapeHtml(t)}</span>
            </button>
        `).join('');

        const eggGroups = [p.Egg_Group_1, p.Egg_Group_2].filter(Boolean).join(' / ') || '—';

        body.innerHTML = `
            <div class="pkd-detail" style="--type-a:${c1};--type-b:${c2}">
                <div class="pkd-hero">
                    <div class="pkd-hero__glow" aria-hidden="true"></div>
                    <div class="pkd-hero__sprite">
                        ${D.spriteImgHtml(p.Name, 'pkd-sprite')}
                    </div>
                    <div class="pkd-hero__copy">
                        <div class="pkd-hero__id mono">National Dex · #${String(p.id).padStart(4, '0')}</div>
                        <h2 id="pkd-detail-title" class="pkd-hero__name">${D.escapeHtml(p.Name)}</h2>
                        <div class="pkd-hero__types">${types.map(t => `
                            <span class="pkd-type-pill" style="--t:${D.typeColor(t)}">
                                ${D.typeIconHtml(t, 22)}
                                <span>${D.escapeHtml(t)}</span>
                            </span>
                        `).join('')}</div>
                        ${badges.length ? `<div class="pkd-badges">${badges.map(b => `<span class="pkd-badge pkd-badge--${b.cls}">${D.escapeHtml(b.text)}</span>`).join('')}</div>` : ''}
                        <div class="pkd-hero__actions">
                            <a class="pkd-action pkd-action--primary" href="${D.ASSET_PREFIX}counter/?species=${encName}">Find counters</a>
                            <a class="pkd-action" href="${D.ASSET_PREFIX}builds/?search=${encName}">Browse builds</a>
                            <a class="pkd-action" href="${D.ASSET_PREFIX}calc/">Open calc</a>
                            <a class="pkd-action" href="${D.ASSET_PREFIX}compare/">Compare</a>
                        </div>
                    </div>
                    <div class="pkd-hero__bst">
                        <span class="pkd-hero__bst-label">Base Stat Total</span>
                        <strong class="mono">${p.Total_Stats || '—'}</strong>
                        <span class="pkd-hero__bst-note">${bstTier(p.Total_Stats)}</span>
                    </div>
                </div>

                <div class="pkd-layout">
                    <aside class="pkd-col pkd-col--side">
                        <div class="pkd-panel">
                            <h3 class="pkd-panel__title">Profile</h3>
                            <div class="pkd-facts">
                                <div class="pkd-fact"><span>Height</span><strong>${p['Height(m)'] ?? '—'} m</strong></div>
                                <div class="pkd-fact"><span>Weight</span><strong>${p['Weight{kg}'] ?? '—'} kg</strong></div>
                                <div class="pkd-fact"><span>Generation</span><strong>${D.escapeHtml(p.Generation || '—')}</strong></div>
                                <div class="pkd-fact"><span>Catch Rate</span><strong>${p.Capture_Rate ?? '—'}</strong></div>
                                <div class="pkd-fact"><span>Base Friendship</span><strong>${p.Base_Happiness ?? '—'}</strong></div>
                                <div class="pkd-fact"><span>Egg Cycles</span><strong>${p.Egg_Cycles ?? '—'}</strong></div>
                                <div class="pkd-fact pkd-fact--wide"><span>Egg Groups</span><strong>${D.escapeHtml(eggGroups)}</strong></div>
                            </div>
                        </div>

                        <div class="pkd-panel">
                            <h3 class="pkd-panel__title">Abilities</h3>
                            <div class="pkd-ability-list">${abilityHtml}</div>
                        </div>

                        ${items.length ? `<div class="pkd-panel">
                            <h3 class="pkd-panel__title">Common Items</h3>
                            <div class="pkd-item-list">${itemsHtml}</div>
                        </div>` : ''}

                        ${teammates.length ? `<div class="pkd-panel">
                            <h3 class="pkd-panel__title">Suggested Teammates</h3>
                            <div class="pkd-teammate-list">${teammateHtml}</div>
                        </div>` : ''}
                    </aside>

                    <div class="pkd-col pkd-col--main">
                        <div class="pkd-panel">
                            <div class="pkd-panel__head">
                                <h3 class="pkd-panel__title">Base Stats</h3>
                                <span class="pkd-panel__meta mono">BST ${p.Total_Stats || '—'}</span>
                            </div>
                            <div class="pkd-stats">${statsHtml}</div>
                        </div>

                        <div class="pkd-panel">
                            <div class="pkd-panel__head">
                                <h3 class="pkd-panel__title">Type Defense</h3>
                                <span class="pkd-panel__meta">Incoming damage multipliers</span>
                            </div>
                            <div class="pkd-matchups">
                                ${matchupGroup('4× Weak', matchups.quad, 'quad')}
                                ${matchupGroup('2× Weak', matchups.double, 'weak')}
                                ${matchupGroup('½× Resist', matchups.half, 'resist')}
                                ${matchupGroup('¼× Resist', matchups.quarter, 'quarter')}
                                ${matchupGroup('Immune', matchups.immune, 'immune')}
                            </div>
                        </div>

                        <div class="pkd-panel pkd-panel--moves">
                            <div class="pkd-panel__head pkd-moves-head">
                                <div>
                                    <h3 class="pkd-panel__title">Moveset</h3>
                                    <span class="pkd-panel__meta">${moves.length} moves · STAB sorted first</span>
                                </div>
                                <label class="pkd-move-search">
                                    <span class="visually-hidden">Filter moves</span>
                                    <input type="search" id="pkd-move-filter" placeholder="Filter moves…" autocomplete="off">
                                </label>
                            </div>
                            <div class="pkd-move-tabs" role="tablist" aria-label="Move category">
                                <button type="button" class="pkd-move-tab is-active" data-filter="all" role="tab" aria-selected="true">All <em>${counts.all}</em></button>
                                <button type="button" class="pkd-move-tab" data-filter="physical" role="tab" aria-selected="false">Physical <em>${counts.physical}</em></button>
                                <button type="button" class="pkd-move-tab" data-filter="special" role="tab" aria-selected="false">Special <em>${counts.special}</em></button>
                                <button type="button" class="pkd-move-tab" data-filter="status" role="tab" aria-selected="false">Status <em>${counts.status}</em></button>
                            </div>
                            <div class="pkd-move-list" id="pkd-move-list">${movesHtml}</div>
                            <p class="pkd-move-empty" id="pkd-move-empty" hidden>No moves match this filter.</p>
                        </div>
                    </div>
                </div>
            </div>`;

        // Move filters
        let activeClass = 'all';
        const list = document.getElementById('pkd-move-list');
        const empty = document.getElementById('pkd-move-empty');
        const filterInput = document.getElementById('pkd-move-filter');

        function applyMoveFilter() {
            const q = (filterInput?.value || '').toLowerCase().trim();
            let visible = 0;
            list.querySelectorAll('.pkd-move').forEach(card => {
                const classOk = activeClass === 'all' || card.dataset.class === activeClass;
                const textOk = !q || card.dataset.name.includes(q) || card.dataset.type.includes(q);
                const show = classOk && textOk;
                card.hidden = !show;
                if (show) visible++;
            });
            if (empty) empty.hidden = visible > 0;
        }

        body.querySelectorAll('.pkd-move-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeClass = tab.dataset.filter;
                body.querySelectorAll('.pkd-move-tab').forEach(t => {
                    const on = t === tab;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                applyMoveFilter();
            });
        });
        filterInput?.addEventListener('input', applyMoveFilter);

        body.querySelectorAll('.pkd-teammate').forEach(btn => {
            btn.addEventListener('click', () => {
                const species = btn.dataset.species;
                const mon = allPokemon.find(x => x.Name === species);
                if (mon) showDetail(mon);
            });
        });

        modal.open();
        const title = document.getElementById('pkd-detail-title');
        if (title) title.setAttribute('tabindex', '-1');
        const overlay = document.getElementById('dex-detail-modal');
        if (overlay) overlay.scrollTop = 0;
        const content = overlay?.querySelector('.pkd-modal-content');
        if (content) content.scrollTop = 0;
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

