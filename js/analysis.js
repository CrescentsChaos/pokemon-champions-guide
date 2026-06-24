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
