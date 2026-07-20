/**
 * Stat stage modifiers, paradox abilities, and speed calculation.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};

    function getBoostValue(val, boost) {
        if (boost === 0) return val;
        if (boost > 0) return Math.floor(val * (2 + boost) / 2);
        return Math.floor(val * 2 / (2 + Math.abs(boost)));
    }

    function applyParadoxBoost(pk, rawStat, statKey, field, side) {
        let active = false;
        if (pk.ability === 'Protosynthesis' && (['Sun', 'Harsh Sun'].includes(field.weather) || side.protosynthesis)) active = true;
        if (pk.ability === 'Quark Drive' && (field.terrain === 'Electric' || side.quarkDrive)) active = true;
        if (!active) return rawStat;

        const stats = pk.stats;
        const order = ['atk', 'def', 'spa', 'spd', 'spe'];
        let highestList = [];
        let maxVal = -1;
        for (const k of order) {
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

    function getEffectiveSpeed(calcState, field) {
        if (!calcState || !calcState.stats) return 0;
        let spe = calcState.stats.spe || 0;
        const item = (calcState.item || '').toLowerCase();
        const ab = (calcState.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (item === 'choice scarf') spe = Math.floor(spe * 1.5);
        if (item === 'iron ball') spe = Math.floor(spe * 0.5);
        if ((calcState.status || '').toLowerCase() === 'paralyzed' && ab !== 'quickfeet') {
            spe = Math.floor(spe * 0.5);
        }
        if (ab === 'quickfeet' && calcState.status && calcState.status !== 'Healthy') {
            spe = Math.floor(spe * 1.5);
        }
        const side = calcState.id === 1 ? field.side1 : field.side2;
        if (side?.tailwind) spe = Math.floor(spe * 2);
        spe = applyParadoxBoost(calcState, spe, 'spe', field, side);
        const weather = field?.weather || 'None';
        if ((ab === 'chlorophyll' && (weather === 'Sun' || weather === 'Harsh Sun'))
            || (ab === 'swiftswim' && (weather === 'Rain' || weather === 'Heavy Rain'))
            || (ab === 'sandrush' && weather === 'Sand')
            || (ab === 'slushrush' && (weather === 'Snow' || weather === 'Hail'))
            || (ab === 'surgesurfer' && field?.terrain === 'Electric')) {
            spe = Math.floor(spe * 2);
        }
        return spe;
    }

    function compareSpeedTier(speedA, speedB, trickRoom = false) {
        if (trickRoom) {
            if (speedA < speedB) return 'faster';
            if (speedA > speedB) return 'slower';
            return 'tie';
        }
        if (speedA > speedB) return 'faster';
        if (speedA < speedB) return 'slower';
        return 'tie';
    }

    BC.getBoostValue = getBoostValue;
    BC.applyParadoxBoost = applyParadoxBoost;
    BC.getEffectiveSpeed = getEffectiveSpeed;
    BC.compareSpeedTier = compareSpeedTier;
})(typeof globalThis !== 'undefined' ? globalThis : this);
