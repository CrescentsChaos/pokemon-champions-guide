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

// Pixilate + Fairy Feather: type items are BP mods (with -ate), not final mods
const sylveon = sandbox.setupPokemonState(1);
const garchomp2 = sandbox.setupPokemonState(2);
sylveon.name = 'Sylveon';
sylveon.type1 = 'Fairy';
sylveon.type2 = 'None';
sylveon.level = 50;
sylveon.ability = 'Pixilate';
sylveon.item = 'Fairy Feather';
sylveon.stats = { hp: 202, atk: 76, def: 87, spa: 178, spd: 150, spe: 80 };
garchomp2.name = 'Garchomp';
garchomp2.type1 = 'Dragon';
garchomp2.type2 = 'Ground';
garchomp2.level = 50;
garchomp2.stats = { hp: 184, atk: 182, def: 115, spa: 90, spd: 105, spe: 169 };
const hvFeather = sandbox.calculateDamage(
    sylveon, garchomp2, BC.MoveIndex.createMoveState('Hyper Voice'), fieldD2
);
assert(hvFeather.minDmg === 186 && hvFeather.maxDmg === 218, 'Pixilate+Fairy Feather HV 186-218 matches Showdown');
assert(hvFeather.minPercent === '101.0' && hvFeather.maxPercent === '118.4', 'HV percent matches Showdown');
const qaFeather = sandbox.calculateDamage(
    sylveon, garchomp2, BC.MoveIndex.createMoveState('Quick Attack'), fieldD2
);
assert(qaFeather.minDmg === 44 && qaFeather.maxDmg === 54, 'Pixilate+Fairy Feather QA 44-54 matches Showdown');

// Variable-power moves resolve their BP before the non-damaging move guard.
const variableAtk = sandbox.setupPokemonState(1);
const variableDef = sandbox.setupPokemonState(2);
variableAtk.type1 = 'Steel';
variableAtk.type2 = 'Fighting';
variableAtk.stats = { hp: 150, atk: 120, def: 160, spa: 100, spd: 100, spe: 25 };
variableAtk.baseStats = { weight: 100 };
variableDef.type1 = 'Normal';
variableDef.type2 = 'None';
variableDef.stats = { hp: 180, atk: 100, def: 100, spa: 100, spd: 100, spe: 150 };
variableDef.baseStats = { weight: 25 };

const gyroBall = BC.MoveIndex.createMoveState('Gyro Ball');
assert(BC.resolveBasePower(variableAtk, variableDef, gyroBall, BC.MoveIndex.get('Gyro Ball'), field) === 150, 'Gyro Ball uses effective Speed ratio and caps at 150 BP');
assert(sandbox.calculateDamage(variableAtk, variableDef, gyroBall, field).minDmg > 0, 'Gyro Ball deals damage with null catalog BP');

const electroBall = BC.MoveIndex.createMoveState('Electro Ball');
assert(BC.resolveBasePower(variableDef, variableAtk, electroBall, BC.MoveIndex.get('Electro Ball'), field) === 150, 'Electro Ball uses effective Speed tiers');

const heavySlam = BC.MoveIndex.createMoveState('Heavy Slam');
assert(BC.resolveBasePower(variableAtk, variableDef, heavySlam, BC.MoveIndex.get('Heavy Slam'), field) === 100, 'Heavy Slam uses weight-ratio tiers');
variableAtk.ability = 'Heavy Metal';
assert(BC.resolveBasePower(variableAtk, variableDef, heavySlam, BC.MoveIndex.get('Heavy Slam'), field) === 120, 'Heavy Metal affects Heavy Slam weight');
variableAtk.item = 'Float Stone';
assert(BC.resolveBasePower(variableAtk, variableDef, heavySlam, BC.MoveIndex.get('Heavy Slam'), field) === 100, 'Float Stone affects effective weight');
variableAtk.ability = 'None';
variableAtk.item = 'None';

const lowKick = BC.MoveIndex.createMoveState('Low Kick');
variableDef.baseStats.weight = 100;
assert(BC.resolveBasePower(variableAtk, variableDef, lowKick, BC.MoveIndex.get('Low Kick'), field) === 80, 'Low Kick handles exact weight boundaries');
variableDef.baseStats.weight = 100.1;
assert(BC.resolveBasePower(variableAtk, variableDef, lowKick, BC.MoveIndex.get('Low Kick'), field) === 100, 'Low Kick advances above weight boundary');
assert(sandbox.calculateDamage(variableAtk, variableDef, lowKick, field).minDmg > 0, 'Low Kick deals damage with null catalog BP');

variableAtk.tera = true;
variableAtk.teraType = 'Steel';
variableAtk.stats.spe = 150;
variableDef.stats.spe = 25;
const weakGyroBp = BC.resolveBasePower(variableAtk, variableDef, gyroBall, BC.MoveIndex.get('Gyro Ball'), field);
assert(weakGyroBp < 60 && BC.applyTeraBpFloor(variableAtk, gyroBall, 'Steel', weakGyroBp) === weakGyroBp, 'Tera BP floor excludes variable-power moves');
variableAtk.tera = false;

const bodyPress = BC.MoveIndex.createMoveState('Body Press');
variableAtk.stats.atk = 200;
variableAtk.stats.def = 50;
const lowDefensePress = sandbox.calculateDamage(variableAtk, variableDef, bodyPress, field);
variableAtk.stats.atk = 50;
variableAtk.stats.def = 200;
const highDefensePress = sandbox.calculateDamage(variableAtk, variableDef, bodyPress, field);
assert(highDefensePress.maxDmg > lowDefensePress.maxDmg, 'Body Press uses Defense instead of Attack');
variableAtk.boosts.def = 2;
const boostedPress = sandbox.calculateDamage(variableAtk, variableDef, bodyPress, field);
assert(boostedPress.maxDmg > highDefensePress.maxDmg, 'Body Press uses Defense stages');

variableAtk.boosts.def = 0;
variableAtk.moves = [gyroBall, BC.MoveIndex.createMoveState('None'), BC.MoveIndex.createMoveState('None'), BC.MoveIndex.createMoveState('None')];
assert(BC.findBestDamage(variableAtk, variableDef, field)?.move === 'Gyro Ball', 'Team analysis considers null-catalog variable-power moves');

const specialAtk = sandbox.setupPokemonState(1);
const mixedDef = sandbox.setupPokemonState(2);
specialAtk.type1 = 'Psychic';
specialAtk.type2 = 'None';
specialAtk.stats = { hp: 150, atk: 50, def: 100, spa: 120, spd: 100, spe: 100 };
mixedDef.type1 = 'Normal';
mixedDef.type2 = 'None';
mixedDef.stats = { hp: 180, atk: 100, def: 50, spa: 100, spd: 200, spe: 100 };
const psyshock = BC.MoveIndex.createMoveState('Psyshock');
const psychic = BC.MoveIndex.createMoveState('Psychic');
const psyshockDamage = sandbox.calculateDamage(specialAtk, mixedDef, psyshock, field);
const psychicDamage = sandbox.calculateDamage(specialAtk, mixedDef, psychic, field);
assert(psyshockDamage.maxDmg > psychicDamage.maxDmg, 'Psyshock targets Defense while remaining Special');
mixedDef.boosts.def = 2;
const boostedDefensePsyshock = sandbox.calculateDamage(specialAtk, mixedDef, psyshock, field);
assert(boostedDefensePsyshock.maxDmg < psyshockDamage.maxDmg, 'Psyshock respects target Defense stages');
assert(!BC.MoveIndex.ignoresDefenseBoosts('Secret Sword'), 'Secret Sword respects target Defense stages');

const hpUser = sandbox.setupPokemonState(1);
const hpTarget = sandbox.setupPokemonState(2);
hpUser.type1 = 'Fighting';
hpUser.type2 = 'None';
hpUser.stats = { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
hpUser.hpPercent = 25;
hpTarget.type1 = 'Normal';
hpTarget.type2 = 'None';
hpTarget.stats = { hp: 300, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
hpTarget.hpPercent = 50;

const finalGambit = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Final Gambit'), field);
assert(finalGambit.minDmg === 50 && finalGambit.userFaints, 'Final Gambit deals the user current HP and marks the user fainting');
const endeavor = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Endeavor'), field);
assert(endeavor.minDmg === 100 && endeavor.targetHpAfter === 50, 'Endeavor lowers target HP to user current HP');
hpTarget.hpPercent = 10;
const failedEndeavor = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Endeavor'), field);
assert(failedEndeavor.effectKind === 'failed' && failedEndeavor.minDmg === 0, 'Endeavor fails when target HP is not higher');
hpTarget.hpPercent = 50;

const painSplit = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Pain Split'), field);
assert(painSplit.userHpAfter === 100 && painSplit.targetHpAfter === 100, 'Pain Split averages current HP');
assert(painSplit.userHpChange === 50 && painSplit.targetHpChange === -50, 'Pain Split reports both HP changes');

const recover = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Recover'), field);
assert(recover.healMin === 100 && recover.hpAfter === 150, 'Recover reports actual HP and percentage healing');
const lifeDew = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Life Dew'), field);
assert(lifeDew.healMin === 50, 'Life Dew heals one quarter max HP');

hpUser.item = 'Big Root';
const strengthSap = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Strength Sap'), field);
assert(strengthSap.healMin === 130 && strengthSap.bigRootBoosted, 'Big Root boosts Strength Sap healing by 30%');
hpTarget.ability = 'Sap Sipper';
const blockedSap = sandbox.calculateDamage(hpUser, hpTarget, BC.MoveIndex.createMoveState('Strength Sap'), field);
assert(blockedSap.effectKind === 'failed' && blockedSap.healMin == null, 'Sap Sipper blocks Strength Sap healing');
hpTarget.ability = 'None';

const gigaDrainMove = BC.MoveIndex.createMoveState('Giga Drain');
hpUser.type1 = 'Grass';
hpUser.stats.spa = 120;
const gigaDrainBigRoot = sandbox.calculateDamage(hpUser, hpTarget, gigaDrainMove, field);
hpUser.item = 'None';
const gigaDrainNormal = sandbox.calculateDamage(hpUser, hpTarget, gigaDrainMove, field);
assert(gigaDrainBigRoot.healMax > gigaDrainNormal.healMax, 'Big Root boosts draining move healing without changing damage');
assert(gigaDrainBigRoot.maxDmg === gigaDrainNormal.maxDmg, 'Big Root does not boost draining move damage');
assert(gigaDrainNormal.healMin === Math.max(1, Math.round(gigaDrainNormal.minDmg / 2)), 'Draining moves round base healing correctly');
hpTarget.hpPercent = 1;
const overkillDrain = sandbox.calculateDamage(hpUser, hpTarget, gigaDrainMove, field);
assert(overkillDrain.healMax === 2, 'Draining move healing is capped by target current HP lost');
hpTarget.hpPercent = 50;

const roundingTarget = sandbox.setupPokemonState(2);
roundingTarget.stats.hp = 101;
roundingTarget.hpPercent = 50;
assert(BC.getEffectiveDefenderHp(roundingTarget, field) === 51, 'Engine and UI use the same current-HP rounding');

const roundMove = BC.MoveIndex.createMoveState('Round');
const roundNormalBp = BC.resolveBasePower(hpUser, hpTarget, roundMove, BC.MoveIndex.get('Round'), field);
roundMove.roundBoosted = true;
const roundBoostedBp = BC.resolveBasePower(hpUser, hpTarget, roundMove, BC.MoveIndex.get('Round'), field);
assert(roundNormalBp === 60 && roundBoostedBp === 120, 'Round option doubles BP after an earlier Round');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
