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

    function getSpeedModifiers(calcState, field) {
        const mods = [];
        const itemsOn = calcState.itemEnabled !== false && !(field && field.magicRoom);
        const item = itemsOn ? (calcState.item || '').toLowerCase() : '';
        const ab = (calcState.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const weather = field?.weather || 'None';
        const side = calcState.id === 1 ? field?.side1 : field?.side2;

        if (item === 'choice scarf') mods.push({ label: 'Choice Scarf', mult: 1.5 });
        if (item === 'iron ball') mods.push({ label: 'Iron Ball', mult: 0.5 });
        if ((calcState.status || '').toLowerCase() === 'paralyzed' && ab !== 'quickfeet') {
            mods.push({ label: 'Paralysis', mult: 0.5 });
        }
        if (ab === 'quickfeet' && calcState.status && calcState.status !== 'Healthy') {
            mods.push({ label: 'Quick Feet', mult: 1.5 });
        }
        if (side?.tailwind) mods.push({ label: 'Tailwind', mult: 2 });
        if ((ab === 'chlorophyll' && (weather === 'Sun' || weather === 'Harsh Sun'))) {
            mods.push({ label: 'Chlorophyll', mult: 2 });
        } else if (ab === 'swiftswim' && (weather === 'Rain' || weather === 'Heavy Rain')) {
            mods.push({ label: 'Swift Swim', mult: 2 });
        } else if (ab === 'sandrush' && weather === 'Sand') {
            mods.push({ label: 'Sand Rush', mult: 2 });
        } else if (ab === 'slushrush' && (weather === 'Snow' || weather === 'Hail')) {
            mods.push({ label: 'Slush Rush', mult: 2 });
        } else if (ab === 'surgesurfer' && field?.terrain === 'Electric') {
            mods.push({ label: 'Surge Surfer', mult: 2 });
        }
        if (ab === 'unburden' && calcState.unburdenActive) {
            mods.push({ label: 'Unburden', mult: 2 });
        }
        return mods;
    }

    function getEffectiveSpeed(calcState, field) {
        if (!calcState || !calcState.stats) return 0;
        let spe = calcState.stats.spe || 0;
        const boost = calcState.boosts?.spe || 0;
        spe = getBoostValue(spe, boost);

        const side = calcState.id === 1 ? field.side1 : field.side2;
        spe = applyParadoxBoost(calcState, spe, 'spe', field, side);

        const mods = getSpeedModifiers(calcState, field);
        for (const mod of mods) {
            spe = Math.floor(spe * mod.mult);
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
    BC.getSpeedModifiers = getSpeedModifiers;
    BC.getEffectiveSpeed = getEffectiveSpeed;
    BC.compareSpeedTier = compareSpeedTier;
})(typeof globalThis !== 'undefined' ? globalThis : this);
