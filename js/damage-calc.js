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
        'buildCalcStateFromSlot', 'findBestDamage', 'isStrongAnswer',
        'getMoveMultiHitInfo', 'isMultiHitMove', 'getDefaultHitCount',
        'combineMultiHitRolls', 'resolveHitCount', 'initMoveIndex'
    ];

    exports.forEach(exportGlobal);

    global.BattleCalc = BC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
