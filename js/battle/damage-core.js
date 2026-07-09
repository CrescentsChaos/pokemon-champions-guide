/**
 * Core damage calculation engine.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};
    const MoveIndex = BC.MoveIndex;
    const { getBoostValue, applyParadoxBoost } = BC;
    const { getTypeModifier } = BC;
    const { resolveMoveType, resolveBasePower, applyTeraBpFloor, weatherFlags } = BC;

    const TYPE_ITEMS = {
        normal: ['silk scarf'],
        fire: ['charcoal', 'flame plate'],
        water: ['mystic water', 'sea incense', 'wave incense', 'splash plate'],
        grass: ['miracle seed', 'rose incense', 'meadow plate'],
        electric: ['magnet', 'zap plate'],
        ice: ['never-melt ice', 'icicle plate'],
        fighting: ['black belt', 'fist plate'],
        poison: ['poison barb', 'toxic plate'],
        ground: ['soft sand', 'earth plate'],
        flying: ['sharp beak', 'sky plate'],
        psychic: ['twisted spoon', 'odd incense', 'mind plate'],
        bug: ['silver powder', 'insect plate'],
        rock: ['hard stone', 'rock incense', 'stone plate'],
        ghost: ['spell tag', 'spooky plate'],
        dragon: ['dragon fang', 'draco plate'],
        dark: ['black glasses', 'dread plate'],
        steel: ['metal coat', 'iron plate'],
        fairy: ['pixie plate', 'fairy feather']
    };

    function getDefenderTypes(defender) {
        let defTypes = [defender.type1, defender.type2].filter(t => t && t !== 'None');
        if (defender.tera && defender.teraType !== 'Stellar') {
            defTypes = [defender.teraType];
        }
        return defTypes;
    }

    function calculateStab(attacker, moveType) {
        let stab = 1.0;
        const isOriginalSTAB = (moveType === attacker.type1 || moveType === attacker.type2);

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
        return stab;
    }

    function checkAbilityImmunity(attacker, defender, moveType, typeMod, field) {
        const isMoldBreaker = attacker.ability === 'Mold Breaker';
        if (isMoldBreaker) return false;
        if (defender.ability === 'Wonder Guard' && typeMod <= 1 && moveType !== 'None') return true;
        if (defender.ability === 'Levitate' && moveType === 'Ground' && !field.gravity) return true;
        if (defender.ability === 'Flash Fire' && moveType === 'Fire') return true;
        if ((defender.ability === 'Water Absorb' || defender.ability === 'Storm Drain') && moveType === 'Water') return true;
        if ((defender.ability === 'Volt Absorb' || defender.ability === 'Lightning Rod') && moveType === 'Electric') return true;
        if (defender.ability === 'Sap Sipper' && moveType === 'Grass') return true;
        if (defender.ability === 'Earth Eater' && moveType === 'Ground') return true;
        if (defender.ability === 'Well-Baked Body' && moveType === 'Fire') return true;
        return false;
    }

    function calculateDamage(attacker, defender, move, field) {
        const res = { move: move.name, attackerId: attacker.id, minPercent: 0, maxPercent: 0, rolls: [0] };
        if (move.basePower === 0) return res;

        const moveRecord = MoveIndex.get(move.name);
        const level = attacker.level;
        const isSpecial = move.category === 'Special';

        let atkBoost = isSpecial ? attacker.boosts.spa : attacker.boosts.atk;
        const defStatKey = field.wonderRoom
            ? (isSpecial ? 'def' : 'spd')
            : (isSpecial ? 'spd' : 'def');
        let defBoost = defender.boosts[defStatKey];

        if (move.crit) {
            if (atkBoost < 0) atkBoost = 0;
            if (defBoost > 0) defBoost = 0;
        }

        let rawAtk = isSpecial ? attacker.stats.spa : attacker.stats.atk;
        let rawDef = defender.stats[defStatKey];

        const attackerSide = attacker.id === 1 ? field.side1 : field.side2;
        const defenderSide = defender.id === 1 ? field.side1 : field.side2;

        rawAtk = applyParadoxBoost(attacker, rawAtk, isSpecial ? 'spa' : 'atk', field, attackerSide);
        rawDef = applyParadoxBoost(defender, rawDef, defStatKey, field, defenderSide);

        const variablePower = moveRecord?.battle?.variablePower || MoveIndex.getVariablePower(move.name);
        if (variablePower === 'foul_play') {
            rawAtk = defender.stats.atk;
            atkBoost = defender.boosts.atk;
            rawAtk = applyParadoxBoost(defender, rawAtk, 'atk', field, defenderSide);
        }

        if (field.weather === 'Snow' && (defender.type1 === 'Ice' || defender.type2 === 'Ice' || (defender.tera && defender.teraType === 'Ice')) && !isSpecial) {
            rawDef = Math.floor(rawDef * 1.5);
        }
        if (field.weather === 'Sand' && (defender.type1 === 'Rock' || defender.type2 === 'Rock' || (defender.tera && defender.teraType === 'Rock')) && isSpecial) {
            rawDef = Math.floor(rawDef * 1.5);
        }

        if (attacker.ability === 'Huge Power' || attacker.ability === 'Pure Power') {
            if (!isSpecial) rawAtk *= 2;
        }
        if (attacker.ability === 'Guts' && attacker.status !== 'Healthy') {
            if (!isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
        }

        const itemsActive = !field.magicRoom;
        const item = itemsActive ? (attacker.item || '').toLowerCase() : '';
        const defenderItem = itemsActive ? (defender.item || '').toLowerCase() : '';
        if (item === 'choice band' && !isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
        if (item === 'choice specs' && isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
        if (defenderItem === 'eviolite' && defender.name.includes('Line')) rawDef = Math.floor(rawDef * 1.5);

        const typeItem = itemsActive ? item : '';
        const typeResult = resolveMoveType(attacker, move, moveRecord, typeItem, field);
        let moveType = typeResult.moveType;
        let abilityBoost = typeResult.abilityBoost;

        let basePower = resolveBasePower(attacker, defender, move, moveRecord, field);
        if (typeResult.basePower !== move.basePower) basePower = typeResult.basePower;
        basePower = applyTeraBpFloor(attacker, move, moveType, basePower);

        let atk = getBoostValue(rawAtk, atkBoost);
        let def = getBoostValue(rawDef, defBoost);

        if (BC.applyRuinModifiers) {
            const ruin = BC.applyRuinModifiers(atk, def, attacker, defender, isSpecial, field);
            atk = ruin.atk;
            def = ruin.def;
        }

        let baseDamage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * atk / def) / 50) + 2;

        let modifier = 1.0;
        const weather = weatherFlags(field, attacker);

        if (field.format === 'Doubles' && MoveIndex.isSpread(move.name)) {
            modifier *= 0.75;
        }

        if (weather.isSun) {
            if (moveType === 'Fire') modifier *= 1.5;
            if (moveType === 'Water') modifier *= 0.5;
        } else if (weather.isRain) {
            if (moveType === 'Water') modifier *= 1.5;
            if (moveType === 'Fire') modifier *= 0.5;
        }

        modifier *= abilityBoost;

        if (attacker.ability === 'Water Bubble' && moveType === 'Water') {
            modifier *= 2;
        }

        if (move.crit) modifier *= 1.5;

        modifier *= calculateStab(attacker, moveType);

        let typeMod = 1.0;
        const defTypes = getDefenderTypes(defender);

        if (moveType === 'Stellar') {
            typeMod = defender.tera ? 2.0 : 1.0;
        } else {
            typeMod = getTypeModifier(moveType, defTypes);
            if (field.gravity && moveType === 'Ground' && typeMod === 0) {
                typeMod = 1.0;
            }
        }

        if (checkAbilityImmunity(attacker, defender, moveType, typeMod, field)) return res;

        if (typeMod > 1 && (defender.ability === 'Filter' || defender.ability === 'Solid Rock') && attacker.ability !== 'Mold Breaker') {
            modifier *= 0.75;
        }

        modifier *= typeMod;
        if (typeMod === 0) return res;

        if (attacker.status === 'Burned' && !isSpecial && attacker.ability !== 'Guts') {
            modifier *= 0.5;
        }

        const defSide = defender.id === 1 ? field.side1 : field.side2;
        if (!move.crit && attacker.ability !== 'Infiltrator') {
            if (isSpecial && (defSide.lightScreen || defSide.auroraVeil)) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
            if (!isSpecial && (defSide.reflect || defSide.auroraVeil)) modifier *= (field.format === 'Doubles' ? 2 / 3 : 0.5);
        }

        if (item === 'life orb') modifier *= 1.3;
        if (item === 'expert belt' && typeMod > 1) modifier *= 1.2;

        const typeItemList = TYPE_ITEMS[moveType.toLowerCase()];
        if (typeItemList && typeItemList.includes(item)) modifier *= 1.2;

        if (attackerSide.helpingHand) modifier *= 1.5;

        if (BC.getTerrainModifier) modifier *= BC.getTerrainModifier(moveType, field);

        let rolls = [];
        for (let i = 85; i <= 100; i++) {
            let r = Math.floor(baseDamage * i / 100);
            r = Math.floor(r * modifier);
            rolls.push(r);
        }

        if (defSide.protect && attacker.ability !== 'Unseen Fist') {
            rolls = rolls.map(() => 0);
        }

        if (attacker.ability === 'Parental Bond' && move.category !== 'Status') {
            rolls = rolls.map(r => r + Math.floor(r * 0.25));
        }

        const hitCount = BC.resolveHitCount(move, attacker);
        if (hitCount > 1) {
            rolls = BC.combineMultiHitRolls(rolls, hitCount);
        }

        const defHp = defender.stats.hp;
        const effHp = BC.getEffectiveDefenderHp ? BC.getEffectiveDefenderHp(defender, field) : Math.floor(defHp * (defender.hpPercent ?? 100) / 100);
        res.minDmg = rolls[0];
        res.maxDmg = rolls[rolls.length - 1];
        res.effectiveHp = effHp;
        res.minPercent = (rolls[0] / defHp * 100).toFixed(1);
        res.maxPercent = (rolls[rolls.length - 1] / defHp * 100).toFixed(1);
        res.rolls = rolls;
        res.hitCount = hitCount;
        return res;
    }

    BC.calculateDamage = calculateDamage;
})(typeof globalThis !== 'undefined' ? globalThis : this);
