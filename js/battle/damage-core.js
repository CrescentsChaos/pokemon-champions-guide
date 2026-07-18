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

    function checkAbilityImmunity(attacker, defender, move, moveType, typeMod, field) {
        const ab = (defender.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const atkAb = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const breaksAbility = atkAb === 'moldbreaker' || atkAb === 'teravolt' || atkAb === 'turboblaze';
        if (breaksAbility) return false;

        if (defender.ability === 'Wonder Guard' && typeMod <= 1 && moveType !== 'None') return true;
        if (defender.ability === 'Levitate' && moveType === 'Ground' && !field.gravity) return true;
        if (defender.ability === 'Flash Fire' && moveType === 'Fire') return true;
        if ((defender.ability === 'Water Absorb' || defender.ability === 'Storm Drain') && moveType === 'Water') return true;
        if ((defender.ability === 'Volt Absorb' || defender.ability === 'Lightning Rod') && moveType === 'Electric') return true;
        if (defender.ability === 'Sap Sipper' && moveType === 'Grass') return true;
        if (defender.ability === 'Earth Eater' && moveType === 'Ground') return true;
        if (defender.ability === 'Well-Baked Body' && moveType === 'Fire') return true;

        // Tag-based move immunities
        if (ab === 'bulletproof' && MoveIndex.isBallBomb(move)) return true;
        if (ab === 'soundproof' && MoveIndex.isSound(move)) return true;
        if (ab === 'windrider' && MoveIndex.isWind(move)) return true;

        return false;
    }

    /** Round half down (Showdown / in-game pokeRound). */
    function pokeRound(num) {
        return (num % 1 > 0.5) ? Math.ceil(num) : Math.floor(num);
    }

    function of16(n) {
        return n > 65535 ? n % 65536 : n;
    }

    function of32(n) {
        return n > 4294967295 ? n % 4294967296 : n;
    }

    function normalizeMoveCategory(cat) {
        const c = (cat || '').toString().toLowerCase();
        if (c === 'special') return 'Special';
        if (c === 'status') return 'Status';
        return 'Physical';
    }

    /** Chain 4096-fixed modifiers the way Gen 5+ battles do. */
    function chainMods(mods, lowerBound = 41, upperBound = 131072) {
        let M = 4096;
        for (const mod of mods) {
            if (mod !== 4096) {
                M = (M * mod + 2048) >> 12;
            }
        }
        return Math.max(Math.min(M, upperBound), lowerBound);
    }

    function stabFloatToMod(stab) {
        if (stab === 1) return 4096;
        if (stab === 1.2) return 4915;
        if (stab === 1.5) return 6144;
        if (stab === 2) return 8192;
        if (stab === 2.25) return 9216;
        return Math.round(stab * 4096);
    }

    /**
     * Apply random → STAB → type → burn → chained final mods (Showdown order).
     * Spread / weather / crit must already be folded into baseAmount.
     */
    function getFinalDamage(baseAmount, rollIndex, effectiveness, isBurned, stabMod, finalMod) {
        let damageAmount = Math.floor(of32(baseAmount * (85 + rollIndex)) / 100);
        if (stabMod !== 4096) damageAmount = of32(damageAmount * stabMod) / 4096;
        damageAmount = Math.floor(of32(pokeRound(damageAmount) * effectiveness));
        if (isBurned) damageAmount = Math.floor(damageAmount / 2);
        return of16(pokeRound(Math.max(1, of32(damageAmount * finalMod) / 4096)));
    }

    function calculateDamage(attacker, defender, move, field) {
        const res = { move: move.name, attackerId: attacker.id, minPercent: 0, maxPercent: 0, rolls: [0] };
        if (move.basePower === 0) return res;

        const moveRecord = MoveIndex.get(move.name);
        const level = attacker.level;
        const category = normalizeMoveCategory(move.category || moveRecord?.category);
        const isSpecial = category === 'Special';

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
        if (item === 'choice band' && !isSpecial) rawAtk = pokeRound(of32(rawAtk * 6144) / 4096);
        if (item === 'choice specs' && isSpecial) rawAtk = pokeRound(of32(rawAtk * 6144) / 4096);
        if (defenderItem === 'eviolite' && defender.name.includes('Line')) rawDef = Math.floor(rawDef * 1.5);

        const typeItem = itemsActive ? item : '';
        const typeResult = resolveMoveType(attacker, move, moveRecord, typeItem, field);
        let moveType = typeResult.moveType;
        let abilityBoost = typeResult.abilityBoost;

        let basePower = resolveBasePower(attacker, defender, move, moveRecord, field);
        if (typeResult.basePower !== move.basePower) basePower = typeResult.basePower;
        basePower = applyTeraBpFloor(attacker, move, moveType, basePower);

        // BP modifiers (Showdown order): -ate abilities, Helping Hand, terrain,
        // then type-boosting items (Fairy Feather, plates, etc.) — NOT final mods.
        const bpMods = [];
        if (abilityBoost && abilityBoost !== 1) {
            bpMods.push(Math.round(abilityBoost * 4096));
        }
        if (attackerSide.helpingHand) bpMods.push(6144);
        // Supreme Overlord: BP × (1.0–1.5) from fainted allies (capped at 5)
        {
            const abKey = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (abKey === 'supremeoverlord') {
                const fallen = Math.min(5, Math.max(0, parseInt(attacker.alliesFainted, 10) || 0));
                if (fallen > 0) {
                    const powMod = [4096, 4506, 4915, 5325, 5734, 6144];
                    bpMods.push(powMod[fallen]);
                }
            }
        }
        if (BC.getTerrainModifier) {
            const terrainMult = BC.getTerrainModifier(moveType, field);
            if (terrainMult === 1.3) bpMods.push(5325);
            else if (terrainMult === 0.5) bpMods.push(2048);
            else if (terrainMult !== 1) bpMods.push(Math.round(terrainMult * 4096));
        }
        const typeItemList = TYPE_ITEMS[moveType.toLowerCase()];
        if (typeItemList && typeItemList.includes(item)) {
            bpMods.push(4915);
        }
        if (item === 'muscle band' && !isSpecial) bpMods.push(4505);
        if (item === 'wise glasses' && isSpecial) bpMods.push(4505);
        if (bpMods.length) {
            basePower = of16(Math.max(1, pokeRound((basePower * chainMods(bpMods, 41, 2097152)) / 4096)));
        }

        // Water Bubble doubles the offensive stat for Water moves
        if (attacker.ability === 'Water Bubble' && moveType === 'Water') {
            rawAtk = Math.floor(rawAtk * 2);
        }

        let atk = getBoostValue(rawAtk, atkBoost);
        let def = getBoostValue(rawDef, defBoost);

        if (BC.applyRuinModifiers) {
            const ruin = BC.applyRuinModifiers(atk, def, attacker, defender, isSpecial, field);
            atk = ruin.atk;
            def = ruin.def;
        }

        // Base damage (Showdown getBaseDamage floors)
        let baseDamage = Math.floor(
            of32(
                Math.floor(
                    of32(of32(Math.floor((2 * level) / 5 + 2) * basePower) * atk) / def
                ) / 50 + 2
            )
        );

        const weather = weatherFlags(field, attacker);

        // Spread → weather → crit applied BEFORE the random roll (Showdown order)
        if (field.format === 'Doubles' && MoveIndex.isSpread(move.name)) {
            baseDamage = pokeRound(of32(baseDamage * 3072) / 4096);
        }

        if (weather.isSun) {
            if (moveType === 'Fire') baseDamage = pokeRound(of32(baseDamage * 6144) / 4096);
            if (moveType === 'Water') baseDamage = pokeRound(of32(baseDamage * 2048) / 4096);
        } else if (weather.isRain) {
            if (moveType === 'Water') baseDamage = pokeRound(of32(baseDamage * 6144) / 4096);
            if (moveType === 'Fire') baseDamage = pokeRound(of32(baseDamage * 2048) / 4096);
        }

        if (move.crit) {
            baseDamage = Math.floor(of32(baseDamage * 1.5));
        }

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

        if (checkAbilityImmunity(attacker, defender, move, moveType, typeMod, field)) return res;
        if (typeMod === 0) return res;

        const stabMod = stabFloatToMod(calculateStab(attacker, moveType));

        // Final (post-type) modifiers chained in 4096 fixed-point
        const finalMods = [];
        const defSide = defender.id === 1 ? field.side1 : field.side2;

        if (typeMod > 1 && (defender.ability === 'Filter' || defender.ability === 'Solid Rock') && attacker.ability !== 'Mold Breaker') {
            finalMods.push(3072);
        }

        if (!move.crit && attacker.ability !== 'Infiltrator') {
            if (isSpecial && (defSide.lightScreen || defSide.auroraVeil)) {
                finalMods.push(field.format === 'Doubles' ? 2732 : 2048);
            }
            if (!isSpecial && (defSide.reflect || defSide.auroraVeil)) {
                finalMods.push(field.format === 'Doubles' ? 2732 : 2048);
            }
        }

        if (item === 'life orb') finalMods.push(5324);
        if (item === 'expert belt' && typeMod > 1) finalMods.push(4915);

        const finalMod = chainMods(finalMods);
        const applyBurn = attacker.status === 'Burned' && !isSpecial && attacker.ability !== 'Guts';

        let rolls = [];
        for (let i = 0; i < 16; i++) {
            rolls.push(getFinalDamage(baseDamage, i, typeMod, applyBurn, stabMod, finalMod));
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
        // Showdown truncates % to 1 decimal (e.g. 80.193 → 80.1)
        const pct = (dmg) => (Math.floor((dmg * 1000) / defHp) / 10).toFixed(1);
        res.minDmg = rolls[0];
        res.maxDmg = rolls[rolls.length - 1];
        res.effectiveHp = effHp;
        res.minPercent = pct(rolls[0]);
        res.maxPercent = pct(rolls[rolls.length - 1]);
        res.rolls = rolls;
        res.hitCount = hitCount;
        return res;
    }

    BC.calculateDamage = calculateDamage;
})(typeof globalThis !== 'undefined' ? globalThis : this);
