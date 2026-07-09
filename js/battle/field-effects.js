/**
 * Field hazards, terrain, and ruin ability modifiers.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};
    const { getTypeModifier } = BC;

    function getDefenderTypes(defender) {
        let types = [defender.type1, defender.type2].filter(t => t && t !== 'None');
        if (defender.tera && defender.teraType !== 'Stellar') types = [defender.teraType];
        return types;
    }

    function isGrounded(defender, field) {
        if (field?.gravity) return true;
        if (defender.ability === 'Levitate') return false;
        const types = getDefenderTypes(defender);
        if (types.includes('Flying')) return false;
        if (defender.item && defender.item.toLowerCase() === 'air balloon') return false;
        return true;
    }

    function calcStealthRockDamage(defender) {
        const types = getDefenderTypes(defender);
        const mod = getTypeModifier('Rock', types);
        if (mod === 0) return 0;
        return Math.floor(defender.stats.hp * mod / 8);
    }

    function calcSpikesDamage(defender, layers) {
        if (!layers || layers <= 0) return 0;
        const frac = layers === 1 ? 1 / 8 : layers === 2 ? 1 / 6 : 1 / 4;
        return Math.floor(defender.stats.hp * frac);
    }

    function getHazardDamage(defender, field) {
        const side = defender.id === 1 ? field.side1 : field.side2;
        if (!side || defender.ability === 'Magic Guard') return 0;
        let dmg = 0;
        if (side.stealthRock) dmg += calcStealthRockDamage(defender);
        if (side.spikes > 0 && isGrounded(defender, field)) {
            dmg += calcSpikesDamage(defender, side.spikes);
        }
        return dmg;
    }

    function getEffectiveDefenderHp(defender, field) {
        const maxHp = defender.stats.hp || 0;
        const current = Math.max(0, Math.floor(maxHp * ((defender.hpPercent ?? 100) / 100)));
        const hazard = getHazardDamage(defender, field);
        return Math.max(1, current - hazard);
    }

    function applyRuinModifiers(rawAtk, rawDef, attacker, defender, isSpecial, field) {
        const ruins = field.ruins || {};
        let atk = rawAtk;
        let def = rawDef;

        if (ruins.tablets && attacker.ability !== 'Tablets of Ruin' && !isSpecial) {
            atk = Math.floor(atk * 0.75);
        }
        if (ruins.vessel && attacker.ability !== 'Vessel of Ruin' && isSpecial) {
            atk = Math.floor(atk * 0.75);
        }
        if (ruins.sword && defender.ability !== 'Sword of Ruin' && !isSpecial) {
            def = Math.floor(def * 0.75);
        }
        if (ruins.beads && defender.ability !== 'Beads of Ruin' && isSpecial) {
            def = Math.floor(def * 0.75);
        }
        return { atk, def };
    }

    function getTerrainModifier(moveType, field) {
        const terrain = field.terrain || 'None';
        const type = (moveType || '').toLowerCase();
        if (terrain === 'Electric' && type === 'electric') return 1.3;
        if (terrain === 'Grassy' && type === 'grass') return 1.3;
        if (terrain === 'Psychic' && type === 'psychic') return 1.3;
        if (terrain === 'Misty' && type === 'dragon') return 0.5;
        return 1.0;
    }

    function formatEvSpread(pk, statKey) {
        const val = pk.evs?.[statKey] || 0;
        if (!val) return '';
        const labels = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        return `${val} ${labels[statKey]}`;
    }

    function formatShowdownLine(attacker, defender, move, res, field) {
        const isSpecial = move.category === 'Special';
        const statKey = isSpecial ? 'spa' : 'atk';
        const defKey = isSpecial ? 'spd' : 'def';
        const boost = attacker.boosts?.[statKey] || 0;
        let atkVal = attacker.stats[statKey] || 0;
        if (BC.getBoostValue) atkVal = BC.getBoostValue(atkVal, boost);
        const defVal = defender.stats[defKey] || 0;
        const defHp = getEffectiveDefenderHp(defender, field);
        const maxHp = defender.stats.hp || 1;
        const minDmg = res.rolls[0] || 0;
        const maxDmg = res.rolls[res.rolls.length - 1] || 0;
        const minPct = (minDmg / maxHp * 100).toFixed(1);
        const maxPct = (maxDmg / maxHp * 100).toFixed(1);
        const item = attacker.item && attacker.item !== 'None' ? ` ${attacker.item}` : '';
        const hitLabel = res.hitCount > 1 ? ` (${res.hitCount} hits)` : '';
        const ko = BC.getKOChance(res.rolls, defHp);
        const koSuffix = ko && ko !== 'No immediate KO' ? ` -- ${ko.toLowerCase()}` : '';
        const boostSuffix = boost > 0 ? '+' : '';
        const statLabel = isSpecial ? 'SpA' : 'Atk';
        const defLabel = isSpecial ? 'SpD' : 'Def';
        return `${atkVal}${boostSuffix} ${statLabel} ${attacker.name}${item} ${move.name}${hitLabel} vs. ${defHp} HP / ${defVal} ${defLabel} ${defender.name}: ${minDmg}-${maxDmg} (${minPct}-${maxPct}%)${koSuffix}`;
    }

    BC.getHazardDamage = getHazardDamage;
    BC.getEffectiveDefenderHp = getEffectiveDefenderHp;
    BC.applyRuinModifiers = applyRuinModifiers;
    BC.getTerrainModifier = getTerrainModifier;
    BC.formatShowdownLine = formatShowdownLine;
    BC.isGrounded = isGrounded;
})(typeof globalThis !== 'undefined' ? globalThis : this);
