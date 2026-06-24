/**
 * Shared Team Analysis Logic
 */

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
        if (['drought', 'drizzle', 'sand stream', 'snow warning', 'sand spit', 'orichalcum pulse', 'desolate land', 'primordial sea'].includes(ab) || hasMove(['sun', 'rain', 'sandstorm', 'hail', 'snowscape', 'chilly reception'])) allRoles.add('Weather Setter');
        if (['psychic surge', 'grassy surge', 'misty surge', 'electric surge', 'hadron engine'].includes(ab) || hasMove(['psychic terrain', 'grassy terrain', 'misty terrain', 'electric terrain'])) allRoles.add('Terrain Setter');
        if (['solar power', 'sand rush', 'slush rush', 'swift swim', 'chlorophyll', 'snow cloak', 'sand veil', 'protosynthesis'].includes(ab) || hasMove(['weather ball', 'hydro steam', 'solar beam', 'solar blade', 'electro shot'])) allRoles.add('Weather Abuser');
        if (['quark drive', 'surge surfer'].includes(ab) || hasMove(['expanding force', 'terrain pulse', 'rising voltage', 'grassy glide']) || ['psychic seed', 'electric seed', 'grassy seed', 'misty seed'].includes(item)) allRoles.add('Terrain Abuser');
        if (bst >= 670) allRoles.add('Restricted Legendary');
    });

    const result = Array.from(allRoles);
    return result.length > 0 ? result : ['Generalist'];
}

function sharedAnalyzeTeam(activeMons, format = 'Singles') {
    if (!activeMons || activeMons.length === 0) {
        const offBox = document.getElementById('offensive-coverage');
        if(offBox) offBox.innerHTML = '<p style="grid-column:1/-1; opacity:0.3; text-align:center;">Add Pokemon to see analysis.</p>';
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
        const moveTypes = p.moves.map(m => {
            const clean = m.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (typeof movesMap !== 'undefined' && movesMap[clean]) return movesMap[clean].type;
            if (typeof allMoves !== 'undefined') {
                const moveRef = allMoves.find(x => x.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
                return moveRef ? moveRef.type : null;
            }
            return null;
        }).filter(t => t);

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
        id: 'trifecta',
        text: 'Elemental Trifecta',
        type: 'synergy',
        icon: '../assets/type-icons/grass_type.png',
        check: (ctx) => ctx.activeTypes.has('Fire') && ctx.activeTypes.has('Water') && ctx.activeTypes.has('Grass'),
        tip: 'FWG core provides excellent defensive pivoting options.'
    },
    {
        id: 'fantasy',
        text: 'Fantasy Core',
        type: 'synergy',
        icon: '../assets/type-icons/dragon_type.png',
        check: (ctx) => ctx.activeTypes.has('Steel') && ctx.activeTypes.has('Fairy') && ctx.activeTypes.has('Dragon'),
        tip: 'Steel/Fairy/Dragon is the premier defensive backbone.'
    },
    {
        id: 'commander',
        text: 'Commander Synergy',
        type: 'synergy',
        icon: 'https://play.pokemonshowdown.com/sprites/ani/tatsugiri.gif',
        check: (ctx) => ctx.abilities.includes('commander') && ctx.speciesList.includes('tatsugiri'),
        tip: 'Dondozo + Tatsugiri core detected. Field dominance is imminent.'
    },
    {
        id: 'ghost-normal',
        text: 'Ghost-Normal Core',
        type: 'synergy',
        icon: '../assets/type-icons/ghost_type.png',
        check: (ctx) => ctx.activeTypes.has('Ghost') && ctx.activeTypes.has('Normal'),
        tip: 'Ghost and Normal types cover each other\'s immunities perfectly.'
    },
    {
        id: 'weather',
        text: 'Weather Synergy',
        type: 'synergy',
        icon: '☀️',
        check: (ctx) => ctx.flatRoles.includes('Weather Setter') && ctx.flatRoles.includes('Weather Abuser'),
        tip: 'Optimized weather engine detected. Field effects will be dominant.'
    },
    {
        id: 'trick-room',
        text: 'Dimensions Locked',
        type: 'synergy',
        icon: '🌀',
        check: (ctx) => ctx.utils.tr && ctx.flatRoles.includes('Trick Room Abuser'),
        tip: 'Your Trick Room engine is ready to reverse the flow of battle.'
    },
    {
        id: 'no-speed-doubles',
        text: 'No Speed Control',
        type: 'high',
        icon: '⚠️',
        check: (ctx) => ctx.format === 'Doubles' && !ctx.utils.tailwind && !ctx.utils.tr,
        tip: 'Speed is everything in Doubles. Add Tailwind or Trick Room.'
    },
    {
        id: 'no-fakeout-doubles',
        text: 'No Fake Out',
        type: 'medium',
        icon: '⚡',
        check: (ctx) => ctx.format === 'Doubles' && !ctx.utils.fakeout,
        tip: 'Lacking early-game pressure. Fake Out helps secure safe setups.'
    },
    {
        id: 'no-hazard-control',
        text: 'No Hazard Control',
        type: 'medium',
        icon: '🧹',
        check: (ctx) => ctx.format !== 'Doubles' && !ctx.utils.removal && ctx.utils.hazards,
        tip: 'You set hazards but can\'t remove them. Defog or Rapid Spin recommended.'
    }
];

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

    // --- Offensive Coverage Grid ---
    Object.entries(coverage).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const badge = document.createElement('div');
        badge.className = 'analysis-type-badge';
        badge.style.opacity = count > 0 ? '1' : '0.2';
        badge.title = `${type}: ${count} Super Effective moves`;

        badge.innerHTML = `
            <img src="../assets/type-icons/${type.toLowerCase()}_type.png" alt="${type}">
            ${count > 0 ? `<div class="type-score-bubble">${count}</div>` : ''}
        `;
        offBox.appendChild(badge);
    });

    // --- Defensive Weakness Grid ---
    Object.entries(weaknesses).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const badge = document.createElement('div');
        badge.className = 'analysis-type-badge';
        badge.style.opacity = count > 0 ? '1' : '0.2';
        badge.title = `${type}: ${count}x Team Weakness`;

        if (count >= 3) {
            badge.classList.add('critical-weakness');
        }

        badge.innerHTML = `
            <img src="../assets/type-icons/${type.toLowerCase()}_type.png" alt="${type}">
            ${count > 0 ? `<div class="type-score-bubble">${count}</div>` : ''}
        `;
        defBox.appendChild(badge);
    });

    // --- Team Preview with Roles ---
    activeMons.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'synergy-item';
        div.style.background = 'rgba(255,255,255,0.02)';
        
        let spriteUrl = '';
        if (typeof getSpriteUrl !== 'undefined') spriteUrl = getSpriteUrl(p);

        div.innerHTML = `
            <div style="position:relative;">
                <img src="${spriteUrl}" onerror="if(typeof handleSpriteError !== 'undefined') handleSpriteError(this, '${(p.species || '').replace(/'/g, "\\'")}', ${p.shiny || false})" style="width:44px; height:44px; object-fit:contain;">
            </div>
            <div style="flex:1;">
                <div style="font-weight:900; font-size:0.8rem; color:white; letter-spacing:0.5px;">${(p.species || '').toUpperCase()}</div>
                <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:6px;">
                    ${roles[i].slice(0, 3).map(r => `<span class="role-badge" title="${roleDescriptions[r] || ''}" style="background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); padding:2px 6px; border-radius:4px; font-size:0.55rem; font-weight:900; text-transform:uppercase; border:1px solid rgba(255,255,255,0.05);">${r}</span>`).join('')}
                </div>
            </div>
        `;
        roleBox.appendChild(div);
    });

    // --- Strategic Insights Engine ---
    const ctx = {
        coverage, weaknesses, resistances, format,
        flatRoles: roles.flat(),
        moves: activeMons.flatMap(p => p.moves.map(m => m.toLowerCase().replace(/[^a-z0-9]/g, ''))),
        abilities: activeMons.map(p => (p.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '')),
        activeTypes: new Set(activeMons.flatMap(p => {
            let db = null;
            if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
                db = getEffectivePokemonData(p, allPokemon);
            }
            return [db?.Type_1, db?.Type_2].filter(x => x);
        })),
        speciesList: activeMons.map(p => (p.species || '').toLowerCase().replace(/[^a-z0-9]/g, '')),
        utils: {}
    };

    const hasMove = (mList) => mList.some(m => ctx.moves.includes(m));
    ctx.utils = {
        hazards: hasMove(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'ceaselessedge', 'stoneaxe']),
        removal: hasMove(['rapidspin', 'defog', 'mortalspin', 'tidypup', 'courtchange']),
        tailwind: hasMove(['tailwind']),
        tr: hasMove(['trickroom']),
        fakeout: hasMove(['fakeout']),
        redirection: hasMove(['followme', 'ragepowder', 'allyswitch']),
        priority: hasMove(['extremespeed', 'suckerpunch', 'aquajet', 'machpunch', 'bulletpunch', 'iceshard', 'shadowsneak', 'vacuumwave', 'watershuriken', 'grassyglide', 'firstimpression', 'accelerock'])
    };

    const activeIssues = SYNERGY_RULES
        .filter(rule => rule.check(ctx))
        .map(rule => ({ ...rule }));

    // Add dynamic gap analysis (Weakness based)
    Object.entries(weaknesses).forEach(([type, count]) => {
        if (count >= 2 && resistances[type] === 0) {
            activeIssues.push({
                type: 'high',
                text: `Critical ${type} Gap`,
                tip: `No resistances to ${type}. A single sweeper could end the match.`,
                icon: '⚠️'
            });
        }
    });

    // Render Insights
    if (activeIssues.length === 0) {
        synergyBox.innerHTML = `
            <div class="synergy-item">
                <div class="synergy-icon">🛡️</div>
                <div>
                    <div style="font-weight:800;">Balanced Foundation</div>
                    <div style="font-size:0.7rem; opacity:0.5;">No critical flaws detected in current deployment.</div>
                </div>
            </div>`;
    } else {
        activeIssues.sort((a, b) => {
            const order = { synergy: 0, high: 1, medium: 2, low: 3 };
            return order[a.type] - order[b.type];
        }).forEach(issue => {
            const palette = { synergy: '#4CAF50', high: '#f44336', medium: '#FFC107', low: 'rgba(255,255,255,0.2)' };
            const defaultIcons = { synergy: '⭐', high: '⚠️', medium: '⚡', low: '🔍' };
            const color = issue.color || palette[issue.type];
            const iconVal = issue.icon || defaultIcons[issue.type];

            const isImageIcon = iconVal.match(/\.(png|jpg|gif|svg|webp)/i) || iconVal.startsWith('http');

            synergyBox.innerHTML += `
                <div class="synergy-item" style="border-left: 3px solid ${color}; background:rgba(255,255,255,0.01); transition: transform 0.2s ease; margin-bottom:8px;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div class="synergy-icon ${!isImageIcon ? 'text-glow' : ''}" style="--glow-color:${color}">
                        ${isImageIcon ? `<img src="${iconVal}" alt="icon">` : iconVal}
                    </div>
                    <div>
                        <div style="font-weight:900; color: ${color}; font-size: 0.75rem; letter-spacing:1px; text-transform:uppercase;">${issue.text}</div>
                        <div style="font-size:0.65rem; opacity:0.6; line-height:1.4;">${issue.tip}</div>
                    </div>
                </div>
            `;
        });
    }

    // --- Move Diversity ---
    const coverageCount = Object.values(coverage).filter(c => c > 0).length;
    const diversityPerc = (coverageCount / 18) * 100;
    moveBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
            <span style="font-size:0.65rem; font-weight:900; color: rgba(255,255,255,0.5); text-transform:uppercase;">Coverage Index</span>
            <span style="font-size:0.9rem; font-weight:900; color:var(--primary-red); font-family: 'Inter', sans-serif;">${Math.round(diversityPerc)}<small style="font-size:0.6rem; opacity:0.5;">%</small></span>
        </div>
        <div class="coverage-meter" style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
            <div class="coverage-fill" style="width:${diversityPerc}%; height:100%; background:linear-gradient(90deg, var(--primary-red), #ff6666); box-shadow: 0 0 10px var(--primary-red); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
    `;

    // --- STRATEGY OVERVIEW SNIPPETS ---
    const strategyCard = document.getElementById('strategy-overview-card');
    const strategyText = document.getElementById('strategy-overview-text');

    if (strategyCard && strategyText) {
        if (activeMons.length > 0) {
            strategyCard.style.display = 'block';

            let playstyle = 'Balanced';
            const hasHO = ctx.flatRoles.some(r => ['Setup Sweeper', 'Wallbreaker', 'Revenge Killer'].includes(r));
            const hasStall = ctx.flatRoles.some(r => ['Physical Wall', 'Special Wall', 'Cleric/Healer'].includes(r));
            if (hasHO && !hasStall) playstyle = 'Hyper Offense';
            else if (hasHO && hasStall) playstyle = 'Bulky Offense';
            else if (!hasHO && hasStall) playstyle = 'Stall';

            const snippets = [];

            // 1. Identity
            snippets.push(`<strong>IDENTITY:</strong> This deployment operates as a <span style="color:var(--primary-red)">${playstyle}</span> composition optimized for <strong>${format}</strong>. The mechanical cohesion centers around ${activeMons[0].species || 'the team'}'s specific tactical requirements.`);

            // 2. Sword (Offensive)
            const highCov = Object.entries(coverage).filter(e => e[1] > 0).length;
            let sword = `<strong>THE SWORD:</strong> Offensive output covers <strong>${highCov}/18</strong> elemental sectors. `;
            if (ctx.flatRoles.includes('Wallbreaker')) sword += "Heavy artillery is present to breach stalling cores. ";
            if (ctx.utils.priority) sword += "Clean-up operations are secured with priority-tier maneuvers. ";
            snippets.push(sword);

            // 3. Shield (Defensive)
            const highWeak = Object.entries(weaknesses).filter(e => e[1] >= 2 && resistances[e[0]] === 0);
            let shield = `<strong>THE SHIELD:</strong> `;
            if (highWeak.length > 0) shield += `Structural vulnerabilities detected in <span style="color:#ff453a">${highWeak.map(w => w[0]).join('/')}</span> defensive sectors. `;
            else shield += "Defensive integrity is maintained with no critical shared gaps. ";
            if (ctx.flatRoles.includes('Physical Wall') || ctx.flatRoles.includes('Special Wall')) shield += "The composition features a dedicated defensive anchor. ";
            snippets.push(shield);

            // 4. Momentum (Tactical)
            const coreTexts = activeIssues.filter(i => i.type === 'synergy').map(i => i.text);
            let momentum = `<strong>MOMENTUM:</strong> `;
            if (coreTexts.length > 0) momentum += `Operational synergy is driven by <span style="color:#4CAF50">${coreTexts.join(' & ')}</span> protocols. `;
            else momentum += "Tactical flow relies on standard swapping and prediction cycles. ";
            snippets.push(momentum);

            strategyText.innerHTML = snippets.map(s => `<p style="margin-bottom:12px;">${s}</p>`).join('');
        } else {
            strategyCard.style.display = 'none';
        }
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
    if (!_topPokemonsCache) {
        try {
            const resp = await fetch('../assets/top_pokemons.json?v=' + Date.now());
            _topPokemonsCache = await resp.json();
        } catch (e) {
            _topPokemonsCache = {};
        }
    }
    return _topPokemonsCache[format] || _topPokemonsCache['Singles'] || [];
}

function findLatestBuildForSpecies(speciesName, format, buildsArr) {
    const key = normalizeSpeciesKey(speciesName);
    const fmt = (format || 'Singles').toLowerCase();
    const matches = buildsArr.filter(b =>
        normalizeSpeciesKey(b.pokemon) === key &&
        (b.format || 'Singles').toLowerCase() === fmt
    );
    if (matches.length === 0) return null;
    return matches.reduce((best, cur) => {
        const bestId = parseInt(best.id, 10) || 0;
        const curId = parseInt(cur.id, 10) || 0;
        return curId > bestId ? cur : best;
    }, matches[0]);
}

function resolveMoveType(moveName) {
    const clean = (moveName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) return null;
    if (typeof movesMap !== 'undefined' && movesMap[clean]) return movesMap[clean].type;
    if (typeof allMoves !== 'undefined') {
        const moveRef = allMoves.find(x => (x.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
        return moveRef ? moveRef.type : null;
    }
    return null;
}

function buildTeamMatchupData(activeMons) {
    return activeMons.map(p => {
        let db = null;
        if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
            db = getEffectivePokemonData(p, allPokemon);
        }
        const pTypes = [db?.Type_1, db?.Type_2].filter(x => x);
        const moveTypes = (p.moves || []).filter(m => m).map(m => resolveMoveType(m)).filter(t => t);
        return { species: p.species, types: pTypes, moveTypes, db };
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
    const teamData = buildTeamMatchupData(activeMons);
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
            threatMoveTypes = threatMoves.map(m => resolveMoveType(m)).filter(t => t);
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

        // Determine threat level
        const teamSize = activeMons.length;
        let dangerLevel = 'safe';
        if (teamCanHitSE === 0 && threatCanHitSE > 0) dangerLevel = 'critical';
        else if (teamCanHitSE === 0) dangerLevel = 'warning';
        else if (threatCanHitSE >= Math.ceil(teamSize * 0.6) && teamCanHitSE <= 1) dangerLevel = 'critical';
        else if (threatCanHitSE >= Math.ceil(teamSize * 0.5)) dangerLevel = 'warning';
        else if (teamCanHitSE >= 2 && threatCanHitSE <= 1) dangerLevel = 'covered';
        else dangerLevel = 'safe';

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
            buildId: latestBuild ? latestBuild.id : null
        });
    }

    if (requestId !== _metaThreatRequestId) return;

    const dangerOrder = { critical: 0, warning: 1, safe: 2, covered: 3 };
    threatResults.sort((a, b) => dangerOrder[a.dangerLevel] - dangerOrder[b.dangerLevel] || a.rank - b.rank);

    renderThreatMatchup(threatBox, threatResults, activeMons.length, format);
    injectMetaThreatInsights(threatResults, format);
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
                html += `
                    <div class="synergy-item" style="border-left: 3px solid #f44336; background:rgba(255,255,255,0.01); margin-bottom:8px;">
                        <div class="synergy-icon text-glow" style="--glow-color:#f44336">⚔️</div>
                        <div>
                            <div style="font-weight:900; color:#f44336; font-size:0.75rem; letter-spacing:1px; text-transform:uppercase;">Meta Gap: ${t.name} #${t.rank}</div>
                            <div style="font-size:0.65rem; opacity:0.6; line-height:1.4;">No reliable SE coverage vs this ${format} staple${buildNote}. It threatens ${t.threatCanHitSE} of your team.</div>
                        </div>
                    </div>`;
            });
            warnings.slice(0, 3).forEach(t => {
                html += `
                    <div class="synergy-item" style="border-left: 3px solid #FF9800; background:rgba(255,255,255,0.01); margin-bottom:8px;">
                        <div class="synergy-icon text-glow" style="--glow-color:#FF9800">⚔️</div>
                        <div>
                            <div style="font-weight:900; color:#FF9800; font-size:0.75rem; letter-spacing:1px; text-transform:uppercase;">Meta Caution: ${t.name} #${t.rank}</div>
                            <div style="font-size:0.65rem; opacity:0.6; line-height:1.4;">Limited answers to this ranked threat. Only ${t.teamCanHitSE} member(s) hit it super effectively.</div>
                        </div>
                    </div>`;
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

    let metaLine = `<strong>META MATCHUP:</strong> Compared against the top ${format} threats`;
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
        warning:  { bg: 'rgba(255, 152, 0, 0.08)', border: '#FF9800', label: 'CAUTION', labelBg: '#FF9800' },
        safe:     { bg: 'rgba(255, 255, 255, 0.02)', border: 'rgba(255,255,255,0.08)', label: 'NEUTRAL', labelBg: 'rgba(255,255,255,0.15)' },
        covered:  { bg: 'rgba(76, 175, 80, 0.08)', border: '#4CAF50', label: 'COVERED', labelBg: '#4CAF50' }
    };

    // Summary stats
    const critCount = threats.filter(t => t.dangerLevel === 'critical').length;
    const warnCount = threats.filter(t => t.dangerLevel === 'warning').length;
    const coveredCount = threats.filter(t => t.dangerLevel === 'covered').length;

    let html = `
        <p style="font-size:0.65rem; color:rgba(255,255,255,0.35); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
            Ranked ${format} meta · builds use highest build ID per species
        </p>
        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; background:rgba(244,67,54,0.15); border:1px solid rgba(244,67,54,0.3);">
                <span style="font-size:0.7rem; font-weight:900; color:#f44336;">CRITICAL</span>
                <span style="font-size:0.9rem; font-weight:900; color:#f44336;">${critCount}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; background:rgba(255,152,0,0.1); border:1px solid rgba(255,152,0,0.3);">
                <span style="font-size:0.7rem; font-weight:900; color:#FF9800;">CAUTION</span>
                <span style="font-size:0.9rem; font-weight:900; color:#FF9800;">${warnCount}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; background:rgba(76,175,80,0.1); border:1px solid rgba(76,175,80,0.3);">
                <span style="font-size:0.7rem; font-weight:900; color:#4CAF50;">COVERED</span>
                <span style="font-size:0.9rem; font-weight:900; color:#4CAF50;">${coveredCount}</span>
            </div>
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
            `<img src="../assets/type-icons/${t.toLowerCase()}_type.png" alt="${t}" style="height:16px; border-radius:3px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">`
        ).join('');

        const movesStr = threat.threatMoves.length > 0
            ? threat.threatMoves.slice(0, 4).map(m => `<span style="font-size:0.6rem; color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.05); padding:1px 5px; border-radius:3px; white-space:nowrap;">${m}</span>`).join(' ')
            : '<span style="font-size:0.6rem; color:rgba(255,255,255,0.25);">No build data — using STAB types</span>';

        const buildBadge = threat.buildId
            ? `<span style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.35);">Build #${threat.buildId}</span>`
            : '';

        html += `
            <div class="threat-row" style="
                display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
                padding: 12px 14px; margin-bottom: 6px; border-radius: 12px;
                background: ${style.bg}; border: 1px solid ${style.border};
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            " onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.3)'"
               onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'">
                <div style="display:flex; gap:10px; align-items:center; min-width:0;">
                    <img src="${spriteUrl}" alt="${threat.name}"
                         style="width:40px; height:40px; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5)); flex-shrink:0;"
                         onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${spriteClean}.png'; this.onerror=null;">
                    <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-weight:900; font-size:0.8rem; color:white; white-space:nowrap;">${threat.name}</span>
                            <span style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.3); letter-spacing:1px;">#${threat.rank}</span>
                            ${buildBadge}
                            ${typeImgs}
                            <span style="font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:4px; background:${style.labelBg}; color:white; letter-spacing:0.5px;">${style.label}</span>
                        </div>
                        <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${movesStr}</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                    <span style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.4); text-transform:uppercase;">Your Coverage</span>
                                    <span style="font-size:0.6rem; font-weight:900; color:${offColor};">${threat.teamCanHitSE}/${teamSize}</span>
                                </div>
                                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${offPct}%; background:${offColor}; border-radius:2px; transition:width 0.5s ease;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                    <span style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.4); text-transform:uppercase;">Threat Level</span>
                                    <span style="font-size:0.6rem; font-weight:900; color:${defColor};">${threat.threatCanHitSE}/${teamSize}</span>
                                </div>
                                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${defPct}%; background:${defColor}; border-radius:2px; transition:width 0.5s ease;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${threat.hasImmunity ? '<div style="font-size:0.6rem; font-weight:900; color:#4CAF50; text-align:right; white-space:nowrap;">🛡️ IMMUNE</div>' : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}
