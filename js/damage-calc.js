/**
 * Shared damage calculation engine (used by Calc page and Team Analysis)
 * Requires js/utils.js (calculateStat) loaded first.
 */

const typeChart = {
    normal: { ghost: 0, rock: 0.5, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, fighting: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

const SPREAD_MOVES = [
    // Physical
    'Rock Slide', 'Earthquake', 'Bulldoze', 'Razor Leaf', 'Swift', 'Explosion', 'Self-Destruct',
    'Diamond Storm', 'Land\'s Wrath', 'Thousand Arrows', 'Thousand Waves', 'Glacial Lance', 'Precipice Blades',
    // Special
    'Surf', 'Blizzard', 'Heat Wave', 'Muddy Water', 'Icy Wind', 'Dazzling Gleam', 'Discharge',
    'Eruption', 'Water Spout', 'Hyper Voice', 'Snarl', 'Air Cutter', 'Acid', 'Electroweb',
    'Sparkling Aria', 'Expanding Force', 'Make It Rain', 'Astral Barrage', 'Origin Pulse',
    'Dragon Energy', 'Bleakwind Storm', 'Sandsear Storm', 'Wildbolt Storm', 'Springtide Storm'
];
function setupPokemonState(id) {
    return {
        id,
        name: '', baseStats: {}, stats: {},
        level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        nature: 'Hardy', ability: 'None', item: 'None', status: 'Healthy',
        type1: 'None', type2: 'None', tera: false, teraType: 'Normal',
        moves: Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false })),
        hpPercent: 100
    };
}
function getBoostValue(val, boost) {
    if (boost === 0) return val;
    if (boost > 0) return Math.floor(val * (2 + boost) / 2);
    return Math.floor(val * 2 / (2 + Math.abs(boost)));
}

function applyParadoxBoost(pk, rawStat, statKey, field, side) {
    let active = false;
    if (pk.ability === 'Protosynthesis' && (field.weather === 'Sun' || side.protosynthesis)) active = true;
    if (pk.ability === 'Quark Drive' && (field.terrain === 'Electric' || side.quarkDrive)) active = true;

    if (!active) return rawStat;

    const stats = pk.stats;
    const order = ['atk', 'def', 'spa', 'spd', 'spe'];
    // Find highest absolute stat. If tied, use the standard priority order
    let highestList = [];
    let maxVal = -1;
    for (let k of order) {
        if (stats[k] > maxVal) {
            maxVal = stats[k];
            highestList = [k];
        } else if (stats[k] === maxVal) {
            highestList.push(k);
        }
    }
    const highest = highestList[0];

    if (highest === statKey) {
        return Math.floor(rawStat * (highest === 'spe' ? 1.5 : 1.3));
    }
    return rawStat;
}
function getKOChance(rolls, hp) {
    if (rolls.length === 0) return "No data";

    // OHKO
    const ohkoCount = rolls.filter(r => r >= hp).length;
    if (ohkoCount > 0) {
        const prob = (ohkoCount / rolls.length * 100).toFixed(1);
        return (prob === "100.0" || prob === "100") ? "Guaranteed OHKO" : `${prob}% chance to OHKO`;
    }

    // 2HKO
    let tHKOCount = 0;
    for (let i = 0; i < rolls.length; i++) {
        for (let j = 0; j < rolls.length; j++) {
            if (rolls[i] + rolls[j] >= hp) tHKOCount++;
        }
    }
    const total2 = rolls.length * rolls.length;
    if (tHKOCount > 0) {
        const prob = (tHKOCount / total2 * 100).toFixed(1);
        return (prob === "100.0" || prob === "100") ? "Guaranteed 2HKO" : `${prob}% chance to 2HKO`;
    }

    // 3HKO
    let threeHKOCount = 0;
    for (let i = 0; i < rolls.length; i++) {
        for (let j = 0; j < rolls.length; j++) {
            for (let k = 0; k < rolls.length; k++) {
                if (rolls[i] + rolls[j] + rolls[k] >= hp) threeHKOCount++;
            }
        }
    }
    const total3 = Math.pow(rolls.length, 3);
    if (threeHKOCount > 0) {
        const prob = (threeHKOCount / total3 * 100).toFixed(1);
        return (prob === "100.0" || prob === "100") ? "Guaranteed 3HKO" : `${prob}% chance to 3HKO`;
    }

    return "No immediate KO";
}
function calculateDamage(attacker, defender, move, field) {
    const res = { move: move.name, attackerId: attacker.id, minPercent: 0, maxPercent: 0, rolls: [0] };
    if (move.basePower === 0) return res;

    const level = attacker.level;
    const isSpecial = move.category === 'Special';

    // --- Stats & Boosts ---
    let atkBoost = isSpecial ? attacker.boosts.spa : attacker.boosts.atk;
    let defBoost = isSpecial ? defender.boosts.spd : defender.boosts.def;

    // Critical hits ignore negative attack boosts and positive defense boosts
    if (move.crit) {
        if (atkBoost < 0) atkBoost = 0;
        if (defBoost > 0) defBoost = 0;
    }

    let rawAtk = isSpecial ? attacker.stats.spa : attacker.stats.atk;
    let rawDef = isSpecial ? defender.stats.spd : defender.stats.def;

    const attackerSide = attacker.id === 1 ? field.side1 : field.side2;
    const defenderSide = defender.id === 1 ? field.side1 : field.side2;

    rawAtk = applyParadoxBoost(attacker, rawAtk, isSpecial ? 'spa' : 'atk', field, attackerSide);
    rawDef = applyParadoxBoost(defender, rawDef, isSpecial ? 'spd' : 'def', field, defenderSide);

    // --- Foul Play Mechanic ---
    if (move.name === 'Foul Play') {
        rawAtk = defender.stats.atk;
        atkBoost = defender.boosts.atk;
        rawAtk = applyParadoxBoost(defender, rawAtk, 'atk', field, defenderSide);
    }

    // --- Weather Stat Boosts ---
    if (field.weather === 'Snow' && (defender.type1 === 'Ice' || defender.type2 === 'Ice' || (defender.tera && defender.teraType === 'Ice')) && !isSpecial) {
        rawDef = Math.floor(rawDef * 1.5);
    }
    if (field.weather === 'Sand' && (defender.type1 === 'Rock' || defender.type2 === 'Rock' || (defender.tera && defender.teraType === 'Rock')) && isSpecial) {
        rawDef = Math.floor(rawDef * 1.5);
    }

    // --- Ability Stat Boosts ---
    if (attacker.ability === 'Huge Power' || attacker.ability === 'Pure Power') {
        if (!isSpecial) rawAtk *= 2;
    }
    if (attacker.ability === 'Guts' && attacker.status !== 'Healthy') {
        if (!isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    }
    // Flare Boost / Toxic Boost could go here too

    // Apply Items to raw stats
    const item = (attacker.item || '').toLowerCase();
    if (item === 'choice band' && !isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    if (item === 'choice specs' && isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
    if (item === 'eviolite' && defender.name.includes('Line')) rawDef = Math.floor(rawDef * 1.5);

    let atk = getBoostValue(rawAtk, atkBoost);
    let def = getBoostValue(rawDef, defBoost);

    // --- Move BP Adjustments ---
    let basePower = move.basePower;
    let moveType = move.type;

    let abilityBoost = 1.0;

    // --- Dynamic Move Types ---

    // Tera Blast
    if (move.name === 'Tera Blast' && attacker.tera) {
        if (attacker.teraType === 'Stellar') {
            moveType = 'Stellar';
            basePower = 100;
        } else {
            moveType = attacker.teraType;
        }
    }

    // Weather Ball
    const isSun = field.weather === 'Sun' || field.weather === 'Harsh Sun' || attacker.ability === 'Mega Sol' || attacker.ability === 'Desolate Land';
    const isRain = field.weather === 'Rain' || field.weather === 'Heavy Rain' || attacker.ability === 'Primordial Sea';
    const isSand = field.weather === 'Sand';
    const isSnow = field.weather === 'Snow' || field.weather === 'Hail';

    if (move.name === 'Weather Ball') {
        if (isSun) { moveType = 'Fire'; basePower = 100; }
        else if (isRain) { moveType = 'Water'; basePower = 100; }
        else if (isSand) { moveType = 'Rock'; basePower = 100; }
        else if (isSnow) { moveType = 'Ice'; basePower = 100; }
    }

    // Techno Blast & Multi-Attack
    if (move.name === 'Techno Blast' || move.name === 'Multi-Attack') {
        if (item.includes('shock') || item.includes('electric')) moveType = 'Electric';
        if (item.includes('burn') || item.includes('fire')) moveType = 'Fire';
        if (item.includes('chill') || item.includes('ice')) moveType = 'Ice';
        if (item.includes('douse') || item.includes('water')) moveType = 'Water';
    }

    // Judgment
    if (move.name === 'Judgment' && item.includes('plate')) {
        const plateTypes = {
            'flame': 'Fire', 'splash': 'Water', 'zap': 'Electric', 'meadow': 'Grass',
            'icicle': 'Ice', 'fist': 'Fighting', 'toxic': 'Poison', 'earth': 'Ground',
            'sky': 'Flying', 'psychic': 'Psychic', 'insect': 'Bug', 'stone': 'Rock',
            'spooky': 'Ghost', 'draco': 'Dragon', 'dread': 'Dark', 'iron': 'Steel', 'pixie': 'Fairy'
        };
        const pType = Object.keys(plateTypes).find(k => item.startsWith(k));
        if (pType) moveType = plateTypes[pType];
    }

    // Ivy Cudgel
    if (move.name === 'Ivy Cudgel') {
        if (item === 'wellspring mask') moveType = 'Water';
        else if (item === 'hearthflame mask') moveType = 'Fire';
        else if (item === 'cornerstone mask') moveType = 'Rock';
    }

    // --- Type-changing abilities (-ate abilities) ---
    if (moveType === 'Normal') {
        if (attacker.ability === 'Pixilate') { moveType = 'Fairy'; abilityBoost = 1.2; }
        else if (attacker.ability === 'Aerilate') { moveType = 'Flying'; abilityBoost = 1.2; }
        else if (attacker.ability === 'Refrigerate') { moveType = 'Ice'; abilityBoost = 1.2; }
        else if (attacker.ability === 'Galvanize') { moveType = 'Electric'; abilityBoost = 1.2; }
        else if (attacker.ability === 'Dragonize') { moveType = 'Dragon'; abilityBoost = 1.2; }
    }

    // Liquid Voice
    const soundMoves = ['Hyper Voice', 'Boomburst', 'Snarl', 'Relic Song', 'Sparkling Aria', 'Disarming Voice', 'Echoed Voice', 'Round', 'Overdrive', 'Torch Song', 'Blood Moon', 'Clanging Scales', 'Bug Buzz', 'Chatter', 'Uproar', 'Eerie Spell', 'Sing', 'Perish Song', 'Roar'];
    if (attacker.ability === 'Liquid Voice' && soundMoves.includes(move.name)) {
        moveType = 'Water';
    }

    // Status boosts
    if (move.name === 'Facade' && attacker.status !== 'Healthy') basePower = 140;
    if (move.name === 'Hex' && defender.status !== 'Healthy') basePower = 130;

    // HP-based moves (Eruption, Water Spout, Dragon Energy)
    if (['Eruption', 'Water Spout', 'Dragon Energy'].includes(move.name)) {
        const hpRatio = attacker.hpPercent / 100;
        basePower = Math.max(1, Math.floor(150 * hpRatio));
    }

    // HP-based moves (Reversal, Flail — power increases as HP lowers)
    if (['Reversal', 'Flail'].includes(move.name)) {
        const hpRatio = attacker.hpPercent / 100;
        if (hpRatio <= 0.0417) basePower = 200;
        else if (hpRatio <= 0.1042) basePower = 150;
        else if (hpRatio <= 0.2083) basePower = 100;
        else if (hpRatio <= 0.3542) basePower = 80;
        else if (hpRatio <= 0.6875) basePower = 40;
        else basePower = 20;
    }

    // Weight-based moves (Heavy Slam, Heat Crash)
    if (['Heavy Slam', 'Heat Crash'].includes(move.name)) {
        const atkWeight = attacker.baseStats?.weight || 10.0;
        const defWeight = defender.baseStats?.weight || 10.0;
        const ratio = atkWeight / defWeight;
        if (ratio >= 5) basePower = 120;
        else if (ratio >= 4) basePower = 100;
        else if (ratio >= 3) basePower = 80;
        else if (ratio >= 2) basePower = 60;
        else basePower = 40;
    }

    // Weight-based moves (Low Kick, Grass Knot — power based on defender weight)
    if (['Low Kick', 'Grass Knot'].includes(move.name)) {
        const defWeight = defender.baseStats?.weight || 10.0;
        if (defWeight >= 200.0) basePower = 120;
        else if (defWeight >= 100.0) basePower = 100;
        else if (defWeight >= 50.0) basePower = 80;
        else if (defWeight >= 25.0) basePower = 60;
        else if (defWeight >= 10.0) basePower = 40;
        else basePower = 20;
    }

    // Stored Power / Power Trip
    if (move.name === 'Stored Power' || move.name === 'Power Trip') {
        let positiveBoosts = 0;
        for (let k in attacker.boosts) {
            if (attacker.boosts[k] > 0) positiveBoosts += attacker.boosts[k];
        }
        basePower = 20 + (20 * positiveBoosts);
    }

    // Tera BP Boost (60 BP floor)
    if (attacker.id === 1 && attacker.tera && moveType === attacker.teraType && basePower < 60 && basePower > 0 && attacker.teraType !== 'Stellar') {
        // Exclude Priority and Multi-hit from the 60 BP floor
        const isPriority = ['Quick Attack', 'Mach Punch', 'Aqua Jet', 'Ice Shard', 'Shadow Sneak', 'Sucker Punch', 'Fake Out', 'Bullet Punch', 'Vacuum Wave', 'Extreme Speed', 'Water Shuriken'].includes(move.name);
        if (!isPriority && !move.hits) {
            basePower = 60;
        }
    }


    // --- Base Damage Calculation ---
    let baseDamage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * atk / def) / 50) + 2;

    // --- Modifiers ---
    let modifier = 1.0;

    // 0. Spread Move Reduction
    if (field.format === 'Doubles' && SPREAD_MOVES.includes(move.name)) {
        modifier *= 0.75;
    }

    // 1. Weather
    if (isSun) {
        if (moveType === 'Fire') modifier *= 1.5;
        if (moveType === 'Water') modifier *= 0.5;
    } else if (isRain) {
        if (moveType === 'Water') modifier *= 1.5;
        if (moveType === 'Fire') modifier *= 0.5;
    }

    // Apply abilityBoost from Pixilate/Aerilate etc.
    modifier *= abilityBoost;

    // 2. Critical Hit
    if (move.crit) modifier *= 1.5;

    // 3. STAB
    let stab = 1.0;
    let isOriginalSTAB = (moveType === attacker.type1 || moveType === attacker.type2);

    if (attacker.tera) {
        if (attacker.teraType === 'Stellar') {
            stab = isOriginalSTAB ? 2.0 : 1.2;
        } else if (moveType === attacker.teraType) {
            stab = isOriginalSTAB ? 2.0 : 1.5;
            if (attacker.ability === 'Adaptability') stab = isOriginalSTAB ? 2.25 : 2.0;
        } else if (isOriginalSTAB) {
            stab = 1.5;
        }
    } else if (isOriginalSTAB) {
        stab = (attacker.ability === 'Adaptability') ? 2.0 : 1.5;
    }
    modifier *= stab;

    // 4. Type Effectiveness & Ability Immunities
    let typeMod = 1.0;
    const isMoldBreaker = attacker.ability === 'Mold Breaker';

    // Defender Tera Types
    let defTypes = [defender.type1, defender.type2].filter(t => t && t !== 'None');
    if (defender.id === 1 && defender.tera && defender.teraType !== 'Stellar') {
        defTypes = [defender.teraType];
    } else if (defender.id === 2 && defender.tera && defender.teraType !== 'Stellar') {
        // Handle slot 2 too (the attacker/defender logic is a bit mixed in recalculate)
        defTypes = [defender.teraType];
    }

    // Special case for Stellar Tera Blast vs Tera Target
    if (moveType === 'Stellar') {
        typeMod = defender.tera ? 2.0 : 1.0;
    } else {
        defTypes.forEach(t => {
            const interaction = typeChart[moveType.toLowerCase()]?.[t.toLowerCase()];
            if (interaction !== undefined) typeMod *= interaction;
        });
    }

    // Ability-based Immunities
    if (!isMoldBreaker) {
        if (defender.ability === 'Wonder Guard' && typeMod <= 1 && moveType !== 'None') return res;
        if (defender.ability === 'Levitate' && moveType === 'Ground') return res;
        if (defender.ability === 'Flash Fire' && moveType === 'Fire') return res;
        if ((defender.ability === 'Water Absorb' || defender.ability === 'Storm Drain') && moveType === 'Water') return res;
        if ((defender.ability === 'Volt Absorb' || defender.ability === 'Lightning Rod') && moveType === 'Electric') return res;
        if (defender.ability === 'Sap Sipper' && moveType === 'Grass') return res;
        if (defender.ability === 'Earth Eater' && moveType === 'Ground') return res;
        if (defender.ability === 'Well-Baked Body' && moveType === 'Fire') return res;
    }

    // Filter/Solid Rock/Primal Armor
    if (!isMoldBreaker && typeMod > 1 && (defender.ability === 'Filter' || defender.ability === 'Solid Rock')) {
        modifier *= 0.75;
    }

    modifier *= typeMod;
    if (typeMod === 0) return res;

    // 5. Burn
    if (attacker.status === 'Burned' && !isSpecial && attacker.ability !== 'Guts') {
        modifier *= 0.5;
    }

    // 6. Screens
    const defSide = defender.id === 1 ? field.side1 : field.side2;
    if (!move.crit && attacker.ability !== 'Infiltrator') {
        if (isSpecial && (defSide.lightScreen || defSide.auroraVeil)) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
        if (!isSpecial && (defSide.reflect || defSide.auroraVeil)) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
    }

    // 7. Items
    if (item === 'life orb') modifier *= 1.3;
    if (item === 'expert belt' && typeMod > 1) modifier *= 1.2;

    const typeItems = {
        'normal': ['silk scarf'],
        'fire': ['charcoal', 'flame plate'],
        'water': ['mystic water', 'sea incense', 'wave incense', 'splash plate'],
        'grass': ['miracle seed', 'rose incense', 'meadow plate'],
        'electric': ['magnet', 'zap plate'],
        'ice': ['never-melt ice', 'icicle plate'],
        'fighting': ['black belt', 'fist plate'],
        'poison': ['poison barb', 'toxic plate'],
        'ground': ['soft sand', 'earth plate'],
        'flying': ['sharp beak', 'sky plate'],
        'psychic': ['twisted spoon', 'odd incense', 'mind plate'],
        'bug': ['silver powder', 'insect plate'],
        'rock': ['hard stone', 'rock incense', 'stone plate'],
        'ghost': ['spell tag', 'spooky plate'],
        'dragon': ['dragon fang', 'draco plate'],
        'dark': ['black glasses', 'dread plate'],
        'steel': ['metal coat', 'iron plate'],
        'fairy': ['pixie plate', 'fairy feather']
    };
    if (typeItems[moveType.toLowerCase()] && typeItems[moveType.toLowerCase()].includes(item)) {
        modifier *= 1.2;
    }

    // 8. Helping Hand
    if (attackerSide.helpingHand) modifier *= 1.5;

    // --- Damage Rolls ---
    let rolls = [];
    for (let i = 85; i <= 100; i++) {
        let r = Math.floor(baseDamage * i / 100);
        r = Math.floor(r * modifier);
        rolls.push(r);
    }

    // Protection Check
    if (defSide.protect && attacker.ability !== 'Unseen Fist') {
        rolls = rolls.map(() => 0);
    }

    // Parental Bond Check
    if (attacker.ability === 'Parental Bond' && move.category !== 'Status') {
        rolls = rolls.map(r => r + Math.floor(r * 0.25));
    }

    // Multi-hit logic
    const hits = move.hits || 1;
    if (hits > 1) {
        rolls = rolls.map(r => r * hits);
    }

    const defHp = defender.stats.hp;
    res.minPercent = (rolls[0] / defHp * 100).toFixed(1);
    res.maxPercent = (rolls[15] / defHp * 100).toFixed(1);
    res.rolls = rolls;
    return res;
}
function getEffectiveSpeed(calcState, field) {
    if (!calcState || !calcState.stats) return 0;
    let spe = calcState.stats.spe || 0;
    const item = (calcState.item || '').toLowerCase();
    if (item === 'choice scarf') spe = Math.floor(spe * 1.5);
    if ((calcState.status || '').toLowerCase() === 'paralyzed') spe = Math.floor(spe * 0.5);
    const side = calcState.id === 1 ? field.side1 : field.side2;
    return applyParadoxBoost(calcState, spe, 'spe', field, side);
}

function compareSpeedTier(speedA, speedB) {
    if (speedA > speedB) return 'faster';
    if (speedA < speedB) return 'slower';
    return 'tie';
}

function getDefaultField(format = 'Singles') {
    return {
        format,
        weather: 'None',
        terrain: 'None',
        gravity: false,
        magicRoom: false,
        wonderRoom: false,
        side1: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false },
        side2: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false }
    };
}

function buildCalcStateFromSlot(slot, id, db, movesDb) {
    const pk = setupPokemonState(id);
    if (!db || !slot) return pk;
    pk.name = db.Name;
    pk.type1 = db.Type_1;
    pk.type2 = db.Type_2 || 'None';
    pk.baseStats = {
        hp: parseInt(db.HP) || 0,
        atk: parseInt(db.Attack) || 0,
        def: parseInt(db.Defense) || 0,
        spa: parseInt(db['Sp.Atk']) || 0,
        spd: parseInt(db['Sp.Def']) || 0,
        spe: parseInt(db.Speed) || 0,
        weight: parseFloat(db['Weight{kg}']) || 10.0
    };
    pk.level = slot.level || 50;
    pk.ivs = { ...(slot.ivs || pk.ivs) };
    pk.evs = { ...(slot.evs || pk.evs) };
    pk.nature = slot.nature || 'Serious';
    pk.ability = slot.ability || (Array.isArray(db.Ability) ? db.Ability[0] : db.Ability) || 'None';
    pk.item = slot.item || 'None';
    pk.tera = false;
    pk.teraType = slot.tera || 'Normal';
    pk.hpPercent = 100;
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(k => {
        pk.stats[k] = calculateStat(pk.baseStats[k], pk.ivs[k], pk.evs[k], pk.level, pk.nature, k);
    });
    pk.moves = Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false }));
    (slot.moves || []).filter(m => m).forEach((moveName, idx) => {
        if (idx >= 4) return;
        const mData = (movesDb || []).find(m => (m.name || '').toLowerCase() === moveName.toLowerCase());
        if (mData) {
            pk.moves[idx] = {
                name: mData.name,
                basePower: parseInt(mData.power) || 0,
                type: mData.type,
                category: mData.damage_class || mData.category || 'Physical',
                crit: false
            };
        }
    });
    return pk;
}

function findBestDamage(attacker, defender, field) {
    let best = null;
    attacker.moves.forEach(move => {
        if (!move || move.name === 'None' || move.basePower === 0) return;
        const res = calculateDamage(attacker, defender, move, field);
        const maxPct = parseFloat(res.maxPercent);
        if (maxPct <= 0) return;
        if (!best || maxPct > parseFloat(best.maxPercent)) {
            best = {
                move: move.name,
                minPercent: res.minPercent,
                maxPercent: res.maxPercent,
                rolls: res.rolls,
                koLabel: getKOChance(res.rolls, defender.stats.hp)
            };
        }
    });
    return best;
}

function isStrongAnswer(koLabel) {
    if (!koLabel) return false;
    return koLabel.includes('OHKO') || koLabel.includes('2HKO');
}
