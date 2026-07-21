/**
 * Enriches assets/moves.json with a `battle` metadata object per move
 * for damage calculation (spread, multi-hit, sound, variable power, etc.).
 * Run: node scripts/enrich-moves-battle.js
 */
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'assets', 'moves.json');
const moves = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const SPREAD_OVERRIDES = new Set([
    'Rock Slide', 'Bulldoze', 'Razor Leaf', 'Swift', 'Explosion', 'Self Destruct',
    'Diamond Storm', 'Lands Wrath', 'Thousand Arrows', 'Thousand Waves',
    'Glacial Lance', 'Precipice Blades', 'Muddy Water', 'Air Cutter', 'Acid',
    'Electroweb', 'Sparkling Aria', 'Expanding Force', 'Make It Rain',
    'Astral Barrage', 'Origin Pulse', 'Eruption', 'Water Spout', 'Dragon Energy',
    'Bleakwind Storm', 'Sandsear Storm', 'Wildbolt Storm', 'Springtide Storm',
    'Clangorous Soul', 'Brutal Swing', 'Breaking Swipe', 'Core Enforcer',
    'Sludge Wave', 'Lava Plume', 'High Horsepower', 'Stomping Tantrum',
    'Surf', 'Earthquake', 'Blizzard', 'Heat Wave', 'Icy Wind', 'Dazzling Gleam',
    'Discharge', 'Hyper Voice', 'Snarl', 'Uproar'
]);

const NOT_SPREAD = new Set([
    'Dragon Darts', 'Snore', 'Round', 'Water Pledge', 'Grass Pledge', 'Fire Pledge',
    'Tera Starstorm', 'Clangorous Soulblaze'
]);

const MULTI_HIT_OVERRIDES = {
    'Surging Strikes': { min: 3, max: 3, variable: false },
    'Dual Wingbeat': { min: 2, max: 2, variable: false },
    'Population Bomb': { min: 1, max: 10, variable: true },
    'Triple Kick': { min: 3, max: 3, variable: false },
    'Triple Axel': { min: 3, max: 3, variable: false }
};

const VARIABLE_POWER = {
    'Eruption': 'hp_ratio',
    'Water Spout': 'hp_ratio',
    'Dragon Energy': 'hp_ratio',
    'Reversal': 'low_hp',
    'Flail': 'low_hp',
    'Heavy Slam': 'weight_ratio',
    'Heat Crash': 'weight_ratio',
    'Low Kick': 'defender_weight',
    'Grass Knot': 'defender_weight',
    'Stored Power': 'positive_boosts',
    'Power Trip': 'positive_boosts',
    'Facade': 'status_user',
    'Hex': 'status_target',
    'Foul Play': 'foul_play',
    'Body Press': 'body_press',
    'Round': 'round',
    'Weather Ball': 'weather_ball',
    'Techno Blast': 'techno_blast',
    'Multi Attack': 'multi_attack',
    'Judgment': 'judgment',
    'Ivy Cudgel': 'ivy_cudgel',
    'Tera Blast': 'tera_blast',
    'Electro Ball': 'speed_ratio',
    'Gyro Ball': 'speed_ratio_def',
    'Punishment': 'punishment',
    'Crush Grip': 'hp_ratio',
    'Wring Out': 'hp_ratio',
    'Return': 'friendship',
    'Frustration': 'friendship',
    'Magnitude': 'magnitude',
    'Trump Card': 'trump_card',
    'Fling': 'fling'
};

const DYNAMIC_TYPE = {
    'Weather Ball': 'weather_ball',
    'Techno Blast': 'techno_blast',
    'Multi Attack': 'multi_attack',
    'Judgment': 'judgment',
    'Ivy Cudgel': 'ivy_cudgel',
    'Tera Blast': 'tera_blast',
    'Natural Gift': 'natural_gift',
    'Hidden Power': 'hidden_power'
};

function parseMultiHit(desc) {
    const d = (desc || '').toLowerCase();
    if (/hits 2.?5 times|2.?5 times in one turn/.test(d)) return { min: 2, max: 5, variable: true };
    if (/hits twice|attacks twice|hit twice|twice in one turn|twice in the same turn|twice in a row|hits two times/.test(d)) {
        return { min: 2, max: 2, variable: false };
    }
    if (/hits three times|three times in one turn/.test(d)) return { min: 3, max: 3, variable: false };
    return null;
}

function isSpreadMove(move) {
    if (NOT_SPREAD.has(move.name)) return false;

    const tags = move.tags || [];
    const power = move.power || 0;
    const desc = (move.short_descripton || '').toLowerCase();
    const dmg = (move.damage_class || '').toLowerCase();

    if (dmg === 'status' || !power) return false;
    if (SPREAD_OVERRIDES.has(move.name)) return true;
    if (tags.includes('All Pokemon') || tags.includes('All Opponents')) return true;
    if (tags.includes('Wind') && power > 0) return true;
    if (/damages all opposing|all opposing pokémon/.test(desc) && power > 0) return true;
    return false;
}

function enrichMove(move) {
    const tags = move.tags || [];
    const desc = move.short_descripton || '';
    const battle = {
        ...(move.battle || {}),
        spread: isSpreadMove(move),
        sound: tags.includes('Sound-Based'),
        contact: tags.includes('Contact'),
        priority: move.priority > 0,
        multiHit: MULTI_HIT_OVERRIDES[move.name] || parseMultiHit(desc) || move.battle?.multiHit || null,
        variablePower: VARIABLE_POWER[move.name] || move.battle?.variablePower || null,
        dynamicType: DYNAMIC_TYPE[move.name] || move.battle?.dynamicType || null
    };
    return { ...move, battle };
}

const enriched = moves.map(enrichMove);
fs.writeFileSync(jsonPath, JSON.stringify(enriched, null, 2) + '\n');
console.log(`Enriched ${enriched.length} moves with battle metadata.`);
