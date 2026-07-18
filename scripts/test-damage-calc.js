/**
 * Smoke tests for battle damage calculation modules.
 * Run: node scripts/test-damage-calc.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { console, calculateStat(base, iv, ev, level, nature, statKey) {
    const lvl = parseInt(level) || 50;
    if (statKey === 'hp') return Math.floor(((2 * parseInt(base) + parseInt(iv || 31)) * lvl) / 100) + lvl + 10;
    return Math.floor(((2 * parseInt(base) + parseInt(iv || 31)) * lvl) / 100) + 5;
} };
vm.createContext(sandbox);

function loadScript(relativePath) {
    const code = fs.readFileSync(path.join(root, relativePath), 'utf8');
    vm.runInContext(code, sandbox, { filename: relativePath });
}

[
    'js/battle/type-chart.js',
    'js/battle/move-index.js',
    'js/battle/stat-modifiers.js',
    'js/battle/move-power.js',
    'js/battle/field-effects.js',
    'js/battle/damage-core.js',
    'js/battle/ko-chance.js',
    'js/battle/pokemon-state.js',
    'js/damage-calc.js'
].forEach(loadScript);

const moves = JSON.parse(fs.readFileSync(path.join(root, 'assets/moves.json'), 'utf8'));
sandbox.initMoveIndex(moves);

const BC = sandbox.BattleCalc;
let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) { passed++; return; }
    failed++;
    console.error('FAIL:', msg);
}

const eq = BC.MoveIndex.get('Earthquake');
assert(eq && eq.power === 100, 'Earthquake power from JSON');
assert(BC.MoveIndex.isSpread('Earthquake'), 'Earthquake is spread via battle meta');
assert(sandbox.isMultiHitMove('Double Slap'), 'Double Slap is multi-hit');
assert(BC.MoveIndex.isSound('Hyper Voice'), 'Hyper Voice is sound');

const field = sandbox.getDefaultField('Singles');
const atk = sandbox.setupPokemonState(1);
const def = sandbox.setupPokemonState(2);
atk.type1 = 'Electric';
atk.type2 = 'None';
atk.stats = { hp: 100, atk: 50, def: 50, spa: 90, spd: 60, spe: 110 };
def.type1 = 'Water';
def.type2 = 'None';
def.stats = { hp: 120, atk: 50, def: 65, spa: 55, spd: 65, spe: 43 };

const thunderbolt = BC.MoveIndex.createMoveState('Thunderbolt');
const result = sandbox.calculateDamage(atk, def, thunderbolt, field);
assert(parseFloat(result.maxPercent) > 0, 'Thunderbolt deals damage');
assert(result.rolls.length === 16, '16 damage rolls');

const fieldD = sandbox.getDefaultField('Doubles');
const surf = BC.MoveIndex.createMoveState('Surf');
const surfSingle = sandbox.calculateDamage(atk, def, surf, field);
const surfDouble = sandbox.calculateDamage(atk, def, surf, fieldD);
assert(parseFloat(surfDouble.maxPercent) < parseFloat(surfSingle.maxPercent), 'Spread move reduced in doubles');

atk.ability = 'Water Bubble';
const waterGun = BC.MoveIndex.createMoveState('Water Gun');
const wb = sandbox.calculateDamage(atk, def, waterGun, field);
atk.ability = 'None';
const normal = sandbox.calculateDamage(atk, def, waterGun, field);
assert(parseFloat(wb.maxPercent) > parseFloat(normal.maxPercent), 'Water Bubble boosts Water moves');

// Official Showdown Champions: LO Garchomp EQ vs Kingambit (Doubles)
const fieldD2 = sandbox.getDefaultField('Doubles');
const garchomp = sandbox.setupPokemonState(1);
const kingambit = sandbox.setupPokemonState(2);
garchomp.name = 'Garchomp';
garchomp.type1 = 'Dragon';
garchomp.type2 = 'Ground';
garchomp.level = 50;
garchomp.stats = { hp: 185, atk: 182, def: 115, spa: 90, spd: 105, spe: 169 };
garchomp.item = 'Life Orb';
garchomp.ability = 'Rough Skin';
kingambit.name = 'Kingambit';
kingambit.type1 = 'Dark';
kingambit.type2 = 'Steel';
kingambit.level = 50;
kingambit.stats = { hp: 207, atk: 205, def: 142, spa: 72, spd: 105, spe: 70 };
const eqShowdown = sandbox.calculateDamage(
    garchomp, kingambit, BC.MoveIndex.createMoveState('Earthquake'), fieldD2
);
assert(eqShowdown.minDmg === 140 && eqShowdown.maxDmg === 166, 'EQ damage 140-166 matches Showdown');
assert(eqShowdown.minPercent === '67.6' && eqShowdown.maxPercent === '80.1', 'EQ percent 67.6-80.1 matches Showdown');
assert(
    eqShowdown.rolls.join(',') === '140,140,143,143,148,148,151,151,151,156,156,159,159,164,164,166',
    'EQ rolls match Showdown exactly'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
