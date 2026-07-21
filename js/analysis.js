/**
 * Shared Team Analysis Logic — Champions Guide / VGC
 */

(function injectAnalysisStyles() {
    const sub = ['/builds/', '/teambuilder/', '/calc/', '/compare/', '/counter/', '/pokedex/', '/movedex/', '/abilitydex/', '/itemdex/'];
    const isSub = sub.some(d => window.location.pathname.toLowerCase().includes(d));
    const prefix = isSub ? '../' : '';
    if (!document.getElementById('analysis-css')) {
        const link = document.createElement('link');
        link.id = 'analysis-css';
        link.rel = 'stylesheet';
        link.href = prefix + 'css/analysis.css?v=4';
        document.head.appendChild(link);
    }
})();

function getAssetPrefix() {
    const sub = ['/builds/', '/teambuilder/', '/calc/', '/compare/', '/counter/', '/pokedex/', '/movedex/', '/abilitydex/', '/itemdex/'];
    return sub.some(d => window.location.pathname.toLowerCase().includes(d)) ? '../' : '';
}

function typeIconSrc(type) {
    return `${getAssetPrefix()}assets/type-icons/${(type || 'normal').toLowerCase()}_type.png`;
}

const TYPE_CHART = {
    'Normal': { 'Rock': 0.5, 'Ghost': 0, 'Steel': 0.5 },
    'Fire': { 'Fire': 0.5, 'Water': 0.5, 'Grass': 2, 'Ice': 2, 'Bug': 2, 'Rock': 0.5, 'Dragon': 0.5, 'Steel': 2 },
    'Water': { 'Fire': 2, 'Water': 0.5, 'Grass': 0.5, 'Ground': 2, 'Rock': 2, 'Dragon': 0.5 },
    'Electric': { 'Water': 2, 'Electric': 0.5, 'Grass': 0.5, 'Ground': 0, 'Flying': 2, 'Dragon': 0.5 },
    'Grass': { 'Fire': 0.5, 'Water': 2, 'Grass': 0.5, 'Poison': 0.5, 'Ground': 2, 'Flying': 0.5, 'Bug': 0.5, 'Rock': 2, 'Dragon': 0.5, 'Steel': 0.5 },
    'Ice': { 'Fire': 0.5, 'Water': 0.5, 'Grass': 2, 'Ice': 0.5, 'Ground': 2, 'Flying': 2, 'Dragon': 2, 'Steel': 0.5 },
    'Fighting': { 'Normal': 2, 'Ice': 2, 'Poison': 0.5, 'Flying': 0.5, 'Psychic': 0.5, 'Bug': 0.5, 'Rock': 2, 'Ghost': 0, 'Dark': 2, 'Steel': 2, 'Fairy': 0.5 },
    'Poison': { 'Grass': 2, 'Poison': 0.5, 'Ground': 0.5, 'Rock': 0.5, 'Ghost': 0.5, 'Steel': 0, 'Fairy': 2 },
    'Ground': { 'Fire': 2, 'Water': 1, 'Electric': 2, 'Grass': 0.5, 'Ice': 1, 'Poison': 2, 'Flying': 0, 'Bug': 0.5, 'Rock': 2, 'Steel': 2 },
    'Flying': { 'Electric': 0.5, 'Grass': 2, 'Fighting': 2, 'Bug': 2, 'Rock': 0.5, 'Steel': 0.5 },
    'Psychic': { 'Fighting': 2, 'Poison': 2, 'Psychic': 0.5, 'Dark': 0, 'Steel': 0.5 },
    'Bug': { 'Fire': 0.5, 'Grass': 2, 'Fighting': 0.5, 'Poison': 0.5, 'Flying': 0.5, 'Psychic': 2, 'Ghost': 0.5, 'Dark': 2, 'Steel': 0.5, 'Fairy': 0.5 },
    'Rock': { 'Fire': 2, 'Ice': 2, 'Fighting': 0.5, 'Ground': 0.5, 'Flying': 2, 'Bug': 2, 'Steel': 0.5 },
    'Ghost': { 'Normal': 0, 'Psychic': 2, 'Ghost': 2, 'Dark': 0.5 },
    'Dragon': { 'Dragon': 2, 'Steel': 0.5, 'Fairy': 0 },
    'Dark': { 'Fighting': 0.5, 'Psychic': 2, 'Ghost': 2, 'Dark': 0.5, 'Fairy': 0.5 },
    'Steel': { 'Fire': 0.5, 'Water': 0.5, 'Electric': 0.5, 'Ice': 2, 'Rock': 2, 'Steel': 0.5, 'Fairy': 2 },
    'Fairy': { 'Fire': 0.5, 'Fighting': 2, 'Poison': 0.5, 'Dragon': 2, 'Dark': 2, 'Steel': 0.5 },
    'Stellar': { 'Stellar': 2 }
};

const roleDescriptions = {
    'Physical Sweeper': 'Fast, high physical damage output designed to clean up late-game.',
    'Special Sweeper': 'Fast, high special damage output designed to clean up late-game.',
    'Wallbreaker': 'Extreme damage output meant to break through defensive cores.',
    'Setup Sweeper': 'Uses stat-boosting moves before sweeping the opposing team.',
    'Revenge Killer': 'Extremely fast (often Choice Scarf) to outspeed and KO weakened threats.',
    'Trick Room Abuser': 'Slow and powerful; thrives when Trick Room is active.',
    'Physical Wall': 'High HP and Defense to absorb physical attacks.',
    'Special Wall': 'High HP and Sp. Defense to absorb special attacks.',
    'Generalist': 'Balanced stats with no single extreme specialization.',
    'Pivot': 'Uses U-turn, Volt Switch, etc., to safely bring in teammates.',
    'Hazard Setter': 'Deploys Stealth Rock, Spikes, or Sticky Web to wear down foes.',
    'Hazard Control': 'Removes field hazards using Rapid Spin or Defog.',
    'Cleric/Healer': 'Provides team support via Wish, Aromatherapy, or Heal Bell.',
    'Screener': 'Sets Reflect and Light Screen to halve incoming damage.',
    'Disruptor': 'Spreads status conditions (Burn, Paralysis, Sleep) to cripple foes.',
    'Phazer/Hazer': 'Forces switches or removes stat boosts to stop sweeps.',
    'Weather Setter': 'Automatically or manually establishes weather conditions.',
    'Weather Abuser': 'Gains massive benefits (Speed, Power) in specific weather.',
    'Terrain Setter': 'Automatically or manually establishes terrain conditions.',
    'Terrain Abuser': 'Gains massive benefits in specific terrain.',
    'Damage Amplification': 'Boosts ally damage via Helping Hand or specific abilities.',
    'Fake Out Pressure': 'Provides free turns and chip damage using Fake Out.',
    'Priority Denial': 'Blocks priority moves to protect fast frail teammates.',
    'Redirection': 'Draws attacks away from allies using Follow Me or Rage Powder.',
    'Damage Mitigation': 'Lowers enemy damage output via Intimidate, Parting Shot, or screens.',
    'Trick Room Setter': 'Reliably sets Trick Room to reverse turn order.',
    'Speed Control': 'Alters speed dynamics using Tailwind, Icy Wind, or Electroweb.',
    'Restricted Legendary': 'Extremely high Base Stat Total (670+), defining the metagame.'
};

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

function getEffectiveness(attackType, defenseTypes) {
    let mult = 1;
    defenseTypes.forEach(t => {
        if (!t) return;
        const chart = TYPE_CHART[capitalize(attackType)];
        if (chart && chart[capitalize(t)] !== undefined) {
            mult *= chart[capitalize(t)];
        }
    });
    return mult;
}

function getWeaknesses(types) {
    if (!types || types.length === 0) return [];
    const result = [];
    Object.keys(TYPE_CHART).forEach(atkType => {
        const eff = getEffectiveness(atkType, types);
        if (eff > 1) result.push(atkType.toLowerCase());
    });
    return result;
}

function normalizeMoveKey(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getMonDb(p) {
    if (typeof allPokemon === 'undefined' || !p?.species) return null;
    if (typeof getEffectivePokemonData === 'function') {
        return getEffectivePokemonData(p, allPokemon) || null;
    }
    const key = normalizeSpeciesKey(p.species);
    return allPokemon.find(x => normalizeSpeciesKey(x.Name) === key) || null;
}

function getMonSpeed(p, db, format = 'Singles') {
    if (!db) return null;
    if (typeof buildCalcStateFromSlot === 'function' && typeof getEffectiveSpeed === 'function' && typeof getDefaultField === 'function') {
        const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
        const state = buildCalcStateFromSlot(p, 1, db, movesDb);
        return getEffectiveSpeed(state, getDefaultField(format));
    }
    if (typeof calculateStat === 'function') {
        return calculateStat(db.Speed || 0, p.ivs?.spe, p.evs?.spe, p.level, p.nature, 'spe');
    }
    return parseInt(db.Speed, 10) || 0;
}

function checkSlotChampionsEligible(p) {
    const db = getMonDb(p);
    const reasons = [];
    if (!db) {
        reasons.push('Species not in dataset');
        return { eligible: false, reasons };
    }
    if (db.inChampions !== true) reasons.push('Pokémon not Champions-eligible');

    const itemName = (p.item || '').trim();
    if (itemName && itemName.toLowerCase() !== 'none' && typeof allItems !== 'undefined') {
        const itemKey = normalizeMoveKey(itemName);
        const itemData = allItems.find(i => normalizeMoveKey(i.name || i.Name) === itemKey);
        if (!itemData || itemData.inChampions !== true) reasons.push(`Item: ${itemName}`);
    }

    const allowedMoves = new Set((db.Moves || []).map(m => normalizeMoveKey(m)));
    (p.moves || []).filter(Boolean).forEach(m => {
        if (!allowedMoves.has(normalizeMoveKey(m))) reasons.push(`Move: ${m}`);
    });

    return { eligible: reasons.length === 0, reasons };
}

function escapeAnalysisHtml(value) {
    return (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function championsReasonClass(reason) {
    if ((reason || '').startsWith('Item:')) return 'item';
    if ((reason || '').startsWith('Move:')) return 'move';
    return 'species';
}

function renderChampionsReasonsHtml(reasons, compact = false) {
    if (!reasons || !reasons.length) return '';
    const compactCls = compact ? ' analysis-champ-reasons--compact' : '';
    return `<div class="analysis-champ-reasons${compactCls}">${reasons.map(r =>
        `<span class="analysis-champ-reason analysis-champ-reason--${championsReasonClass(r)}">${escapeAnalysisHtml(r)}</span>`
    ).join('')}</div>`;
}

function renderChampionsCompliancePanel(activeMons, checks) {
    const illegal = activeMons.map((p, i) => ({ species: p.species || 'Unknown', check: checks[i] }))
        .filter(entry => entry.check && !entry.check.eligible);
    if (!illegal.length) return '';

    const rows = illegal.map(entry => `
        <div class="analysis-champions-detail__row">
            <span class="analysis-champions-detail__name">${escapeAnalysisHtml(entry.species)}</span>
            ${renderChampionsReasonsHtml(entry.check.reasons)}
        </div>`).join('');

    return `
        <div class="analysis-champions-detail">
            <div class="analysis-champions-detail__head">
                <span class="analysis-champions-detail__title">Champions Incompatibility</span>
                <span class="analysis-champions-detail__count">${illegal.length} slot${illegal.length > 1 ? 's' : ''} blocked</span>
            </div>
            ${rows}
        </div>`;
}

function scoreLeadFitness(mon, monRoles, ctx, format) {
    const moves = (mon.moves || []).map(m => normalizeMoveKey(m));
    const speed = getMonSpeed(mon, getMonDb(mon), ctx.format) || 0;
    let score = 0;

    if (monRoles.includes('Fake Out Pressure') || moves.includes('fakeout')) score += 42;
    if (monRoles.includes('Redirection') || moves.includes('followme') || moves.includes('ragepowder')) score += 38;
    if (monRoles.includes('Trick Room Setter') || moves.includes('trickroom')) score += ctx.utils?.tr ? 48 : 12;
    if (monRoles.includes('Speed Control') || moves.includes('tailwind')) score += 36;
    if (monRoles.includes('Hazard Setter') && format === 'Singles') score += 34;
    if (moves.includes('protect')) score += 10;
    if (monRoles.includes('Disruptor')) score += 18;
    if (speed >= 110) score += 14;
    else if (speed >= 85) score += 8;

    if (monRoles.includes('Setup Sweeper')) score -= 28;
    if (monRoles.includes('Restricted Legendary') && !monRoles.includes('Redirection') && !monRoles.includes('Fake Out Pressure')) score -= 18;
    if (monRoles.includes('Trick Room Abuser') && !monRoles.includes('Trick Room Setter')) score -= 22;
    if (monRoles.includes('Revenge Killer')) score -= 15;
    if (speed < 50 && !ctx.utils?.tr && format === 'Doubles') score -= 12;

    if (format === 'Singles') {
        if (monRoles.includes('Physical Sweeper') || monRoles.includes('Special Sweeper')) score += 12;
        if (monRoles.includes('Wallbreaker')) score += 8;
    }

    return score;
}

function explainLeadReason(mon, monRoles, ctx, format) {
    const moves = (mon.moves || []).map(m => normalizeMoveKey(m));
    if (moves.includes('fakeout')) return 'Fake Out disrupts the fastest threat Turn 1.';
    if (moves.includes('followme') || moves.includes('ragepowder')) return 'Redirects attacks so your partner attacks freely.';
    if (moves.includes('trickroom')) return 'Sets Trick Room to flip speed matchups.';
    if (moves.includes('tailwind')) return 'Tailwind doubles team speed for four turns.';
    if (monRoles.includes('Hazard Setter')) return 'Strong singles opener — lays hazards before pivoting.';
    if (monRoles.includes('Physical Sweeper') || monRoles.includes('Special Sweeper')) return 'Offensive ace — apply immediate pressure.';
    if (monRoles.includes('Setup Sweeper')) return 'Late-game sweeper — keep in back until supports set up.';
    if (monRoles.includes('Physical Wall') || monRoles.includes('Special Wall')) return 'Defensive pivot — safe switch-in after scouting.';
    return format === 'Doubles' ? 'Flexible lead based on matchup.' : 'Predicted lead based on role and speed.';
}

function predictLineup(activeMons, roles, format, ctx) {
    if (!activeMons.length) {
        return { leadIndices: [], backIndices: [], leads: [], backMons: [], leadReasons: [] };
    }

    const scores = activeMons.map((mon, i) => ({
        i,
        species: mon.species,
        score: scoreLeadFitness(mon, roles[i] || [], ctx, format)
    }));

    if (format === 'Doubles' && activeMons.length >= 2) {
        scores.sort((a, b) => b.score - a.score);
        const leadIndices = [scores[0].i];
        const second = scores.find(s => s.i !== leadIndices[0]) || scores[1];
        if (second) leadIndices.push(second.i);
        const backIndices = activeMons.map((_, idx) => idx).filter(idx => !leadIndices.includes(idx));
        return {
            leadIndices,
            backIndices,
            leads: leadIndices.map(i => activeMons[i]),
            backMons: backIndices.map(i => activeMons[i]),
            leadReasons: leadIndices.map(i => explainLeadReason(activeMons[i], roles[i] || [], ctx, format))
        };
    }

    scores.sort((a, b) => b.score - a.score);
    const leadIdx = scores[0].i;
    const backIndices = activeMons.map((_, i) => i).filter(i => i !== leadIdx);
    return {
        leadIndices: [leadIdx],
        backIndices,
        leads: [activeMons[leadIdx]],
        backMons: backIndices.map(i => activeMons[i]),
        leadReasons: [explainLeadReason(activeMons[leadIdx], roles[leadIdx] || [], ctx, format)]
    };
}

function buildTeamContext(activeMons, format, coverage, weaknesses, resistances, roles) {
    const moves = activeMons.flatMap(p => (p.moves || []).map(m => normalizeMoveKey(m)));
    const hasMove = (list) => list.some(m => moves.includes(m));
    const speciesList = activeMons.map(p => normalizeSpeciesKey(p.species));
    const abilities = activeMons.map(p => (p.ability || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const flatRoles = roles.flat();
    const activeTypes = new Set(activeMons.flatMap(p => {
        const db = getMonDb(p);
        return [db?.Type_1, db?.Type_2].filter(Boolean);
    }));
    const teraTypes = activeMons.map(p => (p.tera || 'Normal').toLowerCase());
    const items = activeMons.map(p => (p.item || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(i => i && i !== 'none');
    const duplicateItems = [...new Set(items.filter((item, idx) => items.indexOf(item) !== idx))];
    const restrictedCount = activeMons.filter((p, i) => {
        const db = getMonDb(p);
        const bst = parseInt(db?.Total_Stats, 10) || 0;
        return bst >= 670 || (roles[i] || []).includes('Restricted Legendary');
    }).length;
    const championsChecks = activeMons.map(p => checkSlotChampionsEligible(p));
    const championsEligible = championsChecks.filter(c => c.eligible).length;
    const speeds = activeMons.map(p => getMonSpeed(p, getMonDb(p), format)).filter(s => s != null);
    const speedTiers = { fast: 0, mid: 0, slow: 0, trAbuser: 0 };
    activeMons.forEach((p, i) => {
        const speed = getMonSpeed(p, getMonDb(p), format);
        const monRoles = roles[i] || [];
        if (monRoles.includes('Trick Room Abuser') || (speed != null && speed < 55)) speedTiers.trAbuser++;
        else if (speed != null && speed >= 100) speedTiers.fast++;
        else if (speed != null && speed >= 55) speedTiers.mid++;
        else speedTiers.slow++;
    });

    const spreadMoveKeys = ['earthquake', 'heatwave', 'rockslide', 'dazzlinggleam', 'makeitrain', 'bleakwindstorm', 'expandingforce', 'hypervoice', 'snarl', 'muddywater', 'surf', 'discharge', 'bulldoze', 'electroweb', 'breakingswipe', 'precipiceblades', 'originpulse', 'glaciate', 'dragonenergy', 'hypervoice'];

    let physicalMoveCount = 0;
    let specialMoveCount = 0;
    activeMons.forEach(p => {
        (p.moves || []).filter(Boolean).forEach(m => {
            const key = normalizeMoveKey(m);
            const ref = (typeof movesMap !== 'undefined' && movesMap[key]) ? movesMap[key]
                : (typeof allMoves !== 'undefined' ? allMoves.find(x => normalizeMoveKey(x.name) === key) : null);
            if (!ref) return;
            const dc = (ref.damage_class || ref.category || '').toLowerCase();
            if (dc === 'physical') physicalMoveCount++;
            else if (dc === 'special') specialMoveCount++;
        });
    });

    const ctxBase = {
        coverage, weaknesses, resistances, format,
        flatRoles, moves, abilities, activeTypes, speciesList, teraTypes,
        items, duplicateItems, restrictedCount, championsEligible, championsChecks,
        speeds, speedTiers,
        teamSize: activeMons.length, physicalMoveCount, specialMoveCount,
        hasSpecies: (names) => names.some(n => speciesList.includes(normalizeSpeciesKey(n))),
        hasAbility: (list) => list.some(a => abilities.includes(a.toLowerCase().replace(/[^a-z0-9]/g, ''))),
        roleCount: (role) => flatRoles.filter(r => r === role).length,
        utils: null
    };

    const spreadMoveKeysRef = spreadMoveKeys;
    ctxBase.utils = {
        hazards: hasMove(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'ceaselessedge', 'stoneaxe']),
        removal: hasMove(['rapidspin', 'defog', 'mortalspin', 'tidypup', 'courtchange']),
        tailwind: hasMove(['tailwind']),
        tr: hasMove(['trickroom']),
        fakeout: hasMove(['fakeout']),
        redirection: hasMove(['followme', 'ragepowder', 'allyswitch']),
        helpinghand: hasMove(['helpinghand']),
        protect: hasMove(['protect', 'detect', 'spikyshield', 'banefulbunker', 'kingsshield', 'silktrap', 'burningbulwark']),
        wideguard: hasMove(['wideguard']),
        quickguard: hasMove(['quickguard']),
        spread: hasMove(spreadMoveKeysRef),
        priority: hasMove(['extremespeed', 'suckerpunch', 'aquajet', 'machpunch', 'bulletpunch', 'iceshard', 'shadowsneak', 'vacuumwave', 'watershuriken', 'grassyglide', 'firstimpression', 'accelerock', 'thunderclap']),
        intimidate: abilities.includes('intimidate') || speciesList.includes('incineroar') || speciesList.includes('landorustherian'),
        drizzle: abilities.includes('drizzle') || hasMove(['raindance']),
        drought: abilities.includes('drought') || hasMove(['sunnyday']),
        snow: abilities.includes('snowwarning') || hasMove(['snowscape', 'chillyreception']),
        sand: abilities.includes('sandstream') || hasMove(['sandstorm']),
        psychicterrain: abilities.includes('psychicsurge') || hasMove(['psychicterrain']),
        grassyterrain: abilities.includes('grassysurge') || hasMove(['grassyterrain']),
        electricterrain: abilities.includes('electricsurge') || hasMove(['electricterrain']),
        expandingforce: hasMove(['expandingforce']),
        makeitrain: hasMove(['makeitrain']),
        partingshot: hasMove(['partingshot']),
        icywind: hasMove(['icywind', 'electroweb', 'bulldoze']),
        screens: hasMove(['reflect', 'lightscreen', 'auroraveil']),
        sleep: hasMove(['spore', 'sleeppowder', 'hypnosis', 'yawn', 'darkvoid']),
        ragepowder: hasMove(['ragepowder']),
        followme: hasMove(['followme'])
    };

    const lineup = predictLineup(activeMons, roles, format, ctxBase);
    return {
        ...ctxBase,
        leadMons: lineup.leads,
        backMons: lineup.backMons,
        leadIndices: lineup.leadIndices,
        backIndices: lineup.backIndices,
        leadReasons: lineup.leadReasons
    };
}

function ensureVgcPanel() {
    let el = document.getElementById('vgc-analysis-panel');
    if (el) return el;
    const scoreboard = document.getElementById('analysis-scoreboard');
    const dashboard = document.getElementById('analysis-dashboard') || document.getElementById('analysis-view');
    if (!dashboard) return null;
    el = document.createElement('div');
    el.id = 'vgc-analysis-panel';
    el.className = 'vgc-analysis-panel';
    if (scoreboard && scoreboard.parentNode) {
        scoreboard.parentNode.insertBefore(el, scoreboard.nextSibling);
    } else {
        const grid = dashboard.querySelector('.analysis-grid');
        if (grid) dashboard.insertBefore(el, grid);
        else dashboard.prepend(el);
    }
    return el;
}

function vgcToolStatus(active, label, tip) {
    const cls = active ? 'vgc-tool-chip--active' : 'vgc-tool-chip--missing';
    return `<span class="vgc-tool-chip ${cls}" title="${tip.replace(/"/g, '&quot;')}">${label}</span>`;
}

function describeLeadPair(ctx, activeMons, roles) {
    if (!activeMons.length) return { label: 'No lead', summary: 'Add Pokémon to evaluate lead options.' };
    const leads = ctx.leadMons && ctx.leadMons.length ? ctx.leadMons : activeMons.slice(0, 2);
    const leadIndices = ctx.leadIndices && ctx.leadIndices.length ? ctx.leadIndices : [0, 1].filter(i => i < activeMons.length);
    const r0 = roles[leadIndices[0]] || [];
    const r1 = roles[leadIndices[1]] || [];
    const names = leads.map(p => p?.species).filter(Boolean);

    if (ctx.utils.fakeout && ctx.utils.tailwind) {
        return {
            label: 'Fake Out + Tailwind',
            summary: `${names.join(' / ')} can buy a Tailwind turn with Fake Out pressure — a premier VGC opener when both are in the lead slot.`
        };
    }
    if (ctx.utils.tr && (r0.includes('Trick Room Setter') || r1.includes('Trick Room Setter'))) {
        return {
            label: 'Trick Room Lead',
            summary: `${names.join(' / ')} should set Trick Room early while the partner absorbs or redirects hits. Protect the setter until TR is up.`
        };
    }
    if (ctx.utils.redirection && ctx.flatRoles.some(r => ['Setup Sweeper', 'Wallbreaker'].includes(r))) {
        return {
            label: 'Redirection + Attacker',
            summary: `Follow Me / Rage Powder from the lead pair frees your restricted or setup threat to attack or Terastallize.`
        };
    }
    if (r0.includes('Fake Out Pressure') || r1.includes('Fake Out Pressure')) {
        return {
            label: 'Disruption Lead',
            summary: `${names.join(' / ')} opens with Fake Out — pair with a Protect user or spread attacker to maximize the free turn.`
        };
    }
    if (ctx.speedTiers.fast >= 2) {
        return {
            label: 'Tempo Lead',
            summary: `Fast dual leads (${names.join(' / ')}) aim to outspeed and apply immediate offensive pressure. Watch for opposing Tailwind or Trick Room.`
        };
    }
    return {
        label: 'Flexible Lead',
        summary: `${names.join(' / ')} — lead based on matchup: bring speed control against faster teams, or bulky pivots vs hard-hitters.`
    };
}

function buildTurnOnePlaybook(ctx, activeMons) {
    const plays = [];
    if (ctx.utils.fakeout) plays.push('Turn 1: Fake Out the fastest opposing threat while your partner attacks or sets field conditions.');
    if (ctx.utils.tailwind) plays.push('Tailwind turn: double into the likely Tailwind setter or Protect scout if unsure of speed.');
    if (ctx.utils.tr) plays.push('Trick Room: lead setter + bulky partner; avoid swapping the setter out before TR resolves.');
    if (ctx.utils.helpinghand) plays.push('Helping Hand: boost a partner\'s spread or single-target KO move for a decisive first strike.');
    if (ctx.utils.intimidate) plays.push('Intimidate cycle: switch Intimidate users to stack Attack drops on physical-heavy opponents.');
    if (ctx.utils.wideguard) plays.push('Wide Guard: block spread moves when both opponents carry Earthquake, Rock Slide, or similar.');
    if (ctx.utils.protect && !ctx.utils.fakeout) plays.push('Protect scouting: one slot Protects while the other attacks — reads opponent doubles targets.');
    if (ctx.utils.spread) plays.push('Spread positioning: mind ally damage on Earthquake / Surf / Discharge — position or use Protect on the partner.');
    if (!plays.length) plays.push('Establish board control: identify the opponent\'s restricted Pokémon and trade favorably into their win condition.');
    return plays.slice(0, 4);
}

function identifyWinConditions(ctx) {
    const wins = [];
    if (ctx.utils.tailwind && ctx.flatRoles.some(r => ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker'].includes(r))) {
        wins.push('Tailwind hyper-offense: double speed, overwhelm with spread and priority before Tailwind expires.');
    }
    if (ctx.utils.tr && ctx.roleCount('Trick Room Abuser') >= 1) {
        wins.push('Trick Room sweep: reverse speed tiers, KO fast opponents while TR is active.');
    }
    if (ctx.roleCount('Setup Sweeper') >= 1 && ctx.utils.redirection) {
        wins.push('Setup win: redirect attacks, set up with stat boosts or Tera, then sweep.');
    }
    if (ctx.utils.drizzle || ctx.utils.drought) {
        wins.push('Weather abuse: control weather turns and capitalize on Swift Swim / Chlorophyll / boosted Fire or Water.');
    }
    if (ctx.utils.psychicterrain && ctx.utils.expandingforce) {
        wins.push('Psychic Terrain: block priority, hit both foes with boosted Expanding Force.');
    }
    if (ctx.restrictedCount >= 1 && ctx.flatRoles.some(r => ['Wallbreaker', 'Restricted Legendary'].includes(r))) {
        wins.push('Restricted carry: protect your restricted Pokémon — Terastallize on the winning turn for a game-closing KO.');
    }
    if (!wins.length) {
        wins.push('Grind advantage: leverage type coverage and Protect pivots to preserve your last healthy Pokémon.');
    }
    return wins.slice(0, 3);
}

function renderSinglesLineupPanel(ctx, activeMons, roles) {
    if (!activeMons.length) return '';
    const leadIdx = ctx.leadIndices?.[0] ?? 0;
    const lead = activeMons[leadIdx];
    const leadReason = ctx.leadReasons?.[0] || explainLeadReason(lead, roles[leadIdx] || [], ctx, 'Singles');
    const backHtml = (ctx.backIndices || []).map(idx => {
        const p = activeMons[idx];
        const reason = explainLeadReason(p, roles[idx] || [], ctx, 'Singles');
        return `<div class="vgc-bench-slot">
            <span class="vgc-bench-slot__name">${p?.species || 'Bench'}</span>
            ${(roles[idx] || []).slice(0, 2).map(r => `<span class="role-badge">${r}</span>`).join('')}
            <span class="vgc-bench-slot__reason">${reason}</span>
        </div>`;
    }).join('');

    return `
        <div class="vgc-analysis-panel__head">
            <span class="vgc-analysis-panel__title">Singles Lineup Prediction</span>
        </div>
        <div class="vgc-analysis-grid">
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Predicted Lead / Ace</h4>
                <div class="vgc-lead-row">
                    <div class="vgc-lead-slot">
                        <span class="vgc-bench-slot__name">${lead?.species || 'Lead'}</span>
                        <span class="vgc-bench-slot__reason">${leadReason}</span>
                    </div>
                </div>
            </div>
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Revenge &amp; Pivot Options</h4>
                <div class="vgc-bench-row">${backHtml || '<span class="analysis-section-note">Fill remaining slots for bench analysis.</span>'}</div>
            </div>
        </div>`;
}

function renderVgcAnalysis(ctx, activeMons, roles) {
    const panel = ensureVgcPanel();
    if (!panel) return;

    if (ctx.format !== 'Doubles') {
        panel.innerHTML = renderSinglesLineupPanel(ctx, activeMons, roles);
        panel.style.display = activeMons.length ? 'block' : 'none';
        return;
    }
    panel.style.display = 'block';

    const lead = describeLeadPair(ctx, activeMons, roles);
    const playbook = buildTurnOnePlaybook(ctx, activeMons);
    const winCons = identifyWinConditions(ctx);
    const tools = [
        { ok: ctx.utils.fakeout, label: 'Fake Out', tip: 'Early-turn flinch pressure' },
        { ok: ctx.utils.protect, label: 'Protect', tip: 'Scout and block double-targets' },
        { ok: ctx.utils.tailwind, label: 'Tailwind', tip: 'Double speed for 4 turns' },
        { ok: ctx.utils.tr, label: 'Trick Room', tip: 'Reverse speed order' },
        { ok: ctx.utils.redirection, label: 'Redirection', tip: 'Follow Me / Rage Powder' },
        { ok: ctx.utils.helpinghand, label: 'Helping Hand', tip: '+50% ally damage' },
        { ok: ctx.utils.spread, label: 'Spread', tip: 'Hit both opponents' },
        { ok: ctx.utils.wideguard, label: 'Wide Guard', tip: 'Block spread moves' },
        { ok: ctx.utils.quickguard, label: 'Quick Guard', tip: 'Block priority' },
        { ok: ctx.utils.icywind, label: 'Speed Drop', tip: 'Icy Wind / Electroweb' },
        { ok: ctx.utils.intimidate, label: 'Intimidate', tip: 'Physical Attack drop' },
        { ok: ctx.utils.sleep, label: 'Sleep', tip: 'Spore / Sleep Powder pressure' }
    ];
    const toolActive = tools.filter(t => t.ok).length;
    const toolScore = Math.round((toolActive / tools.length) * 100);

    const speedBars = [
        { label: 'Fast (100+)', count: ctx.speedTiers.fast, color: '#4caf50' },
        { label: 'Mid (55–99)', count: ctx.speedTiers.mid, color: '#ff9800' },
        { label: 'Slow (<55)', count: ctx.speedTiers.slow, color: '#ef5350' },
        { label: 'TR Abusers', count: ctx.speedTiers.trAbuser, color: '#9c27b0' }
    ];

    const backBench = (ctx.backIndices || []).map((idx) => {
        const p = activeMons[idx];
        const monRoles = (roles[idx] || []).slice(0, 2);
        const reason = explainLeadReason(p, roles[idx] || [], ctx, ctx.format);
        return `<div class="vgc-bench-slot">
            <span class="vgc-bench-slot__name">${(p?.species || 'Slot').split('-')[0]}</span>
            ${monRoles.map(r => `<span class="role-badge">${r}</span>`).join('')}
            <span class="vgc-bench-slot__reason">${reason}</span>
        </div>`;
    }).join('') || '<span class="analysis-section-note">No back-line slots filled.</span>';

    const leadSlots = (ctx.leadIndices || []).map((idx, li) => {
        const p = activeMons[idx];
        const reason = (ctx.leadReasons && ctx.leadReasons[li]) || explainLeadReason(p, roles[idx] || [], ctx, ctx.format);
        return `<div class="vgc-lead-slot">
            <span class="vgc-bench-slot__name">${p?.species || 'Lead'}</span>
            <span class="vgc-bench-slot__reason">${reason}</span>
        </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="vgc-analysis-panel__head">
            <span class="vgc-analysis-panel__title">VGC Doubles Breakdown</span>
            <span class="vgc-analysis-panel__score">Toolkit ${toolScore}%</span>
        </div>
        <div class="vgc-analysis-grid">
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Doubles Toolkit</h4>
                <p class="vgc-analysis-block__desc">${toolActive} of ${tools.length} core VGC tools present. ${toolScore >= 65 ? 'Solid doubles fundamentals.' : toolScore >= 40 ? 'Some gaps — consider Protect, speed control, or redirection.' : 'Missing key doubles support — add Fake Out, Tailwind/TR, or Protect.'}</p>
                <div class="vgc-tool-row">${tools.map(t => vgcToolStatus(t.ok, t.label, t.tip)).join('')}</div>
            </div>
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Speed Profile</h4>
                <p class="vgc-analysis-block__desc">${ctx.utils.tr ? 'Trick Room available — slow mons become fast under TR.' : ctx.utils.tailwind ? 'Tailwind compensates for slower Pokémon.' : ctx.speedTiers.fast >= ctx.teamSize - 1 ? 'Mostly fast — vulnerable to Trick Room and Tailwind.' : 'Mixed speed tiers — mind turn order and speed control wars.'}</p>
                <div class="vgc-speed-bars">
                    ${speedBars.map(b => {
        const pct = ctx.teamSize ? Math.round((b.count / ctx.teamSize) * 100) : 0;
        return `<div class="vgc-speed-bar"><span class="vgc-speed-bar__label">${b.label}</span><div class="vgc-speed-bar__track"><div class="vgc-speed-bar__fill" style="width:${pct}%;background:${b.color}"></div></div><span class="vgc-speed-bar__count">${b.count}</span></div>`;
    }).join('')}
                </div>
            </div>
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Lead Pair — ${lead.label}</h4>
                <p class="vgc-analysis-block__desc">${lead.summary}</p>
                <div class="vgc-lead-row">${leadSlots}</div>
            </div>
            <div class="vgc-analysis-block">
                <h4 class="vgc-analysis-block__title">Predicted Back Line</h4>
                <div class="vgc-bench-row">${backBench}</div>
            </div>
            <div class="vgc-analysis-block vgc-analysis-block--wide">
                <h4 class="vgc-analysis-block__title">Turn 1 Playbook</h4>
                <ul class="vgc-playbook">${playbook.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
            <div class="vgc-analysis-block vgc-analysis-block--wide">
                <h4 class="vgc-analysis-block__title">Win Conditions</h4>
                <ul class="vgc-wincons">${winCons.map(w => `<li>${w}</li>`).join('')}</ul>
            </div>
        </div>`;
}

function ensureScoreboard() {
    let el = document.getElementById('analysis-scoreboard');
    if (el) return el;
    const dashboard = document.getElementById('analysis-dashboard') || document.getElementById('analysis-view');
    const grid = dashboard?.querySelector('.analysis-grid');
    if (!dashboard || !grid) return null;
    el = document.createElement('div');
    el.id = 'analysis-scoreboard';
    el.className = 'analysis-scoreboard';
    dashboard.insertBefore(el, grid);
    return el;
}

function metricTone(value, good = 70, warn = 45) {
    if (value >= good) return 'good';
    if (value >= warn) return 'warn';
    return 'bad';
}

function renderScoreboard(ctx, activeMons) {
    const board = ensureScoreboard();
    if (!board) return;

    const coverageCount = Object.values(ctx.coverage).filter(c => c > 0).length;
    const offenseScore = Math.round((coverageCount / 18) * 100);
    const maxWeak = Math.max(0, ...Object.values(ctx.weaknesses));
    const defenseScore = Math.max(0, Math.min(100, 100 - maxWeak * 18));
    const supportRoles = ['Fake Out Pressure', 'Redirection', 'Speed Control', 'Trick Room Setter', 'Screener', 'Damage Mitigation', 'Cleric/Healer', 'Hazard Control'];
    const supportCount = ctx.flatRoles.filter(r => supportRoles.includes(r)).length;
    const supportScore = Math.min(100, Math.round((supportCount / Math.max(1, ctx.teamSize)) * 100) + (ctx.utils.protect ? 15 : 0));
    const vgcScore = ctx.format === 'Doubles'
        ? Math.min(100, Math.round(
            (ctx.utils.fakeout ? 18 : 0) + (ctx.utils.tailwind || ctx.utils.tr ? 18 : 0) +
            (ctx.utils.redirection ? 14 : 0) + (ctx.utils.spread ? 12 : 0) +
            (ctx.utils.protect ? 14 : 0) + (ctx.utils.helpinghand ? 8 : 0) +
            (ctx.utils.wideguard || ctx.utils.quickguard ? 6 : 0) +
            (ctx.utils.icywind ? 5 : 0) + (ctx.utils.intimidate ? 5 : 0) +
            Math.min(20, offenseScore * 0.2)
        ))
        : Math.min(100, (ctx.utils.hazards ? 20 : 0) + (ctx.utils.removal ? 20 : 0) + (ctx.utils.priority ? 20 : 0) + offenseScore * 0.4);
    const champScore = ctx.teamSize ? Math.round((ctx.championsEligible / ctx.teamSize) * 100) : 0;

    const fmtClass = ctx.format === 'Doubles' ? 'analysis-format-pill analysis-format-pill--doubles' : 'analysis-format-pill';
    const champChips = activeMons.map((p, i) => {
        const check = ctx.championsChecks[i];
        const cls = check.eligible ? 'analysis-champ-chip--ok' : 'analysis-champ-chip--bad';
        const title = check.eligible ? 'Champions legal' : check.reasons.join('; ');
        const reasonHint = check.eligible ? '' : `<span class="analysis-champ-chip__reason">${escapeAnalysisHtml(check.reasons[0] || 'Not legal')}</span>`;
        return `<span class="analysis-champ-chip ${cls}" title="${escapeAnalysisHtml(title)}">${(p.species || 'Slot').split('-')[0]}${reasonHint}</span>`;
    }).join('');

    const championsDetail = renderChampionsCompliancePanel(activeMons, ctx.championsChecks);

    board.innerHTML = `
        <div class="analysis-scoreboard__head">
            <span class="analysis-scoreboard__title">Team Composition Report</span>
            <span class="${fmtClass}">${ctx.format === 'Doubles' ? 'VGC Doubles' : 'Singles'}</span>
        </div>
        <div class="analysis-metrics">
            <div class="analysis-metric analysis-metric--${metricTone(offenseScore)}">
                <span class="analysis-metric__label">Offensive Coverage</span>
                <span class="analysis-metric__value">${offenseScore}%</span>
                <div class="analysis-metric__bar"><div style="width:${offenseScore}%"></div></div>
            </div>
            <div class="analysis-metric analysis-metric--${metricTone(defenseScore)}">
                <span class="analysis-metric__label">Defensive Integrity</span>
                <span class="analysis-metric__value">${defenseScore}%</span>
                <div class="analysis-metric__bar"><div style="width:${defenseScore}%"></div></div>
            </div>
            <div class="analysis-metric analysis-metric--${metricTone(supportScore, 60, 30)}">
                <span class="analysis-metric__label">Support Index</span>
                <span class="analysis-metric__value">${supportScore}%</span>
                <div class="analysis-metric__bar"><div style="width:${supportScore}%"></div></div>
            </div>
            <div class="analysis-metric analysis-metric--${metricTone(vgcScore, 65, 35)}">
                <span class="analysis-metric__label">${ctx.format === 'Doubles' ? 'VGC Synergy' : 'Competitive Readiness'}</span>
                <span class="analysis-metric__value">${vgcScore}%</span>
                <div class="analysis-metric__bar"><div style="width:${vgcScore}%"></div></div>
            </div>
            <div class="analysis-metric analysis-metric--${metricTone(champScore, 100, 50)}">
                <span class="analysis-metric__label">Champions Legal</span>
                <span class="analysis-metric__value">${ctx.championsEligible}/${ctx.teamSize}</span>
                <div class="analysis-metric__bar"><div style="width:${champScore}%"></div></div>
            </div>
        </div>
        <div class="analysis-champions-strip">
            <span class="analysis-champions-strip__label">Champions Roster</span>
            ${champChips}
            ${ctx.duplicateItems.length ? `<span class="analysis-champ-chip analysis-champ-chip--warn" title="Duplicate held items">⚠ Duplicate items</span>` : ''}
            ${ctx.restrictedCount > 2 ? `<span class="analysis-champ-chip analysis-champ-chip--warn" title="${ctx.restrictedCount} restricted-level Pokémon">⚠ ${ctx.restrictedCount} Restricted</span>` : ''}
        </div>
        ${championsDetail}`;
}

function renderInsightCard(issue) {
    const palette = { synergy: '#4CAF50', high: '#f44336', medium: '#FFC107', low: 'rgba(255,255,255,0.2)', champions: '#ffb74d' };
    const defaultIcons = { synergy: '⭐', high: '⚠️', medium: '⚡', low: '🔍', champions: '🏆' };
    const type = issue.type || 'low';
    const iconVal = issue.icon || defaultIcons[type];
    const isImageIcon = /\.(png|jpg|gif|svg|webp)/i.test(iconVal) || iconVal.startsWith('http');
    const color = issue.color || palette[type];

    return `
        <div class="analysis-insight analysis-insight--${type}">
            <div class="analysis-insight__icon ${!isImageIcon ? 'text-glow' : ''}" style="--glow-color:${color}">
                ${isImageIcon ? `<img src="${iconVal}" alt="">` : iconVal}
            </div>
            <div>
                <div class="analysis-insight__title">${issue.text}</div>
                <div class="analysis-insight__body">${issue.tip}</div>
            </div>
        </div>`;
}

function detectRole(p, dbList) {
    const allRoles = new Set();
    const dbs = Array.isArray(dbList) ? dbList : [dbList];

    dbs.forEach(db => {
        if (!db || !db.Name) return;
        const stats = {
            hp: calculateStat(db.HP || 0, p.ivs.hp, p.evs.hp, p.level, p.nature, 'hp'),
            atk: calculateStat(db.Attack || 0, p.ivs.atk, p.evs.atk, p.level, p.nature, 'atk'),
            def: calculateStat(db.Defense || 0, p.ivs.def, p.evs.def, p.level, p.nature, 'def'),
            spa: calculateStat(db['Sp.Atk'] || 0, p.ivs.spa, p.evs.spa, p.level, p.nature, 'spa'),
            spd: calculateStat(db['Sp.Def'] || 0, p.ivs.spd, p.evs.spd, p.level, p.nature, 'spd'),
            spe: calculateStat(db.Speed || 0, p.ivs.spe, p.evs.spe, p.level, p.nature, 'spe')
        };

        const ability = (p.ability || '').toLowerCase();
        const item = (p.item || '').toLowerCase();
        const moves = p.moves.map(m => m.toLowerCase());
        const bst = db.Total_Stats || parseInt(db.Total_Stats) || 0;

        const hasMove = (list) => list.some(m => moves.includes(m));

        const dbAbilities = getPokemonAbilities(db);
        const activeAbility = (db.Name.toLowerCase().includes('-mega')) ? (dbAbilities[0] || 'None') : (p.ability || dbAbilities[0] || 'None');
        const ab = activeAbility.toLowerCase();

        if (ab === 'huge power' || ab === 'pure power') stats.atk *= 2;
        if (item === 'choice band') stats.atk *= 1.5;
        if (item === 'choice specs') stats.spa *= 1.5;
        if (item === 'choice scarf') stats.spe *= 1.5;
        if (item === 'life orb' || ['sheer force', 'adaptability'].includes(ab)) { stats.atk *= 1.3; stats.spa *= 1.3; }
        if (['flame orb', 'toxic orb'].includes(item) && ['guts', 'toxic boost'].includes(ab)) stats.atk *= 1.5;
        if (['flame orb'].includes(item) && ['flare boost'].includes(ab)) stats.spa *= 1.5;
        if (stats.atk > 150 && stats.spe > 130) allRoles.add('Physical Sweeper');
        if (stats.spa > 150 && stats.spe > 130) allRoles.add('Special Sweeper');
        if (stats.atk > 180 || stats.spa > 180) allRoles.add('Wallbreaker');
        if ((stats.atk > 140 || stats.spa > 140) && stats.spe < 60) allRoles.add('Trick Room Abuser');
        if (item === 'choice scarf' || stats.spe > 150) allRoles.add('Revenge Killer');
        if (stats.hp > 180 && stats.def > 130) allRoles.add('Physical Wall');
        if (stats.hp > 180 && stats.spd > 130) allRoles.add('Special Wall');
        if (hasMove(['fake out'])) allRoles.add('Fake Out Pressure');
        if (hasMove(['helping hand', 'decorate', "coaching"]) || ['commander', 'sword of ruin', "beads of ruin", "vessel of ruin"].includes(ab)) allRoles.add('Damage Amplification');
        if (['armor tail', 'queenly majesty', 'psychic surge'].includes(ab)) allRoles.add('Priority Denial');
        if (hasMove(['follow me', 'rage powder', 'ally switch'])) allRoles.add('Redirection');
        if (hasMove(['parting shot', 'memento', 'light screen', 'reflect', 'aurora veil', 'snarl', 'breaking swipe', 'struggle bug']) || ['intimidate', 'vessel of ruin'].includes(ab)) allRoles.add('Damage Mitigation');
        if (hasMove(['trick room'])) allRoles.add('Trick Room Setter');
        if (hasMove(['tailwind', 'icy wind', 'electroweb', 'string shot', 'toxic thread', 'bulldoze', 'glaciate', 'low sweep', 'nuzzle', 'glare', 'thunder wave', 'scary face', 'cotton spore'])) allRoles.add('Speed Control');
        if (hasMove(['u-turn', 'volt switch', 'parting shot', 'flip turn', "teleport", 'shed tail', 'baton pass', 'chilly reception'])) allRoles.add('Pivot');
        if (hasMove(['reflect', 'light screen', 'aurora veil', 'safeguard'])) allRoles.add('Screener');
        if (hasMove(['stealth rock', 'spikes', 'toxic spikes', 'sticky web', 'ceaseless edge', 'stone axe']) || ['toxic debris'].includes(ab)) allRoles.add('Hazard Setter');
        if (hasMove(['rapid spin', 'defog', 'mortal spin', 'court change', 'tidy up']) || ['magic bounce'].includes(ab)) allRoles.add('Hazard Control');
        if (hasMove(['swords dance', 'calm mind', 'nasty plot', 'dragon dance', 'quiver dance', 'bulk up', 'iron defense', 'focus energy'])) allRoles.add('Setup Sweeper');
        if (hasMove(['will-o-wisp', 'thunder wave', 'spore', 'toxic', 'yawn', 'sleep powder']) || ['spicy spray'].includes(ab)) allRoles.add('Disruptor');
        if (hasMove(['wish', 'heal bell', 'aromatherapy', 'life dew', 'pollen puff', 'heal pulse', 'floral healing'])) allRoles.add('Cleric/Healer');
        if (hasMove(['roar', 'whirlwind', 'dragon tail', 'circle throw', 'haze', 'clear smog'])) allRoles.add('Phazer/Hazer');
        if (['drought', 'drizzle', 'sand stream', 'snow warning', 'sand spit', 'orichalcum pulse', 'desolate land', 'primordial sea'].includes(ab) || hasMove(['sunny day', 'rain dance', 'sandstorm', 'hail', 'snowscape', 'chilly reception'])) allRoles.add('Weather Setter');
        if (['psychic surge', 'grassy surge', 'misty surge', 'electric surge', 'hadron engine'].includes(ab) || hasMove(['psychic terrain', 'grassy terrain', 'misty terrain', 'electric terrain'])) allRoles.add('Terrain Setter');
        if (['solar power', 'sand rush', 'slush rush', 'swift swim', 'chlorophyll', 'snow cloak', 'sand veil', 'protosynthesis'].includes(ab) || hasMove(['weather ball', 'hydro steam', 'solar beam', 'solar blade', 'electro shot'])) allRoles.add('Weather Abuser');
        if (['quark drive', 'surge surfer'].includes(ab) || hasMove(['expanding force', 'terrain pulse', 'rising voltage', 'grassy glide']) || ['psychic seed', 'electric seed', 'grassy seed', 'misty seed'].includes(item)) allRoles.add('Terrain Abuser');
        if (bst >= 670) allRoles.add('Restricted Legendary');
    });

    const result = Array.from(allRoles);
    return result.length > 0 ? result : ['Generalist'];
}

function clearAnalysisUI(message = 'Add Pokemon to see analysis.') {
    const placeholder = `<p class="analysis-section-note analysis-empty-note">${message}</p>`;
    const offBox = document.getElementById('offensive-coverage');
    const defBox = document.getElementById('defensive-coverage');
    const roleBox = document.getElementById('pokemon-roles');
    const synergyBox = document.getElementById('synergy-insights');
    const moveBox = document.getElementById('move-diversity');
    const metaBox = document.getElementById('meta-threat-insights');
    const threatBox = document.getElementById('threat-matchup');
    const strategyCard = document.getElementById('strategy-overview-card');
    const strategyText = document.getElementById('strategy-overview-text');
    const scoreboard = document.getElementById('analysis-scoreboard');
    const vgcPanel = document.getElementById('vgc-analysis-panel');

    if (scoreboard) scoreboard.innerHTML = '';
    if (vgcPanel) { vgcPanel.innerHTML = ''; vgcPanel.style.display = 'none'; }
    if (offBox) offBox.innerHTML = placeholder;
    if (defBox) defBox.innerHTML = placeholder;
    if (roleBox) roleBox.innerHTML = '';
    if (synergyBox) synergyBox.innerHTML = '';
    if (moveBox) moveBox.innerHTML = '';
    if (metaBox) metaBox.innerHTML = '';
    if (threatBox) threatBox.innerHTML = `<p class="analysis-section-note analysis-empty-note">${message}</p>`;
    if (strategyCard) strategyCard.style.display = 'none';
    if (strategyText) strategyText.innerHTML = '';
    const prosePanel = document.getElementById('build-prose-panel');
    if (prosePanel) prosePanel.style.display = 'none';
    const dashboard = document.getElementById('analysis-dashboard');
    if (dashboard) dashboard.classList.remove('synergy-analysis-active');
}

function sharedAnalyzeTeam(activeMons, format = 'Singles') {
    if (!activeMons || activeMons.length === 0) {
        clearAnalysisUI();
        return;
    }

    const weaknesses = {};
    const resistances = {};
    const coverage = {};
    const roles = [];

    const types = Object.keys(TYPE_CHART);
    types.forEach(t => { weaknesses[t] = 0; resistances[t] = 0; coverage[t] = 0; });

    activeMons.forEach((p) => {
        // Find effective DB
        let dbEffective = null;
        if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
            dbEffective = getEffectivePokemonData(p, allPokemon) || {};
        }

        const pTypes = [dbEffective?.Type_1, dbEffective?.Type_2].filter(x => x);

        // Offensive Coverage
        const moveTypes = (p.moves || []).filter(m => m).map(m => resolveMoveType(m, p)).filter(t => t);

        types.forEach(defType => {
            if (moveTypes.some(mt => getEffectiveness(mt, [defType]) > 1)) {
                coverage[defType]++;
            }
        });

        // Defensive Analysis
        types.forEach(atkType => {
            const eff = getEffectiveness(atkType, pTypes);
            if (eff > 2) weaknesses[atkType] += 2;
            else if (eff > 1) weaknesses[atkType]++;

            if (eff === 0) resistances[atkType] += 2;
            else if (eff < 1) resistances[atkType]++;
        });

        // Roles
        roles.push(detectRole(p, dbEffective));
    });

    renderAnalysis(coverage, weaknesses, resistances, roles, activeMons, format);

    // Trigger meta threat analysis asynchronously
    analyzeMetaThreats(activeMons, format);
}

const SYNERGY_RULES = [
    {
        id: 'rain-core', text: 'Rain Offense Core', type: 'synergy', icon: getAssetPrefix() + 'assets/rain.png',
        check: c => (c.utils.drizzle || c.hasSpecies(['pelipper'])) && (c.hasSpecies(['archaludon', 'basculegion', 'palafin', 'overqwil', 'pelipper']) || c.flatRoles.includes('Weather Abuser')),
        tip: 'Rain setter paired with abusers — classic VGC tempo. Pelipper + Swift Swim or Thunder synergy maximizes turns.'
    },
    {
        id: 'sun-core', text: 'Sun / Trick Room Sun', type: 'synergy', icon: getAssetPrefix() + 'assets/sun.png',
        check: c => (c.utils.drought || c.hasSpecies(['torkoal', 'ninetalesalola'])) && (c.flatRoles.includes('Weather Abuser') || c.utils.tr),
        tip: 'Sun engine detected. Chlorophyll, Protosynthesis, or Trick Room abusers capitalize on reduced Water damage and boosted Fire.'
    },
    {
        id: 'intimidate-support', text: 'Intimidate Cycle', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/dark_type.png',
        check: c => c.utils.intimidate && c.flatRoles.some(r => ['Physical Sweeper', 'Wallbreaker', 'Setup Sweeper'].includes(r)),
        tip: 'Intimidate softens physical hits for your sweepers — a staple of balanced VGC teams.'
    },
    {
        id: 'psychic-terrain', text: 'Psychic Terrain Core', type: 'synergy', icon: getAssetPrefix() + 'assets/psychic.png',
        check: c => (c.utils.psychicterrain || c.hasSpecies(['indeedee', 'farigiraf'])) && (c.utils.expandingforce || c.hasSpecies(['armarouge', 'hatterene', 'espathra'])),
        tip: 'Terrain blocks priority and powers Expanding Force — dominant doubles archetype when paired correctly.'
    },
    {
        id: 'trick-room-engine', text: 'Trick Room Engine', type: 'synergy', icon: getAssetPrefix() + 'assets/trick_room.png',
        check: c => c.utils.tr && c.roleCount('Trick Room Abuser') >= 1,
        tip: 'Trick Room setter with slow sweepers. Ensure allies can function under reversed speed tiers.'
    },
    {
        id: 'tailwind-offense', text: 'Tailwind Hyper Offense', type: 'synergy', icon: getAssetPrefix() + 'assets/tailwind.png',
        check: c => c.utils.tailwind && c.flatRoles.some(r => ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker'].includes(r)),
        tip: 'Tailwind doubles speed for four turns — pair with Protect users and spread moves for maximum pressure.'
    },
    {
        id: 'fakeout-pressure', text: 'Fake Out + Protect Core', type: 'synergy', icon: '⚡',
        check: c => c.utils.fakeout && c.utils.protect,
        tip: 'Fake Out buys free turns while Protect scouts and blocks double-targets — VGC fundamentals.'
    },
    {
        id: 'redirection-setup', text: 'Redirection Support', type: 'synergy', icon: '🎯',
        check: c => c.utils.redirection && (c.flatRoles.includes('Setup Sweeper') || c.utils.helpinghand),
        tip: 'Follow Me / Rage Powder redirects attacks so partners can set up, Terastallize, or fire spread moves.'
    },
    {
        id: 'commander', text: 'Commander Core', type: 'synergy', icon: 'https://play.pokemonshowdown.com/sprites/ani/tatsugiri.gif',
        check: c => c.hasSpecies(['dondozo']) && c.hasSpecies(['tatsugiri']),
        tip: 'Dondozo + Tatsugiri Commander boosts stats to overwhelming levels. Protect the pair early.'
    },
    {
        id: 'grimmsnarl-screens', text: 'Screen Support', type: 'synergy', icon: '🛡️',
        check: c => c.utils.screens && c.flatRoles.some(r => ['Screener', 'Damage Mitigation'].includes(r)),
        tip: 'Reflect/Light Screen halve damage — pair with bulky attackers or setup sweepers for win conditions.'
    },
    {
        id: 'spread-coverage', text: 'Spread Move Coverage', type: 'synergy', icon: '💥',
        check: c => c.format === 'Doubles' && c.utils.spread,
        tip: 'Spread moves hit both opponents — essential for doubles damage output. Mind ally damage in Earthquake/Blizzard.'
    },
    {
        id: 'helping-hand', text: 'Helping Hand Support', type: 'synergy', icon: '🤝',
        check: c => c.utils.helpinghand && c.flatRoles.some(r => ['Wallbreaker', 'Physical Sweeper', 'Special Sweeper'].includes(r)),
        tip: 'Helping Hand boosts ally damage 50% — common on Whimsicott, Tornadus, or support slots.'
    },
    {
        id: 'fantasy-core', text: 'Fantasy Core', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/dragon_type.png',
        check: c => c.activeTypes.has('Steel') && c.activeTypes.has('Fairy') && c.activeTypes.has('Dragon'),
        tip: 'Steel/Fairy/Dragon defensive backbone — resists most common offensive typings.'
    },
    {
        id: 'ghost-normal', text: 'Ghost-Normal Immunity Core', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/ghost_type.png',
        check: c => c.activeTypes.has('Ghost') && c.activeTypes.has('Normal'),
        tip: 'Ghost and Normal cover each other\'s Fighting/Ghost immunities — strong defensive pairing.'
    },
    {
        id: 'weather-engine', text: 'Weather Engine', type: 'synergy', icon: '☀️',
        check: c => c.flatRoles.includes('Weather Setter') && c.flatRoles.includes('Weather Abuser'),
        tip: 'Dedicated weather setter plus abusers — synchronize ability and move types for maximum value.'
    },
    {
        id: 'terrain-engine', text: 'Terrain Engine', type: 'synergy', icon: '🌿',
        check: c => c.flatRoles.includes('Terrain Setter') && c.flatRoles.includes('Terrain Abuser'),
        tip: 'Terrain setter with Expanding Force, Grassy Glide, or Rising Voltage users — terrain wars decide games.'
    },
    {
        id: 'champions-full', text: 'Champions Roster Ready', type: 'champions', icon: '🏆',
        check: c => c.teamSize > 0 && c.championsEligible === c.teamSize,
        tip: 'All Pokémon, items, and moves are Champions-legal. Ready for Champions format play.'
    },
    {
        id: 'champions-partial', text: 'Champions Compliance Gap', type: 'high', icon: '🏆',
        check: c => c.teamSize > 0 && c.championsEligible < c.teamSize,
        tip: 'One or more slots use illegal Pokémon, items, or moves for Champions. Review the roster strip above.'
    },
    {
        id: 'duplicate-items', text: 'Duplicate Held Items', type: 'medium', icon: '⚠️',
        check: c => c.duplicateItems.length > 0,
        tip: 'VGC rules prohibit duplicate items. Each Pokémon must hold a different item.'
    },
    {
        id: 'too-many-restricted', text: 'Restricted Overload', type: 'medium', icon: '⚠️',
        check: c => c.restrictedCount > 2,
        tip: 'More than two 670+ BST Pokémon detected. Standard VGC allows max 2 restricted per team.'
    },
    {
        id: 'no-speed-doubles', text: 'No Speed Control', type: 'high', icon: '⚠️',
        check: c => c.format === 'Doubles' && !c.utils.tailwind && !c.utils.tr && !c.utils.icywind,
        tip: 'Doubles requires Tailwind, Trick Room, or speed drops (Icy Wind/Electroweb). Add a speed-control option.'
    },
    {
        id: 'no-fakeout-doubles', text: 'No Early Pressure', type: 'medium', icon: '⚡',
        check: c => c.format === 'Doubles' && !c.utils.fakeout && !c.utils.sleep && c.teamSize >= 4,
        tip: 'No Fake Out or sleep pressure. Early-turn disruption helps secure setup and prevents opposing snowball.'
    },
    {
        id: 'no-protect-doubles', text: 'Low Protect Coverage', type: 'medium', icon: '🛡️',
        check: c => c.format === 'Doubles' && !c.utils.protect && c.teamSize >= 4,
        tip: 'Protect is near-mandatory in VGC doubles. At least one slot should scout and block double targets.'
    },
    {
        id: 'no-redirection-doubles', text: 'No Redirection', type: 'low', icon: '🎯',
        check: c => c.format === 'Doubles' && !c.utils.redirection && c.flatRoles.includes('Setup Sweeper'),
        tip: 'Setup sweepers benefit from Follow Me or Rage Powder to absorb hits during setup turns.'
    },
    {
        id: 'physical-heavy', text: 'Physical-Heavy Offense', type: 'low', icon: '👊',
        check: c => c.physicalMoveCount >= 8 && c.specialMoveCount <= 3,
        tip: 'Team leans physical. Intimidate from opponents will reduce damage — consider special coverage or mixed attackers.'
    },
    {
        id: 'special-heavy', text: 'Special-Heavy Offense', type: 'low', icon: '✨',
        check: c => c.specialMoveCount >= 8 && c.physicalMoveCount <= 3,
        tip: 'Team leans special. Amoonguss, Assault Vest walls, and Lightning Rod can wall you — diversify damage types.'
    },
    {
        id: 'no-hazard-control', text: 'No Hazard Control', type: 'medium', icon: '🧹',
        check: c => c.format !== 'Doubles' && !c.utils.removal && c.utils.hazards,
        tip: 'You set hazards but lack removal. Defog or Rapid Spin is needed to control the field.'
    },
    {
        id: 'no-hazards-singles', text: 'No Entry Hazards', type: 'low', icon: '🪨',
        check: c => c.format !== 'Doubles' && !c.utils.hazards && c.teamSize >= 4,
        tip: 'No Stealth Rock or Spikes. Entry hazards wear down switches and secure KOs on fragile threats.'
    },
    {
        id: 'tera-diversity', text: 'Strong Tera Diversity', type: 'synergy', icon: '💎',
        check: c => new Set(c.teraTypes).size >= Math.min(4, c.teamSize),
        tip: 'Varied Tera types let you adapt mid-game — offensive, defensive, and STAB Terastallization options.'
    },
    {
        id: 'tera-overlap', text: 'Tera Type Overlap', type: 'low', icon: '💎',
        check: c => c.teamSize >= 3 && new Set(c.teraTypes).size <= 2,
        tip: 'Multiple Pokémon share Tera types. Diversify Terastallization targets to avoid predictable plays.'
    },
    {
        id: 'wide-guard-core', text: 'Wide Guard Support', type: 'synergy', icon: '🛡️',
        check: c => c.format === 'Doubles' && c.utils.wideguard && c.utils.spread,
        tip: 'Wide Guard blocks opposing spread while your team fires Earthquake or Rock Slide — classic doubles tech.'
    },
    {
        id: 'priority-stack', text: 'Priority Stack', type: 'synergy', icon: '⚡',
        check: c => c.format === 'Doubles' && c.utils.priority && c.utils.tailwind,
        tip: 'Tailwind plus priority moves closes games after speed control — hard for opponents to revenge-KO.'
    },
    {
        id: 'snow-core', text: 'Snow / Ice Offense', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/ice_type.png',
        check: c => (c.utils.snow || c.hasSpecies(['ninetalesalola', 'abomasnow'])) && c.flatRoles.includes('Weather Abuser'),
        tip: 'Snow boosts Ice-type Defense and enables Slush Rush sweepers — pair setter with fast Ice attackers.'
    },
    {
        id: 'sand-core', text: 'Sand Rush Core', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/sandstorm.png',
        check: c => c.utils.sand && (c.hasAbility(['sandrush', 'sandrush']) || c.flatRoles.includes('Weather Abuser')),
        tip: 'Sand doubles Sand Rush Speed and chips non-immune foes — Excadrill and Ground types thrive.'
    },
    {
        id: 'electric-terrain', text: 'Electric Terrain Offense', type: 'synergy', icon: getAssetPrefix() + 'assets/type-icons/electricterrain.png',
        check: c => c.utils.electricterrain && (c.hasSpecies(['miraidon', 'regieleki']) || c.flatRoles.includes('Terrain Abuser')),
        tip: 'Electric Terrain boosts Electric moves and prevents sleep — pair with fast special attackers.'
    },
    {
        id: 'no-spread-doubles', text: 'No Spread Moves', type: 'medium', icon: '💥',
        check: c => c.format === 'Doubles' && !c.utils.spread && c.teamSize >= 4,
        tip: 'Doubles rewards spread damage (Earthquake, Heat Wave, Dazzling Gleam). Single-target only limits KO potential.'
    },
    {
        id: 'double-restricted', text: 'Double Restricted Core', type: 'synergy', icon: '🐉',
        check: c => c.format === 'Doubles' && c.restrictedCount === 2,
        tip: 'Two restricted Pokémon — standard VGC limit. Build support around enabling both to attack.'
    }
];

function linkMon(name) {
    return `<span class="build-prose-link">${name || 'Pokémon'}</span>`;
}

function formatEvLine(evs) {
    const labels = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
    const parts = Object.entries(evs || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${labels[k] || k}`);
    return parts.join(' / ') || 'No EVs listed';
}

function renderBuildProseAnalysis(mainMon, activeMons, format, ctx, roles) {
    const matchedSynergy = SYNERGY_RULES.filter(r => r.check(ctx));
    const buildId = typeof window !== 'undefined' ? window._currentMainBuildId : null;

    if (typeof BuildNarrative !== 'undefined' && BuildNarrative.renderFullAnalysis) {
        BuildNarrative.renderFullAnalysis(mainMon, activeMons, format, ctx, roles, {
            matchedSynergy,
            buildId
        });
        window._lastProseRoles = roles;
        return;
    }

    const panel = document.getElementById('build-prose-panel');
    if (!panel || !mainMon?.species) return;
    panel.style.display = 'block';
    if (document.getElementById('build-prose-overview')) {
        document.getElementById('build-prose-overview').innerHTML = `<p>${linkMon(mainMon.species)} analysis loading…</p>`;
    }
}

function updateBuildProseMeta(threatResults, format) {
    const mainMon = window._lastProseMainMon;
    const activeMons = window._lastProseActiveMons;
    const roles = window._lastProseRoles || [];

    if (typeof BuildNarrative !== 'undefined' && BuildNarrative.updateMetaSection) {
        BuildNarrative.updateMetaSection(threatResults, format, mainMon, activeMons, roles);
        return;
    }

    const metaEl = document.getElementById('build-prose-meta');
    if (!metaEl) return;
    if (!threatResults?.length) {
        metaEl.innerHTML = '<p>No ranked meta data available for this format.</p>';
        return;
    }
    const critical = threatResults.filter(t => t.dangerLevel === 'critical');
    const covered = threatResults.filter(t => t.dangerLevel === 'covered');
    const topThreats = threatResults.slice(0, 6);

    let html = `<p>Against the current ${format} meta, this team `;
    if (critical.length) {
        html += `has <strong class="analysis-highlight analysis-highlight--danger">${critical.length} critical gap${critical.length > 1 ? 's' : ''}</strong> versus staples such as ${critical.slice(0, 3).map(t => linkMon(t.name)).join(', ')}. Address these before tournament prep.</p>`;
    } else if (covered.length >= 3) {
        html += `handles several top threats well, including ${covered.slice(0, 3).map(t => linkMon(t.name)).join(', ')}.</p>`;
    } else {
        html += `shows mixed matchup spread — no single gap dominates, but positioning and Tera timing matter.</p>`;
    }

    html += '<p><strong>Key meta interactions:</strong></p><ul style="margin:0.5rem 0 0;padding-left:1.2rem;line-height:1.65;">';
    topThreats.forEach(t => {
        const status = t.dangerLevel === 'critical' ? '⚠ gap' : t.dangerLevel === 'covered' ? '✓ covered' : t.dangerLevel === 'warning' ? '△ caution' : '— neutral';
        const check = t.bestTeamAnswer
            ? `${t.bestTeamAnswer.species} — ${t.bestTeamAnswer.move} (${t.bestTeamAnswer.maxPercent}%)`
            : 'type coverage only';
        html += `<li>${linkMon(t.name)} (#${t.rank + 1}): ${status}. Best team answer: ${check}.</li>`;
    });
    html += '</ul>';
    metaEl.innerHTML = html;
}

function renderAnalysis(coverage, weaknesses, resistances, roles, activeMons, format = 'Singles') {
    const offBox = document.getElementById('offensive-coverage');
    const defBox = document.getElementById('defensive-coverage');
    const roleBox = document.getElementById('pokemon-roles');
    const synergyBox = document.getElementById('synergy-insights');
    const moveBox = document.getElementById('move-diversity');

    if (!offBox || !defBox || !roleBox || !synergyBox || !moveBox) return;

    const metaBox = document.getElementById('meta-threat-insights');
    if (metaBox) metaBox.innerHTML = '';

    const strategyTextEl = document.getElementById('strategy-overview-text');
    if (strategyTextEl) {
        const metaPara = strategyTextEl.querySelector('[data-meta-threat-summary]');
        if (metaPara) metaPara.remove();
    }

    offBox.innerHTML = '';
    defBox.innerHTML = '';
    roleBox.innerHTML = '';
    synergyBox.innerHTML = '';
    moveBox.innerHTML = '';

    const ctx = buildTeamContext(activeMons, format, coverage, weaknesses, resistances, roles);
    renderScoreboard(ctx, activeMons);
    renderVgcAnalysis(ctx, activeMons, roles);
    renderBuildProseAnalysis(activeMons[0], activeMons, format, ctx, roles);
    window._lastProseMainMon = activeMons[0];
    window._lastProseActiveMons = activeMons;

    // Offensive coverage
    Object.entries(coverage).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const badge = document.createElement('div');
        badge.className = 'analysis-type-badge';
        badge.style.opacity = count > 0 ? '1' : '0.35';
        badge.title = `${type}: ${count} Pokémon hit this type super effectively`;
        badge.innerHTML = `
            <img src="${typeIconSrc(type)}" alt="${type}">
            ${count > 0 ? `<div class="type-score-bubble">${count}</div>` : ''}`;
        offBox.appendChild(badge);
    });

    // Defensive weaknesses
    Object.entries(weaknesses).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const badge = document.createElement('div');
        badge.className = 'analysis-type-badge' + (count >= 3 ? ' critical-weakness' : '');
        badge.style.opacity = count > 0 ? '1' : '0.35';
        badge.title = `${type}: ${count} weakness weight — ${resistances[type] || 0} resistances`;
        badge.innerHTML = `
            <img src="${typeIconSrc(type)}" alt="${type}">
            ${count > 0 ? `<div class="type-score-bubble">${count}</div>` : ''}`;
        defBox.appendChild(badge);
    });

    // Role map — detailed mon cards
    activeMons.forEach((p, i) => {
        const db = getMonDb(p);
        const t1 = (db?.Type_1 || 'Normal').toLowerCase();
        const t2 = db?.Type_2?.toLowerCase();
        const speed = getMonSpeed(p, db, format);
        const champ = ctx.championsChecks[i];
        const spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(p) : '';
        const speciesJs = (p.species || '').replace(/'/g, "\\'");
        const monRoles = (roles[i] || []).slice(0, 4);

        const card = document.createElement('div');
        card.className = 'analysis-mon-card' + (champ.eligible ? '' : ' analysis-mon-card--illegal');
        card.innerHTML = `
            <div class="analysis-mon-card__sprite">
                <img src="${spriteUrl}" alt="${p.species || ''}"
                     onerror="if(typeof handleSpriteError!=='undefined')handleSpriteError(this,'${speciesJs}',${p.shiny || false})">
            </div>
            <div class="analysis-mon-card__body">
                <div class="analysis-mon-card__name">
                    ${(p.species || 'Unknown').toUpperCase()}
                    ${champ.eligible ? '<span class="analysis-champ-chip analysis-champ-chip--ok">CHAMP</span>' : '<span class="analysis-champ-chip analysis-champ-chip--bad">NOT LEGAL</span>'}
                </div>
                ${champ.eligible ? '' : `<div class="analysis-mon-card__champ-block"><span class="analysis-mon-card__champ-label">Why not Champions?</span>${renderChampionsReasonsHtml(champ.reasons)}</div>`}
                <div class="analysis-mon-card__meta">
                    <span class="analysis-mon-card__types">
                        <img src="${typeIconSrc(t1)}" alt="${t1}">
                        ${t2 ? `<img src="${typeIconSrc(t2)}" alt="${t2}">` : ''}
                    </span>
                    ${p.tera ? `<img src="${getAssetPrefix()}assets/type-icons/tera_type_${p.tera.toLowerCase()}.png" alt="Tera ${p.tera}" style="height:16px;" title="Tera: ${p.tera}">` : ''}
                    ${speed != null ? `<span class="analysis-mon-card__speed">Spe ${speed}</span>` : ''}
                    ${p.item && p.item.toLowerCase() !== 'none' ? `<span class="analysis-mon-card__speed">${p.item}</span>` : ''}
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">
                    ${monRoles.map(r => `<span class="role-badge" title="${roleDescriptions[r] || ''}">${r}</span>`).join('')}
                </div>
            </div>`;
        roleBox.appendChild(card);
    });

    // Synergy insights
    const activeIssues = SYNERGY_RULES.filter(rule => rule.check(ctx)).map(rule => ({ ...rule }));

    Object.entries(weaknesses).forEach(([type, count]) => {
        if (count >= 2 && (resistances[type] || 0) === 0) {
            activeIssues.push({
                type: 'high',
                text: `Critical ${type} Weakness`,
                tip: `${count} team members are weak to ${type} with no resistances. A single ${type} attacker can sweep.`,
                icon: typeIconSrc(type)
            });
        }
    });

    if (ctx.format === 'Doubles' && ctx.speeds.length >= 2) {
        const fast = ctx.speeds.filter(s => s >= 100).length;
        const slow = ctx.speeds.filter(s => s < 60).length;
        if (fast === ctx.speeds.length) {
            activeIssues.push({ type: 'medium', text: 'Uniform Fast Tier', tip: 'All Pokémon are fast. You may lose tiebreaks and struggle under Trick Room.', icon: '🏃' });
        }
        if (slow >= ctx.speeds.length - 1 && !ctx.utils.tr) {
            activeIssues.push({ type: 'medium', text: 'Slow Team Without TR', tip: 'Mostly slow Pokémon without Trick Room — opponents will move first every turn.', icon: '🐢' });
        }
    }

    activeMons.forEach((p, i) => {
        const check = ctx.championsChecks[i];
        if (!check.eligible) {
            activeIssues.push({
                type: 'champions',
                text: `${(p.species || 'Slot').split('-')[0]} — Champions Blocked`,
                tip: check.reasons.join(' · ') + '. Replace species, item, or moves to qualify for Champions format.',
                icon: '🏆'
            });
        }
    });

    const order = { synergy: 0, champions: 1, high: 2, medium: 3, low: 4 };
    activeIssues.sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));

    if (!activeIssues.length) {
        synergyBox.innerHTML = renderInsightCard({ type: 'synergy', text: 'Balanced Foundation', tip: 'No critical structural flaws detected. Team shows solid VGC fundamentals.', icon: '🛡️' });
    } else {
        synergyBox.innerHTML = activeIssues.map(renderInsightCard).join('');
    }

    // Move diversity & tactical toolkit
    const coverageCount = Object.values(coverage).filter(c => c > 0).length;
    const diversityPerc = Math.round((coverageCount / 18) * 100);
    const uniqueTera = new Set(ctx.teraTypes).size;
    const protectUsers = ctx.utils.protect ? activeMons.filter(p => (p.moves || []).some(m => normalizeMoveKey(m) === 'protect')).length : 0;

    moveBox.innerHTML = `
        <div class="analysis-diversity-header">
            <span class="analysis-diversity-header__label">Type Coverage Index</span>
            <span class="analysis-diversity-header__value">${diversityPerc}%</span>
        </div>
        <div class="coverage-meter"><div class="coverage-fill" style="width:${diversityPerc}%"></div></div>
        <div class="analysis-diversity-grid">
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${coverageCount}/18</span><span class="analysis-diversity-stat__lbl">Types Hit</span></div>
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${ctx.physicalMoveCount}</span><span class="analysis-diversity-stat__lbl">Physical</span></div>
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${ctx.specialMoveCount}</span><span class="analysis-diversity-stat__lbl">Special</span></div>
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${uniqueTera}</span><span class="analysis-diversity-stat__lbl">Tera Types</span></div>
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${protectUsers}</span><span class="analysis-diversity-stat__lbl">Protect</span></div>
            <div class="analysis-diversity-stat"><span class="analysis-diversity-stat__val">${ctx.utils.spread ? 'Yes' : 'No'}</span><span class="analysis-diversity-stat__lbl">Spread</span></div>
        </div>
        <div class="analysis-role-bars">
            ${['Speed Control', 'Fake Out Pressure', 'Redirection', 'Trick Room Setter', 'Setup Sweeper', 'Damage Mitigation', 'Physical Sweeper', 'Special Sweeper']
            .map(role => {
                const n = ctx.roleCount(role);
                if (!n) return '';
                const pct = Math.min(100, (n / ctx.teamSize) * 100);
                return `<div class="analysis-role-bar"><span class="analysis-role-bar__label">${role}</span><div class="analysis-role-bar__track"><div class="analysis-role-bar__fill" style="width:${pct}%"></div></div><span class="analysis-role-bar__count">${n}</span></div>`;
            }).filter(Boolean).join('') || '<span class="analysis-section-note">No specialized roles detected — team may be balanced/generalist.</span>'}
        </div>`;

    // Strategy overview
    const strategyCard = document.getElementById('strategy-overview-card');
    const strategyText = document.getElementById('strategy-overview-text');

    if (strategyCard && strategyText && activeMons.length > 0) {
        strategyCard.style.display = 'block';

        const hasHO = ctx.flatRoles.some(r => ['Setup Sweeper', 'Wallbreaker', 'Revenge Killer'].includes(r));
        const hasStall = ctx.flatRoles.some(r => ['Physical Wall', 'Special Wall', 'Cleric/Healer'].includes(r));
        let playstyle = 'Balanced';
        if (format === 'Doubles' && ctx.utils.tailwind && hasHO) playstyle = 'Tailwind Offense';
        else if (format === 'Doubles' && ctx.utils.tr) playstyle = 'Trick Room';
        else if (hasHO && !hasStall) playstyle = 'Hyper Offense';
        else if (hasHO && hasStall) playstyle = 'Bulky Offense';
        else if (!hasHO && hasStall) playstyle = 'Stall';

        const leadSpecies = (ctx.leadMons?.[0]?.species || activeMons[0].species || 'the lead');
        const leadPair = describeLeadPair(ctx, activeMons, roles);
        const highCov = Object.entries(coverage).filter(e => e[1] > 0).length;
        const highWeak = Object.entries(weaknesses).filter(e => e[1] >= 2 && !(resistances[e[0]]));
        const synergyCores = activeIssues.filter(i => i.type === 'synergy').map(i => i.text);
        const vgcTools = [
            ctx.utils.fakeout && 'Fake Out',
            ctx.utils.tailwind && 'Tailwind',
            ctx.utils.tr && 'Trick Room',
            ctx.utils.redirection && 'Redirection',
            ctx.utils.helpinghand && 'Helping Hand',
            ctx.utils.wideguard && 'Wide Guard',
            ctx.utils.spread && 'Spread moves'
        ].filter(Boolean);

        const blocks = [
            { title: 'Team Identity', body: `This is a <strong class="analysis-highlight">${playstyle}</strong> ${format} composition anchored by <strong>${leadSpecies}</strong>. Champions legality: <strong>${ctx.championsEligible}/${ctx.teamSize}</strong> slots. ${ctx.restrictedCount ? `${ctx.restrictedCount} restricted-level Pokémon on roster.` : 'No restricted BST concerns.'}` },
            { title: 'Offensive Plan', body: `Super-effective coverage spans <strong>${highCov}/18</strong> types (${diversityPerc}% index). ${ctx.physicalMoveCount > ctx.specialMoveCount ? 'Physical-biased' : ctx.specialMoveCount > ctx.physicalMoveCount ? 'Special-biased' : 'Balanced'} damage profile. ${ctx.utils.priority ? 'Priority moves provide late-game cleanup.' : ''} ${ctx.utils.spread && format === 'Doubles' ? 'Spread coverage threatens both opponents simultaneously.' : ''} ${format === 'Doubles' && ctx.utils.helpinghand ? 'Helping Hand amplifies partner KOs.' : ''}` },
            {
                title: 'Defensive Structure', body: highWeak.length
                    ? `Shared weaknesses in <strong class="analysis-highlight analysis-highlight--danger">${highWeak.map(w => w[0]).join(', ')}</strong> — add immunities, redirection, or Tera pivots. ${ctx.utils.intimidate ? 'Intimidate provides physical damage reduction.' : ''} ${ctx.utils.wideguard ? 'Wide Guard blocks opposing spread.' : ''}`
                    : `No critical shared type gaps. ${ctx.utils.screens ? 'Screens reduce incoming damage.' : ''} ${ctx.utils.protect ? 'Protect users scout and block double-targets.' : format === 'Doubles' ? 'Consider adding Protect for doubles safety.' : ''}`
            },
            {
                title: format === 'Doubles' ? 'VGC Game Plan' : 'Singles Game Plan', body: format === 'Doubles'
                    ? `Doubles toolkit: ${vgcTools.length ? vgcTools.join(', ') : 'limited support tools'}. ${synergyCores.length ? `Active cores: ${synergyCores.join(', ')}.` : 'Build explicit win conditions via speed control + redirection.'} ${leadPair.label ? `Recommended lead: ${leadPair.label}.` : ''} Terastallize on the winning turn and protect your restricted Pokémon.`
                    : `Singles focus: ${ctx.utils.hazards ? 'hazard stacking' : 'no hazards'} ${ctx.utils.removal ? 'with removal' : ''}. ${ctx.flatRoles.includes('Pivot') ? 'Pivot chains maintain momentum.' : 'Use switches to preserve win conditions.'}`
            }
        ];

        strategyText.innerHTML = blocks.map(b => `
            <div class="analysis-strategy-block">
                <strong>${b.title}</strong>
                <p>${b.body}</p>
            </div>`).join('');
    } else if (strategyCard) {
        strategyCard.style.display = 'none';
    }
}

// =============================================
// META THREAT MATCHUP ANALYSIS
// =============================================

// Cache for top_pokemons.json so we only fetch once
let _topPokemonsCache = null;
let _metaThreatRequestId = 0;

function normalizeSpeciesKey(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function loadTopPokemonsForFormat(format) {
    if (!_topPokemonsCache && typeof globalThis !== 'undefined' && globalThis._topPokemonsCache) {
        _topPokemonsCache = globalThis._topPokemonsCache;
    }
    if (!_topPokemonsCache) {
        try {
            const resp = await fetch('../assets/top_pokemons.json?v=' + Date.now());
            _topPokemonsCache = await resp.json();
            if (typeof globalThis !== 'undefined') globalThis._topPokemonsCache = _topPokemonsCache;
        } catch (e) {
            _topPokemonsCache = {};
        }
    }
    const base = _topPokemonsCache[format] || _topPokemonsCache['Singles'] || [];
    const buildsArr = (typeof allBuilds !== 'undefined') ? allBuilds : [];
    const fmt = (format || 'Singles').toLowerCase();
    const merged = [...base];
    buildsArr.forEach(b => {
        if ((b.format || 'Singles').toLowerCase() !== fmt) return;
        const name = b.pokemon;
        if (!name) return;
        if (!merged.some(m => normalizeSpeciesKey(m) === normalizeSpeciesKey(name))) {
            merged.push(name);
        }
    });
    return merged.slice(0, 28);
}

function findLatestBuildForSpecies(speciesName, format, buildsArr) {
    if (typeof findMetaBuildForSpecies === 'function') {
        return findMetaBuildForSpecies(speciesName, format, buildsArr);
    }
    const key = normalizeSpeciesKey(speciesName);
    const fmt = (format || 'Singles').toLowerCase();
    const matches = buildsArr.filter(b =>
        normalizeSpeciesKey(b.pokemon) === key &&
        (b.format || 'Singles').toLowerCase() === fmt
    );
    if (matches.length === 0) return null;
    const metaTagged = matches.filter(b => b && (b.isMeta === true || b.isMeta === 1 || b.isMeta === 'true'));
    const pool = metaTagged.length ? metaTagged : matches;
    return pool.reduce((best, cur) => {
        const bestId = parseInt(best.id, 10) || 0;
        const curId = parseInt(cur.id, 10) || 0;
        return curId > bestId ? cur : best;
    }, pool[0]);
}

function resolveMoveType(moveName, mon = null) {
    const clean = (moveName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) return null;
    let moveRef = null;
    if (typeof movesMap !== 'undefined' && movesMap[clean]) moveRef = movesMap[clean];
    else if (typeof allMoves !== 'undefined') {
        moveRef = allMoves.find(x => (x.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clean) || null;
    }
    if (!moveRef) return null;

    if (mon && typeof BattleCalc !== 'undefined' && typeof BattleCalc.resolveMoveType === 'function') {
        try {
            const resolved = BattleCalc.resolveMoveType(
                { ability: mon.ability || '', tera: !!mon.tera, teraType: mon.tera || null },
                { name: moveName, type: moveRef.type, basePower: moveRef.power || 0 },
                moveRef,
                (mon.item || '').toLowerCase(),
                { weather: 'None' }
            );
            if (resolved?.moveType) return resolved.moveType;
        } catch (e) { /* keep base type */ }
    }
    return moveRef.type || null;
}

function buildTeamMatchupData(activeMons, format = 'Singles') {
    const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
    const field = (typeof getDefaultField === 'function') ? getDefaultField(format) : null;
    const hasSpeed = typeof buildCalcStateFromSlot === 'function' && typeof getEffectiveSpeed === 'function';

    return activeMons.map(p => {
        let db = null;
        if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
            db = getEffectivePokemonData(p, allPokemon);
        }
        const pTypes = [db?.Type_1, db?.Type_2].filter(x => x);
        const moveTypes = (p.moves || []).filter(m => m).map(m => resolveMoveType(m, p)).filter(t => t);
        let speed = null;
        if (hasSpeed && db && field) {
            const state = buildCalcStateFromSlot(p, 1, db, movesDb);
            speed = getEffectiveSpeed(state, field);
        }
        return { species: p.species, types: pTypes, moveTypes, db, slot: p, speed };
    });
}

/**
 * Parse a Showdown paste string into a simplified Pokemon object.
 * Self-contained so analysis.js doesn't depend on page-specific parsePaste.
 */
function parseAnalysisBuild(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const slot = {
        species: '', item: '', ability: '', level: 50, shiny: false,
        tera: 'Normal', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        nature: 'Serious', moves: [], nickname: '', gender: ''
    };
    if (lines.length === 0) return slot;

    const head = lines[0];
    const itemSplit = head.split('@');
    if (itemSplit[1]) slot.item = itemSplit[1].trim();
    const speciesPart = itemSplit[0].trim();
    slot.species = speciesPart.includes('(') ? speciesPart.split('(')[1].split(')')[0].trim() : speciesPart;

    lines.slice(1).forEach(l => {
        const line = l.trim();
        if (line.match(/^Ability\s*:/i)) slot.ability = line.split(':')[1].trim();
        else if (line.match(/^Level\s*:/i)) slot.level = parseInt(line.split(':')[1].trim());
        else if (line.match(/^Tera Type\s*:/i)) slot.tera = line.split(':')[1].trim();
        else if (line.match(/^EVs\s*:/i)) {
            line.split(':')[1].split('/').forEach(p => {
                const match = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                if (match) {
                    let key = match[2].toLowerCase();
                    if (key === 'hp') key = 'hp';
                    else if (key === 'atk') key = 'atk';
                    else if (key === 'def') key = 'def';
                    else if (key === 'spa' || key === 'spatk' || key === 'satk') key = 'spa';
                    else if (key === 'spd' || key === 'spdef' || key === 'sdef') key = 'spd';
                    else if (key === 'spe' || key === 'speed') key = 'spe';
                    if (slot.evs[key] !== undefined) slot.evs[key] = parseInt(match[1]);
                }
            });
        } else if (line.match(/^IVs\s*:/i)) {
            line.split(':')[1].split('/').forEach(p => {
                const match = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
                if (match) {
                    let key = match[2].toLowerCase();
                    if (key === 'hp') key = 'hp';
                    else if (key === 'atk') key = 'atk';
                    else if (key === 'def') key = 'def';
                    else if (key === 'spa' || key === 'spatk' || key === 'satk') key = 'spa';
                    else if (key === 'spd' || key === 'spdef' || key === 'sdef') key = 'spd';
                    else if (key === 'spe' || key === 'speed') key = 'spe';
                    if (slot.ivs[key] !== undefined) slot.ivs[key] = parseInt(match[1]);
                }
            });
        } else if (line.toLowerCase().endsWith('nature')) {
            slot.nature = line.substring(0, line.length - 6).trim();
        } else if (line.startsWith('-')) {
            slot.moves.push(line.substring(1).trim());
        }
    });
    while (slot.moves.length < 4) slot.moves.push('');
    if (typeof coerceEvsForMode === 'function') {
        slot.evs = coerceEvsForMode(slot.evs, typeof isChampionsEvMode === 'function' ? isChampionsEvMode() : true);
    }
    return slot;
}

/**
 * Main meta threat analysis function.
 * Dynamically loads top_pokemons.json, finds the latest build for each threat,
 * and renders matchup analysis against the player's team.
 */
async function analyzeMetaThreats(activeMons, format = 'Singles') {
    const threatBox = document.getElementById('threat-matchup');
    const requestId = ++_metaThreatRequestId;

    if (!threatBox) return;

    if (!activeMons || activeMons.length === 0) {
        threatBox.innerHTML = '<p style="opacity:0.3; text-align:center; padding: 20px;">Add Pokemon to see meta threat analysis.</p>';
        injectMetaThreatInsights([], format);
        return;
    }

    threatBox.innerHTML = '<p style="opacity:0.4; text-align:center; padding: 20px;">Loading meta threat analysis…</p>';

    const topList = await loadTopPokemonsForFormat(format);
    if (requestId !== _metaThreatRequestId) return;

    if (topList.length === 0) {
        threatBox.innerHTML = '<p style="opacity:0.3; text-align:center; padding: 20px;">No meta threats data available for this format.</p>';
        injectMetaThreatInsights([], format);
        return;
    }

    const buildsArr = (typeof allBuilds !== 'undefined') ? allBuilds : [];
    const teamData = buildTeamMatchupData(activeMons, format);
    const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
    const hasDamageCalc = typeof buildCalcStateFromSlot === 'function'
        && typeof findBestDamage === 'function'
        && typeof getDefaultField === 'function';
    const calcField = hasDamageCalc ? getDefaultField(format) : null;
    const threatResults = [];

    for (let rank = 0; rank < topList.length; rank++) {
        const threatName = topList[rank];
        const threatNameClean = normalizeSpeciesKey(threatName);

        const isOnTeam = activeMons.some(p => normalizeSpeciesKey(p.species) === threatNameClean);
        if (isOnTeam) continue;

        const latestBuild = findLatestBuildForSpecies(threatName, format, buildsArr);

        let threatDb = null;
        if (typeof allPokemon !== 'undefined') {
            threatDb = allPokemon.find(x => normalizeSpeciesKey(x.Name) === threatNameClean);
        }

        if (!threatDb) continue;

        let threatParsed = latestBuild ? parseAnalysisBuild(latestBuild.build) : null;
        let threatDbEffective = threatDb;
        if (threatParsed && typeof getEffectivePokemonData !== 'undefined') {
            threatDbEffective = getEffectivePokemonData(threatParsed, allPokemon) || threatDb;
        }

        const threatTypes = [threatDbEffective.Type_1, threatDbEffective.Type_2].filter(x => x);

        let threatMoveTypes = [];
        let threatMoves = [];
        if (latestBuild && threatParsed) {
            threatMoves = threatParsed.moves.filter(m => m);
            threatMoveTypes = threatMoves.map(m => resolveMoveType(m, threatParsed)).filter(t => t);
        }

        // === OFFENSIVE: Can team hit this threat super-effectively? ===
        let teamCanHitSE = 0; // count of team members who can hit it SE
        let bestSEMult = 1;
        teamData.forEach(td => {
            let canHit = false;
            td.moveTypes.forEach(mt => {
                const eff = getEffectiveness(mt, threatTypes);
                if (eff > 1) { canHit = true; bestSEMult = Math.max(bestSEMult, eff); }
            });
            if (canHit) teamCanHitSE++;
        });

        // === DEFENSIVE: Can threat hit team members super-effectively? ===
        let threatCanHitSE = 0; // count of team members the threat hits SE
        let worstSEMult = 1;
        teamData.forEach(td => {
            let isHit = false;
            // Check by threat's move types (from build)
            threatMoveTypes.forEach(mt => {
                const eff = getEffectiveness(mt, td.types);
                if (eff > 1) { isHit = true; worstSEMult = Math.max(worstSEMult, eff); }
            });
            // Also check STAB types if no build moves data
            if (threatMoveTypes.length === 0) {
                threatTypes.forEach(tt => {
                    const eff = getEffectiveness(tt, td.types);
                    if (eff > 1) { isHit = true; worstSEMult = Math.max(worstSEMult, eff); }
                });
            }
            if (isHit) threatCanHitSE++;
        });

        // === IMMUNITIES: Can anyone wall this threat? ===
        let hasImmunity = false;
        teamData.forEach(td => {
            threatMoveTypes.forEach(mt => {
                if (getEffectiveness(mt, td.types) === 0) hasImmunity = true;
            });
            if (threatMoveTypes.length === 0) {
                threatTypes.forEach(tt => {
                    if (getEffectiveness(tt, td.types) === 0) hasImmunity = true;
                });
            }
        });

        // === DAMAGE CALC: Offensive checks & defensive pressure (full team) ===
        let offensiveChecks = [];
        let defensiveHits = [];
        let teammateCounters = [];
        let bestTeamAnswer = null;
        let worstThreatHit = null;
        let threatSpeed = null;
        let speedOutpacesCount = 0;
        let speedLosesToCount = 0;

        if (hasDamageCalc && threatParsed && movesDb.length > 0) {
            const threatDefender = buildCalcStateFromSlot(threatParsed, 2, threatDbEffective, movesDb);
            const threatAttacker = buildCalcStateFromSlot(threatParsed, 1, threatDbEffective, movesDb);
            threatSpeed = getEffectiveSpeed(threatAttacker, calcField);

            activeMons.forEach(mon => {
                let monDb = null;
                if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
                    monDb = getEffectivePokemonData(mon, allPokemon);
                }
                if (!monDb) return;

                const teamAttacker = buildCalcStateFromSlot(mon, 1, monDb, movesDb);
                const teamDefender = buildCalcStateFromSlot(mon, 2, monDb, movesDb);
                const teamSpeed = getEffectiveSpeed(teamAttacker, calcField);
                const speedTier = compareSpeedTier(teamSpeed, threatSpeed);

                if (speedTier === 'faster') speedLosesToCount++;
                else if (speedTier === 'slower') speedOutpacesCount++;

                const bestOffense = findBestDamage(teamAttacker, threatDefender, calcField);
                if (bestOffense && parseFloat(bestOffense.maxPercent) > 0) {
                    const entry = {
                        species: mon.species,
                        move: bestOffense.move,
                        minPercent: bestOffense.minPercent,
                        maxPercent: bestOffense.maxPercent,
                        koLabel: bestOffense.koLabel,
                        teamSpeed,
                        threatSpeed,
                        speedTier,
                        outspeedsThreat: speedTier === 'faster',
                        underspeedsThreat: speedTier === 'slower'
                    };
                    offensiveChecks.push(entry);
                    if (!bestTeamAnswer || parseFloat(bestOffense.maxPercent) > parseFloat(bestTeamAnswer.maxPercent)) {
                        bestTeamAnswer = entry;
                    }
                }

                const bestDefense = findBestDamage(threatAttacker, teamDefender, calcField);
                if (bestDefense && parseFloat(bestDefense.maxPercent) > 0) {
                    const entry = {
                        species: mon.species,
                        move: bestDefense.move,
                        minPercent: bestDefense.minPercent,
                        maxPercent: bestDefense.maxPercent,
                        koLabel: bestDefense.koLabel,
                        teamSpeed,
                        threatSpeed,
                        speedTier,
                        threatOutspeeds: speedTier === 'slower',
                        threatUnderspeeds: speedTier === 'faster'
                    };
                    defensiveHits.push(entry);
                    if (!worstThreatHit || parseFloat(bestDefense.maxPercent) > parseFloat(worstThreatHit.maxPercent)) {
                        worstThreatHit = entry;
                    }
                }
            });

            // Threat can remove teammates before they act — especially your checks
            defensiveHits.forEach(hit => {
                const isPressure = hit.threatOutspeeds && (
                    (typeof isStrongAnswer === 'function' && isStrongAnswer(hit.koLabel)) ||
                    parseFloat(hit.maxPercent) >= 75
                );
                if (!isPressure) return;

                const wasCheck = offensiveChecks.some(c =>
                    c.species === hit.species &&
                    typeof isStrongAnswer === 'function' &&
                    isStrongAnswer(c.koLabel)
                );
                const coversOthers = offensiveChecks.some(c =>
                    c.species === hit.species &&
                    parseFloat(c.maxPercent) >= 50
                );

                teammateCounters.push({
                    victim: hit.species,
                    move: hit.move,
                    maxPercent: hit.maxPercent,
                    koLabel: hit.koLabel,
                    neutralizesCheck: wasCheck,
                    removesCoverage: coversOthers && !wasCheck
                });
            });
        }

        const strongAnswers = offensiveChecks.filter(c => typeof isStrongAnswer === 'function' && isStrongAnswer(c.koLabel));
        const fastAnswers = offensiveChecks.filter(c => c.outspeedsThreat && typeof isStrongAnswer === 'function' && isStrongAnswer(c.koLabel));
        const slowAnswers = strongAnswers.filter(c => c.underspeedsThreat);
        const ohkoVictims = defensiveHits.filter(d => d.koLabel && (d.koLabel.includes('Guaranteed OHKO') || d.koLabel.startsWith('100')));
        const speedPressureVictims = defensiveHits.filter(d => d.threatOutspeeds && parseFloat(d.maxPercent) >= 50);
        const typeOnlyChecks = teamData.filter(td => {
            let canHit = false;
            td.moveTypes.forEach(mt => {
                if (getEffectiveness(mt, threatTypes) > 1) canHit = true;
            });
            return canHit;
        }).map(td => td.species);

        // Determine threat level (type chart + damage calc + speed tier when available)
        const teamSize = activeMons.length;
        let dangerLevel = 'safe';
        if (hasDamageCalc && offensiveChecks.length === 0 && (threatCanHitSE > 0 || defensiveHits.length > 0)) {
            dangerLevel = 'critical';
        } else if (teamCanHitSE === 0 && threatCanHitSE > 0) {
            dangerLevel = 'critical';
        } else if (hasDamageCalc && fastAnswers.length === 0 && strongAnswers.length > 0 && speedOutpacesCount >= Math.ceil(teamSize * 0.5)) {
            dangerLevel = 'critical';
        } else if (hasDamageCalc && teammateCounters.some(t => t.neutralizesCheck)) {
            dangerLevel = 'critical';
        } else if (hasDamageCalc && strongAnswers.length === 0 && offensiveChecks.length > 0) {
            dangerLevel = 'warning';
        } else if (hasDamageCalc && ohkoVictims.length >= 2) {
            dangerLevel = 'critical';
        } else if (hasDamageCalc && speedPressureVictims.length >= Math.ceil(teamSize * 0.5)) {
            dangerLevel = 'warning';
        } else if (hasDamageCalc && strongAnswers.length >= 1 && ohkoVictims.length === 0 && slowAnswers.length === 0) {
            dangerLevel = 'covered';
        } else if (hasDamageCalc && strongAnswers.length >= 1 && slowAnswers.length > 0) {
            dangerLevel = 'warning';
        } else if (teamCanHitSE === 0) {
            dangerLevel = 'warning';
        } else if (threatCanHitSE >= Math.ceil(teamSize * 0.6) && teamCanHitSE <= 1) {
            dangerLevel = 'critical';
        } else if (threatCanHitSE >= Math.ceil(teamSize * 0.5)) {
            dangerLevel = 'warning';
        } else if (teamCanHitSE >= 2 && threatCanHitSE <= 1) {
            dangerLevel = 'covered';
        } else {
            dangerLevel = 'safe';
        }

        threatResults.push({
            name: threatName,
            rank: rank + 1,
            types: threatTypes,
            teamCanHitSE,
            threatCanHitSE,
            bestSEMult,
            worstSEMult,
            hasImmunity,
            dangerLevel,
            threatMoves,
            item: latestBuild ? (threatParsed?.item || '') : '',
            ability: latestBuild ? (threatParsed?.ability || '') : (threatDb?.Ability?.[0] || ''),
            buildId: latestBuild ? latestBuild.id : null,
            offensiveChecks,
            defensiveHits,
            strongAnswers,
            fastAnswers,
            slowAnswers,
            typeOnlyChecks,
            bestTeamAnswer,
            worstThreatHit,
            teammateCounters,
            threatSpeed,
            speedOutpacesCount,
            speedLosesToCount,
            hasDamageCalc
        });
    }

    if (requestId !== _metaThreatRequestId) return;

    const dangerOrder = { critical: 0, warning: 1, safe: 2, covered: 3 };
    threatResults.sort((a, b) => dangerOrder[a.dangerLevel] - dangerOrder[b.dangerLevel] || a.rank - b.rank);

    renderThreatMatchup(threatBox, threatResults, activeMons.length, format);
    injectMetaThreatInsights(threatResults, format);
    updateBuildProseMeta(threatResults, format);
}

/**
 * Inject top-meta threat warnings into synergy insights and strategy overview.
 */
function injectMetaThreatInsights(threatResults, format) {
    const metaBox = document.getElementById('meta-threat-insights');
    if (metaBox) {
        const critical = threatResults.filter(t => t.dangerLevel === 'critical');
        const warnings = threatResults.filter(t => t.dangerLevel === 'warning');

        if (critical.length === 0 && warnings.length === 0) {
            metaBox.innerHTML = '';
        } else {
            let html = '';
            critical.slice(0, 5).forEach(t => {
                const buildNote = t.buildId ? ` (Build #${t.buildId})` : '';
                const checkNames = t.offensiveChecks?.length
                    ? t.offensiveChecks.map(c => c.species).join(', ')
                    : 'none';
                const speedNote = t.threatSpeed != null
                    ? ` Outsplits ${t.speedOutpacesCount}/${t.speedOutpacesCount + t.speedLosesToCount} of your team.`
                    : '';
                const counterNote = t.teammateCounters?.filter(c => c.neutralizesCheck).length
                    ? ` Can remove your checks: ${t.teammateCounters.filter(c => c.neutralizesCheck).map(c => c.victim).join(', ')}.`
                    : '';
                html += renderInsightCard({
                    type: 'high',
                    text: `Meta Gap: ${t.name} #${t.rank}`,
                    tip: `No reliable calc answer vs this ${format} staple${buildNote}. Checks: ${checkNames}. Threatens ${t.threatCanHitSE} slot(s) by type.${speedNote}${counterNote}`,
                    icon: '⚔️'
                });
            });
            warnings.slice(0, 3).forEach(t => {
                const answer = t.bestTeamAnswer
                    ? `${t.bestTeamAnswer.species} (${t.bestTeamAnswer.move}, ${t.bestTeamAnswer.maxPercent}%${t.bestTeamAnswer.outspeedsThreat ? ', faster' : t.bestTeamAnswer.underspeedsThreat ? ', slower' : ''})`
                    : `${t.teamCanHitSE} type match(es)`;
                html += renderInsightCard({
                    type: 'medium',
                    text: `Meta Caution: ${t.name} #${t.rank}`,
                    tip: `Best answer: ${answer}. ${t.defensiveHits?.length || 0} teammate(s) take meaningful damage.${t.teammateCounters?.length ? ` Pressure on: ${t.teammateCounters.map(c => c.victim).join(', ')}.` : ''}`,
                    icon: '⚔️'
                });
            });
            metaBox.innerHTML = html;
        }
    }

    const strategyText = document.getElementById('strategy-overview-text');
    if (!strategyText) return;

    const metaPara = strategyText.querySelector('[data-meta-threat-summary]');
    if (metaPara) metaPara.remove();

    if (threatResults.length === 0) return;

    const critCount = threatResults.filter(t => t.dangerLevel === 'critical').length;
    const coveredCount = threatResults.filter(t => t.dangerLevel === 'covered').length;
    const topGaps = threatResults.filter(t => t.dangerLevel === 'critical').slice(0, 3).map(t => t.name);
    const calcNote = threatResults.some(t => t.hasDamageCalc) ? ' using damage calc vs latest meta builds' : '';

    let metaLine = `<strong>META MATCHUP:</strong> Compared against the top ${format} threats${calcNote}`;
    if (critCount > 0) {
        metaLine += ` — <span style="color:#ff453a">${critCount} critical gap${critCount > 1 ? 's' : ''}</span>`;
        if (topGaps.length) metaLine += ` (${topGaps.join(', ')})`;
        metaLine += '. Consider adding checks or coverage moves.';
    } else if (coveredCount >= Math.ceil(threatResults.length * 0.5)) {
        metaLine += ` — solid coverage with ${coveredCount} threats well answered.`;
    } else {
        metaLine += ' — no critical gaps, but some ranked threats need careful positioning.';
    }

    const p = document.createElement('p');
    p.setAttribute('data-meta-threat-summary', 'true');
    p.style.marginBottom = '12px';
    p.innerHTML = metaLine;
    strategyText.appendChild(p);
}

/**
 * Render the threat matchup results into the container.
 */
function renderThreatMatchup(container, threats, teamSize, format = 'Singles') {
    if (threats.length === 0) {
        container.innerHTML = '<p style="opacity:0.3; text-align:center; padding: 20px;">All meta threats are on your team or no data available.</p>';
        return;
    }

    const dangerStyles = {
        critical: { bg: 'rgba(244, 67, 54, 0.12)', border: '#f44336', label: 'CRITICAL', labelBg: '#f44336' },
        warning: { bg: 'rgba(255, 152, 0, 0.08)', border: '#FF9800', label: 'CAUTION', labelBg: '#FF9800' },
        safe: { bg: 'rgba(255, 255, 255, 0.02)', border: 'rgba(255,255,255,0.08)', label: 'NEUTRAL', labelBg: 'rgba(255,255,255,0.15)' },
        covered: { bg: 'rgba(76, 175, 80, 0.08)', border: '#4CAF50', label: 'COVERED', labelBg: '#4CAF50' }
    };

    // Summary stats
    const critCount = threats.filter(t => t.dangerLevel === 'critical').length;
    const warnCount = threats.filter(t => t.dangerLevel === 'warning').length;
    const coveredCount = threats.filter(t => t.dangerLevel === 'covered').length;

    let html = `
        <p class="analysis-section-note">Ranked ${format} meta · isMeta build per species (else latest id) · full-team damage &amp; speed calc</p>
        <div class="threat-summary-row">
            <div class="threat-summary-pill threat-summary-pill--critical"><span>CRITICAL</span><span>${critCount}</span></div>
            <div class="threat-summary-pill threat-summary-pill--warning"><span>CAUTION</span><span>${warnCount}</span></div>
            <div class="threat-summary-pill threat-summary-pill--covered"><span>COVERED</span><span>${coveredCount}</span></div>
        </div>
    `;

    threats.forEach(threat => {
        const style = dangerStyles[threat.dangerLevel];
        const spriteClean = threat.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/ani/${spriteClean}.gif`;

        // Offensive bar (how many on team can hit it)
        const offPct = Math.min(100, (threat.teamCanHitSE / teamSize) * 100);
        const offColor = offPct >= 50 ? '#4CAF50' : offPct > 0 ? '#FF9800' : '#f44336';

        // Defensive bar (how many on team it can hit)
        const defPct = Math.min(100, (threat.threatCanHitSE / teamSize) * 100);
        const defColor = defPct <= 20 ? '#4CAF50' : defPct < 50 ? '#FF9800' : '#f44336';

        const typeImgs = threat.types.map(t =>
            `<img src="${typeIconSrc(t)}" alt="${t}" style="height:16px; border-radius:3px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">`
        ).join('');

        const movesStr = threat.threatMoves.length > 0
            ? threat.threatMoves.slice(0, 4).map(m => `<span class="threat-move-pill">${m}</span>`).join(' ')
            : '<span class="threat-move-pill" style="opacity:0.55;">No build data — using STAB types</span>';

        const buildBadge = threat.buildId
            ? `<span style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.35);">Build #${threat.buildId}</span>`
            : '';

        const renderCheckChip = (entry, kind) => {
            const cls = kind === 'check' ? 'check' : 'threat';
            const ko = entry.koLabel ? ` · ${entry.koLabel.replace('Guaranteed ', '')}` : '';
            let speedTag = '';
            if (entry.outspeedsThreat) speedTag = ' ⚡';
            else if (entry.underspeedsThreat || entry.threatOutspeeds) speedTag = ' 🐢';
            else if (entry.speedTier === 'tie') speedTag = ' =';
            return `<span class="matchup-chip ${cls}" title="${entry.move}: ${entry.minPercent}%–${entry.maxPercent}%${entry.teamSpeed != null ? ` · Spe ${entry.teamSpeed}${entry.threatSpeed != null ? ' vs ' + entry.threatSpeed : ''}` : ''}">${entry.species}: ${entry.move} (${entry.maxPercent}%)${speedTag}${ko}</span>`;
        };

        const checksHtml = threat.offensiveChecks?.length
            ? threat.offensiveChecks.map(c => renderCheckChip(c, 'check')).join('')
            : (threat.typeOnlyChecks?.length
                ? threat.typeOnlyChecks.map(s => `<span class="matchup-chip gap">${s}: type only</span>`).join('')
                : '<span class="matchup-chip gap">No coverage</span>');

        const threatensHtml = threat.defensiveHits?.length
            ? threat.defensiveHits.map(d => renderCheckChip(d, 'threat')).join('')
            : '<span style="font-size:0.58rem; color:rgba(255,255,255,0.35);">Minimal offensive pressure</span>';

        const teammateCounterHtml = threat.teammateCounters?.length
            ? `<div style="margin-top:8px;">
                <div style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-bottom:4px;">Counters Your Teammates</div>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    ${threat.teammateCounters.map(c => {
                const label = c.neutralizesCheck ? 'removes check' : (c.removesCoverage ? 'breaks coverage' : 'pressure');
                return `<span class="matchup-chip threat" title="${c.move}: ${c.maxPercent}%">${c.victim}: ${c.move} (${c.maxPercent}%) · ${label}</span>`;
            }).join('')}
                </div>
            </div>`
            : '';

        const speedSummary = threat.threatSpeed != null
            ? `<span class="threat-calc-note">Speed ${threat.threatSpeed} · outsplits ${threat.speedOutpacesCount}/${teamSize} · ${threat.fastAnswers?.length || 0} fast answer(s)</span>`
            : '';

        const calcSummary = threat.bestTeamAnswer
            ? `<span class="threat-calc-best">Best: ${threat.bestTeamAnswer.species} ${threat.bestTeamAnswer.move} (${threat.bestTeamAnswer.maxPercent}%${threat.bestTeamAnswer.koLabel ? ', ' + threat.bestTeamAnswer.koLabel.replace('Guaranteed ', '') : ''}${threat.bestTeamAnswer.outspeedsThreat ? ', faster' : threat.bestTeamAnswer.underspeedsThreat ? ', slower' : ''})</span>`
            : '';

        html += `
            <div class="threat-row" style="background:${style.bg};border-color:${style.border};">
                <div style="display:flex; gap:10px; align-items:center; min-width:0;">
                    <img src="${spriteUrl}" alt="${threat.name}"
                         style="width:40px; height:40px; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5)); flex-shrink:0;"
                         onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${spriteClean}.png'; this.onerror=null;">
                    <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span class="threat-name">${threat.name}</span>
                            <span class="threat-rank">#${threat.rank}</span>
                            ${buildBadge}
                            ${typeImgs}
                            <span style="font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:4px; background:${style.labelBg}; color:white; letter-spacing:0.5px;">${style.label}</span>
                        </div>
                        <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${movesStr}</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                    <span class="threat-meta-label">Your Coverage</span>
                                    <span class="threat-meta-value" style="color:${offColor};">${threat.teamCanHitSE}/${teamSize}</span>
                                </div>
                                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${offPct}%; background:${offColor}; border-radius:2px; transition:width 0.5s ease;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                    <span class="threat-meta-label">Threat Level</span>
                                    <span class="threat-meta-value" style="color:${defColor};">${threat.threatCanHitSE}/${teamSize}</span>
                                </div>
                                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${defPct}%; background:${defColor}; border-radius:2px; transition:width 0.5s ease;"></div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top:8px;">
                            <div class="threat-meta-label" style="margin-bottom:4px;">Your Checks</div>
                            <div style="display:flex; gap:4px; flex-wrap:wrap;">${checksHtml}</div>
                        </div>
                        <div style="margin-top:8px;">
                            <div class="threat-meta-label" style="margin-bottom:4px;">Threatens Your Team</div>
                            <div style="display:flex; gap:4px; flex-wrap:wrap;">${threatensHtml}</div>
                            ${teammateCounterHtml}
                            ${speedSummary ? `<div style="margin-top:6px;">${speedSummary}</div>` : ''}
                            ${calcSummary ? `<div style="margin-top:6px;">${calcSummary}</div>` : ''}
                        </div>
                    </div>
                </div>
                ${threat.hasImmunity ? '<div style="font-size:0.6rem; font-weight:900; color:#4CAF50; text-align:right; white-space:nowrap;">🛡️ IMMUNE</div>' : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// =============================================
// PAGE ENTRY POINTS (teambuilder + builds)
// =============================================

let _teamAnalysisFormat = 'Singles';
let _builderTeamGetter = null;

function registerTeamBuilderSource(getTeamFn) {
    _builderTeamGetter = getTeamFn;
}

function updateAnalysisFormatToggle(format, singlesBtnId, doublesBtnId) {
    const singlesBtn = document.getElementById(singlesBtnId);
    const doublesBtn = document.getElementById(doublesBtnId);
    if (singlesBtn) singlesBtn.classList.toggle('active', format === 'Singles');
    if (doublesBtn) doublesBtn.classList.toggle('active', format === 'Doubles');
}

function setTeamAnalysisFormat(format) {
    _teamAnalysisFormat = format;
    updateAnalysisFormatToggle(format, 'analysis-toggle-singles', 'analysis-toggle-doubles');
    if (typeof setOpponentPrepFormat === 'function') {
        setOpponentPrepFormat(format);
    }
    const view = document.getElementById('analysis-view');
    if (view && view.style.display !== 'none' && _builderTeamGetter) {
        runTeamBuilderAnalysis(_builderTeamGetter());
    }
}

function runTeamBuilderAnalysis(team) {
    const activeMons = (team || []).filter(p => p && p.species);
    sharedAnalyzeTeam(activeMons, _teamAnalysisFormat);
}

function normalizeLibraryBuild(entry) {
    if (!entry) return null;
    // Scored synergy slot from builds page: { build: { id, pokemon, build: "paste..." }, score }
    if (entry.build && typeof entry.build === 'object' && typeof entry.build.build === 'string') {
        return entry.build;
    }
    // Raw build record from allBuilds: { id, pokemon, build: "paste..." }
    if (typeof entry.build === 'string') {
        return entry;
    }
    return null;
}

function buildsToActiveMons(buildEntries) {
    return (buildEntries || [])
        .map(normalizeLibraryBuild)
        .filter(b => b && typeof b.build === 'string' && b.build.trim())
        .map(b => parseAnalysisBuild(b.build))
        .filter(p => p.species);
}

function analyzeLibraryTeam(mainBuild, synergyBuilds, format = 'Singles') {
    window._currentMainBuildId = mainBuild?.id || null;
    sharedAnalyzeTeam(buildsToActiveMons([mainBuild, ...(synergyBuilds || [])]), format);
}

if (typeof globalThis !== 'undefined') {
    globalThis.parseAnalysisBuild = parseAnalysisBuild;
    globalThis.findLatestBuildForSpecies = findLatestBuildForSpecies;
    globalThis.findMetaBuildForSpecies = typeof findMetaBuildForSpecies === 'function'
        ? findMetaBuildForSpecies
        : findLatestBuildForSpecies;
    globalThis.isBuildMarkedMeta = typeof isBuildMarkedMeta === 'function'
        ? isBuildMarkedMeta
        : (b) => !!(b && (b.isMeta === true || b.isMeta === 1 || b.isMeta === 'true'));
    globalThis.normalizeSpeciesKey = normalizeSpeciesKey;
    globalThis.loadTopPokemonsForFormat = loadTopPokemonsForFormat;
    globalThis.formatEvLine = formatEvLine;
}
