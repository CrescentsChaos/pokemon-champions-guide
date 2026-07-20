/**
 * Shared damage calculation engine (used by Calc page and Team Analysis)
 * Requires js/utils.js (calculateStat) loaded first.
 *
 * Battle modules under js/battle/ provide the implementation;
 * this file re-exports globals for backward compatibility.
 */
(function (global) {
    const BC = global.BattleCalc || {};

    function exportGlobal(name) {
        if (typeof BC[name] === 'function' || BC[name] !== undefined) {
            global[name] = BC[name];
        }
    }

    const exports = [
        'setupPokemonState', 'getBoostValue', 'applyParadoxBoost', 'getKOChance',
        'calculateDamage', 'getEffectiveSpeed', 'compareSpeedTier', 'getDefaultField',
        'getSpeedModifiers', 'buildCalcStateFromSlot', 'findBestDamage', 'isStrongAnswer',
        'getMoveMultiHitInfo', 'isMultiHitMove', 'getDefaultHitCount',
        'combineMultiHitRolls', 'resolveHitCount', 'initMoveIndex',
        'getHazardDamage', 'getEffectiveDefenderHp', 'formatShowdownLine', 'getTerrainModifier'
    ];

    exports.forEach(exportGlobal);

    // Ensure speed helpers always exist as globals (some hosts miss the first pass)
    if (typeof BC.compareSpeedTiers === 'function' && typeof global.compareSpeedTiers !== 'function') {
        global.compareSpeedTiers = BC.compareSpeedTiers;
    }
    if (typeof BC.getEffectiveSpeed === 'function' && typeof global.getEffectiveSpeed !== 'function') {
        global.getEffectiveSpeed = BC.getEffectiveSpeed;
    }

    global.BattleCalc = BC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
