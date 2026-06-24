/**
 * Shared Team Analysis Utilities
 * Used by both teambuilder/index.html and builds/index.html
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
        const bst = parseInt(db.Total_Stats) || 0;

        const hasMove = (list) => list.some(m => moves.includes(m));

        const dbAbilities = getPokemonAbilities(db);
        const activeAbility = (db.Name.toLowerCase().includes('-mega')) ? (dbAbilities[0] || 'None') : (p.ability || dbAbilities[0] || 'None');
        const ab = activeAbility.toLowerCase();

        // Apply ability stat multipliers for role calculation
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
        if (hasMove(['will-o-wisp', 'thunder wave', 'spore', 'toxic', 'yawn', 'sleep powder'])) allRoles.add('Disruptor');
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
