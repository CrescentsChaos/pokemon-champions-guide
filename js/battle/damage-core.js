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

    /** Type-resist berries: halve SE damage of the matching type (Chilan = any Normal). */
    const RESIST_BERRIES = {
        'occa berry': 'Fire',
        'passho berry': 'Water',
        'wacan berry': 'Electric',
        'rindo berry': 'Grass',
        'yache berry': 'Ice',
        'chople berry': 'Fighting',
        'kebia berry': 'Poison',
        'shuca berry': 'Ground',
        'coba berry': 'Flying',
        'payapa berry': 'Psychic',
        'tanga berry': 'Bug',
        'charti berry': 'Rock',
        'kasib berry': 'Ghost',
        'haban berry': 'Dragon',
        'colbur berry': 'Dark',
        'babiri berry': 'Steel',
        'roseli berry': 'Fairy',
        'chilan berry': 'Normal'
    };

    const HALF_RECOVERY_MOVES = new Set([
        'recover', 'roost', 'slackoff', 'softboiled', 'milkdrink', 'healorder'
    ]);
    const QUARTER_RECOVERY_MOVES = new Set([
        'lifedew', 'junglehealing', 'lunarblessing'
    ]);
    const WEATHER_RECOVERY_MOVES = new Set(['morningsun', 'synthesis', 'moonlight']);
    const DRAIN_RATIOS = {
        absorb: 0.5,
        megadrain: 0.5,
        gigadrain: 0.5,
        dreameater: 0.5,
        leechlife: 0.5,
        drainpunch: 0.5,
        hornleech: 0.5,
        paraboliccharge: 0.5,
        bitterblade: 0.5,
        matchagotcha: 0.5,
        drainingkiss: 0.75,
        oblivionwing: 0.75,
        bouncybubble: 1
    };

    function itemsActiveFor(pk, field) {
        if (!pk) return false;
        if (pk.itemEnabled === false) return false;
        if (field && field.magicRoom) return false;
        return true;
    }

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

    function getCurrentHp(pokemon, field) {
        if (BC.getEffectiveDefenderHp) return BC.getEffectiveDefenderHp(pokemon, field);
        return Math.max(0, Math.floor((pokemon.stats.hp || 0) * ((pokemon.hpPercent ?? 100) / 100)));
    }

    function applyBigRoot(amount, pokemon, field) {
        const item = itemsActiveFor(pokemon, field) ? (pokemon.item || '').toLowerCase() : '';
        return item === 'big root' ? pokeRound(of32(amount * 5324) / 4096) : amount;
    }

    function fillFixedDamageResult(res, damage, defender, field) {
        const maxHp = defender.stats.hp || 1;
        const value = Math.max(0, Math.floor(damage));
        const pct = (Math.floor((value * 1000) / maxHp) / 10).toFixed(1);
        res.minDmg = value;
        res.maxDmg = value;
        res.minPercent = pct;
        res.maxPercent = pct;
        res.rolls = [value];
        res.hitCount = 1;
        res.effectiveHp = getCurrentHp(defender, field);
        res.fixedDamage = true;
        return res;
    }

    function getRecoveryFraction(moveKey, field) {
        if (moveKey === 'rest') return 1;
        if (HALF_RECOVERY_MOVES.has(moveKey)) return 0.5;
        if (QUARTER_RECOVERY_MOVES.has(moveKey)) return 0.25;
        if (WEATHER_RECOVERY_MOVES.has(moveKey)) {
            if (field.weather === 'Sun' || field.weather === 'Harsh Sun') return 2 / 3;
            if (field.weather && field.weather !== 'None') return 0.25;
            return 0.5;
        }
        if (moveKey === 'shoreup') return field.weather === 'Sand' ? 2 / 3 : 0.5;
        if (moveKey === 'floralhealing') return field.terrain === 'Grassy' ? 2 / 3 : 0.5;
        return null;
    }

    function calculateSpecialEffect(attacker, defender, move, moveRecord, field, res) {
        const moveKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const attackerMaxHp = attacker.stats.hp || 1;
        const defenderMaxHp = defender.stats.hp || 1;
        const attackerHp = getCurrentHp(attacker, field);
        const defenderHp = getCurrentHp(defender, field);
        const defenderSide = defender.id === 1 ? field.side1 : field.side2;

        if (moveKey === 'finalgambit' || moveKey === 'endeavor') {
            const typeResult = resolveMoveType(
                attacker,
                move,
                moveRecord,
                itemsActiveFor(attacker, field) ? (attacker.item || '').toLowerCase() : '',
                field
            );
            const moveType = typeResult.moveType;
            let typeMod = getTypeModifier(moveType, getDefenderTypes(defender));
            if (field.gravity && moveType === 'Ground' && typeMod === 0) typeMod = 1;
            const protectedTarget = defenderSide?.protect
                && !((attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'unseenfist' && MoveIndex.isContact(move));
            if (protectedTarget || typeMod === 0 || checkAbilityImmunity(attacker, defender, move, moveType, typeMod, field)) {
                res.effectKind = 'failed';
                res.effectLabel = protectedTarget ? 'Blocked by Protect' : 'No effect';
                return fillFixedDamageResult(res, 0, defender, field);
            }

            const damage = moveKey === 'finalgambit'
                ? attackerHp
                : Math.max(0, defenderHp - attackerHp);
            fillFixedDamageResult(res, damage, defender, field);
            res.effectKind = 'fixed_damage';
            res.targetHpAfter = Math.max(0, defenderHp - damage);
            res.userFaints = moveKey === 'finalgambit' && damage > 0;
            if (moveKey === 'endeavor' && damage === 0) {
                res.effectKind = 'failed';
                res.effectLabel = 'Fails unless the target has more HP';
            }
            return res;
        }

        if (moveKey === 'painsplit') {
            if (defenderSide?.protect) {
                res.effectKind = 'failed';
                res.effectLabel = 'Blocked by Protect';
                return res;
            }
            const sharedHp = Math.floor((attackerHp + defenderHp) / 2);
            res.effectKind = 'pain_split';
            res.userHpBefore = attackerHp;
            res.targetHpBefore = defenderHp;
            res.userHpAfter = Math.min(attackerMaxHp, sharedHp);
            res.targetHpAfter = Math.min(defenderMaxHp, sharedHp);
            res.userHpChange = res.userHpAfter - attackerHp;
            res.targetHpChange = res.targetHpAfter - defenderHp;
            res.rolls = [];
            return res;
        }

        const recoveryFraction = getRecoveryFraction(moveKey, field);
        if (recoveryFraction !== null) {
            const requested = Math.floor(attackerMaxHp * recoveryFraction);
            const healed = Math.min(Math.max(0, attackerMaxHp - attackerHp), requested);
            res.effectKind = 'healing';
            res.healMin = healed;
            res.healMax = healed;
            res.healPercentMin = (healed * 100 / attackerMaxHp).toFixed(1);
            res.healPercentMax = res.healPercentMin;
            res.hpAfter = attackerHp + healed;
            res.recoveryPercent = recoveryFraction * 100;
            res.healsAllies = moveKey === 'lifedew' || moveKey === 'junglehealing' || moveKey === 'lunarblessing';
            if (moveKey === 'rest') res.effectLabel = 'User falls asleep';
            res.rolls = [];
            return res;
        }

        if (moveKey === 'strengthsap') {
            const targetAbility = (defender.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (defenderSide?.protect || targetAbility === 'sapsipper' || (defender.boosts?.atk ?? 0) <= -6) {
                res.effectKind = 'failed';
                res.effectLabel = defenderSide?.protect
                    ? 'Blocked by Protect'
                    : targetAbility === 'sapsipper'
                        ? 'Blocked by Sap Sipper; target gains +1 Attack'
                        : 'Fails at -6 target Attack';
                return res;
            }
            let targetAttack = getBoostValue(defender.stats.atk || 0, defender.boosts?.atk || 0);
            const targetItem = itemsActiveFor(defender, field) ? (defender.item || '').toLowerCase() : '';
            if (targetAbility === 'hugepower' || targetAbility === 'purepower') targetAttack *= 2;
            if (targetAbility === 'hustle') targetAttack = Math.floor(targetAttack * 1.5);
            if (targetAbility === 'guts' && defender.status !== 'Healthy') targetAttack = Math.floor(targetAttack * 1.5);
            if (targetAbility === 'slowstart') targetAttack = Math.floor(targetAttack * 0.5);
            if (targetItem === 'choice band') targetAttack = pokeRound(of32(targetAttack * 6144) / 4096);

            const restored = applyBigRoot(targetAttack, attacker, field);
            const liquidOoze = targetAbility === 'liquidooze';
            const hpChange = liquidOoze
                ? -Math.min(attackerHp, restored)
                : Math.min(Math.max(0, attackerMaxHp - attackerHp), restored);
            res.effectKind = liquidOoze ? 'hp_loss' : 'healing';
            res.healMin = hpChange;
            res.healMax = hpChange;
            res.healPercentMin = (hpChange * 100 / attackerMaxHp).toFixed(1);
            res.healPercentMax = res.healPercentMin;
            res.hpAfter = attackerHp + hpChange;
            const blocksAttackDrop = targetAbility === 'clearbody'
                || targetAbility === 'hypercutter'
                || targetAbility === 'whitesmoke'
                || targetAbility === 'fullmetalbody';
            res.targetAttackChange = targetAbility === 'contrary' ? 1 : (blocksAttackDrop ? 0 : -1);
            res.bigRootBoosted = itemsActiveFor(attacker, field) && (attacker.item || '').toLowerCase() === 'big root';
            res.rolls = [];
            return res;
        }

        return null;
    }

    function calculateDamage(attacker, defender, move, field) {
        const res = { move: move.name, attackerId: attacker.id, minPercent: 0, maxPercent: 0, rolls: [0] };

        const moveRecord = MoveIndex.get(move.name);
        const level = attacker.level;
        const category = normalizeMoveCategory(move.category || moveRecord?.category);
        const isSpecial = category === 'Special';
        const mechanicMoveKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetsPhysicalDefense = mechanicMoveKey === 'psyshock'
            || mechanicMoveKey === 'psystrike'
            || mechanicMoveKey === 'secretsword';
        const specialEffect = calculateSpecialEffect(attacker, defender, move, moveRecord, field, res);
        if (specialEffect) return specialEffect;

        let atkBoost = isSpecial ? attacker.boosts.spa : attacker.boosts.atk;
        const usesDefense = !isSpecial || targetsPhysicalDefense;
        const defStatKey = field.wonderRoom
            ? (usesDefense ? 'spd' : 'def')
            : (usesDefense ? 'def' : 'spd');
        let defBoost = defender.boosts[defStatKey];

        const alwaysCrit = MoveIndex.isAlwaysCrit(move);
        const isCrit = !!(move.crit || alwaysCrit);
        const ignoresDefBoosts = MoveIndex.ignoresDefenseBoosts(move);

        // Darkest Lariat / Kowtow Cleave / Sacred Sword: use unmodified Def/SpD stages
        if (ignoresDefBoosts) {
            defBoost = 0;
        }

        if (isCrit) {
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
        // Body Press uses user's Defense (with Def stages) as the offensive stat
        if (variablePower === 'body_press' || (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'bodypress') {
            rawAtk = attacker.stats.def;
            atkBoost = attacker.boosts.def;
            rawAtk = applyParadoxBoost(attacker, rawAtk, 'def', field, attackerSide);
        }

        if (field.weather === 'Snow' && (defender.type1 === 'Ice' || defender.type2 === 'Ice' || (defender.tera && defender.teraType === 'Ice')) && !isSpecial) {
            rawDef = Math.floor(rawDef * 1.5);
        }
        if (field.weather === 'Sand' && (defender.type1 === 'Rock' || defender.type2 === 'Rock' || (defender.tera && defender.teraType === 'Rock')) && isSpecial) {
            rawDef = Math.floor(rawDef * 1.5);
        }

        const atkAb = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const defAb = (defender.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const breaksAbility = atkAb === 'moldbreaker' || atkAb === 'teravolt' || atkAb === 'turboblaze';

        if (atkAb === 'hugepower' || atkAb === 'purepower') {
            if (!isSpecial) rawAtk *= 2;
        }
        if (atkAb === 'guts' && attacker.status !== 'Healthy') {
            if (!isSpecial) rawAtk = Math.floor(rawAtk * 1.5);
        }
        if (atkAb === 'hustle' && !isSpecial) {
            rawAtk = Math.floor(rawAtk * 1.5);
        }
        if (atkAb === 'slowstart') {
            if (!isSpecial) rawAtk = Math.floor(rawAtk * 0.5);
        }
        // Defensive ability stat mods (pre-boost)
        if (!breaksAbility) {
            if (defAb === 'furcoat' && !isSpecial) rawDef = Math.floor(rawDef * 2);
            if (defAb === 'marvelscale' && defender.status !== 'Healthy' && !isSpecial) {
                rawDef = Math.floor(rawDef * 1.5);
            }
            if (defAb === 'icescales' && isSpecial) rawDef = Math.floor(rawDef * 2);
        }

        const itemsActive = itemsActiveFor(attacker, field);
        const defItemsActive = itemsActiveFor(defender, field);
        const item = itemsActive ? (attacker.item || '').toLowerCase() : '';
        const defenderItem = defItemsActive ? (defender.item || '').toLowerCase() : '';
        if (item === 'choice band' && !isSpecial) rawAtk = pokeRound(of32(rawAtk * 6144) / 4096);
        if (item === 'choice specs' && isSpecial) rawAtk = pokeRound(of32(rawAtk * 6144) / 4096);
        // Eviolite: 1.5× Def/SpD when held (NFE data unavailable — honor the item when equipped)
        if (defenderItem === 'eviolite') rawDef = Math.floor(rawDef * 1.5);
        if (attackerSide.battery && isSpecial) rawAtk = Math.floor(rawAtk * 1.3);
        if (attackerSide.powerSpot) rawAtk = Math.floor(rawAtk * 1.3);

        const typeItem = itemsActive ? item : '';
        const typeResult = resolveMoveType(attacker, move, moveRecord, typeItem, field);
        let moveType = typeResult.moveType;
        let abilityBoost = typeResult.abilityBoost;

        let basePower = resolveBasePower(attacker, defender, move, moveRecord, field);
        if (typeResult.basePower !== move.basePower) basePower = typeResult.basePower;
        // Variable-power moves are stored with null/0 catalog power. Resolve them
        // before deciding that a move is non-damaging.
        if (!Number.isFinite(basePower) || basePower <= 0) return res;
        basePower = applyTeraBpFloor(attacker, move, moveType, basePower);

        // BP modifiers (Showdown order): -ate abilities, Helping Hand, terrain,
        // then type-boosting items (Fairy Feather, plates, etc.) — NOT final mods.
        const bpMods = [];
        if (abilityBoost && abilityBoost !== 1) {
            bpMods.push(Math.round(abilityBoost * 4096));
        }
        if (attackerSide.helpingHand) bpMods.push(6144);
        // Supreme Overlord: BP × (1.0–1.5) from fainted allies (capped at 5)
        if (atkAb === 'supremeoverlord') {
            const fallen = Math.min(5, Math.max(0, parseInt(attacker.alliesFainted, 10) || 0));
            if (fallen > 0) {
                const powMod = [4096, 4506, 4915, 5325, 5734, 6144];
                bpMods.push(powMod[fallen]);
            }
        }
        // Flash Fire (activated): 1.5× Fire moves
        if (atkAb === 'flashfire' && attacker.abilityActive && moveType === 'Fire') {
            bpMods.push(6144);
        }
        // Electromorphosis (charged): 2× Electric moves (Charge effect)
        if (atkAb === 'electromorphosis' && attacker.abilityActive && moveType === 'Electric') {
            bpMods.push(8192);
        }
        // Offensive ability BP mods
        if (atkAb === 'technician' && basePower <= 60) bpMods.push(6144);
        if (atkAb === 'toughclaws' && MoveIndex.isContact(move)) bpMods.push(5325);
        if (atkAb === 'ironfist' && MoveIndex.isPunching(move)) bpMods.push(4915);
        if (atkAb === 'strongjaw' && MoveIndex.isBiting(move)) bpMods.push(6144);
        if (atkAb === 'sharpness' && MoveIndex.isSlicing(move)) bpMods.push(6144);
        if (atkAb === 'megalauncher' && MoveIndex.isPulse(move)) bpMods.push(6144);
        {
            const mk = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const recklessMoves = new Set(['takedown', 'doubleedge', 'submission', 'struggle', 'volttackle', 'flareblitz', 'bravebird', 'woodhammer', 'headsmash', 'wildcharge', 'headcharge', 'lightofruin', 'wavecrash', 'chloroblast', 'jumpkick', 'highjumpkick', 'axekick']);
            if (atkAb === 'reckless' && recklessMoves.has(mk)) bpMods.push(4915);
            const sheerForceCommon = new Set(['ironhead', 'playrough', 'crunch', 'scald', 'flamethrower', 'thunderbolt', 'icebeam', 'earthpower', 'darkpulse', 'shadowball', 'sludgebomb', 'dragonpulse', 'airslash', 'rockslide', 'waterfall', 'poisonjab', 'zenheadbutt', 'firepunch', 'thunderpunch', 'icepunch']);
            if (atkAb === 'sheerforce' && sheerForceCommon.has(mk)) bpMods.push(5325);
        }
        if (atkAb === 'steelyspirit' || attackerSide.steelySpirit) {
            if (moveType === 'Steel') bpMods.push(6144);
        }
        if (atkAb === 'waterbubble' && moveType === 'Water') bpMods.push(8192);
        if (atkAb === 'dragonsmaw' && moveType === 'Dragon') bpMods.push(6144);
        if (atkAb === 'transistor' && moveType === 'Electric') bpMods.push(5325);
        if (atkAb === 'rockypayload' && moveType === 'Rock') bpMods.push(6144);

        if (BC.getTerrainModifier) {
            const grounded = typeof BC.isGrounded === 'function' ? BC.isGrounded(attacker, field) : true;
            const terrainMult = grounded ? BC.getTerrainModifier(moveType, field) : 1;
            if (terrainMult === 1.3) bpMods.push(5325);
            else if (terrainMult === 0.5) bpMods.push(2048);
            else if (terrainMult !== 1) bpMods.push(Math.round(terrainMult * 4096));
        }
        // Expanding Force becomes spread on Psychic Terrain
        const moveKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const expandingForceSpread = moveKey === 'expandingforce'
            && field.terrain === 'Psychic'
            && (typeof BC.isGrounded !== 'function' || BC.isGrounded(attacker, field));

        const typeItemList = TYPE_ITEMS[moveType.toLowerCase()];
        if (typeItemList && typeItemList.includes(item)) {
            bpMods.push(4915);
        }
        if (item === 'muscle band' && !isSpecial) bpMods.push(4505);
        if (item === 'wise glasses' && isSpecial) bpMods.push(4505);
        if (bpMods.length) {
            basePower = of16(Math.max(1, pokeRound((basePower * chainMods(bpMods, 41, 2097152)) / 4096)));
        }

        // Water Bubble BP path already applied 2× above — no extra rawAtk double-dip.

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
        if (field.format === 'Doubles' && (MoveIndex.isSpread(move.name) || expandingForceSpread)) {
            baseDamage = pokeRound(of32(baseDamage * 3072) / 4096);
        }

        if (weather.isSun) {
            if (moveType === 'Fire') baseDamage = pokeRound(of32(baseDamage * 6144) / 4096);
            if (moveType === 'Water') baseDamage = pokeRound(of32(baseDamage * 2048) / 4096);
        } else if (weather.isRain) {
            if (moveType === 'Water') baseDamage = pokeRound(of32(baseDamage * 6144) / 4096);
            if (moveType === 'Fire') baseDamage = pokeRound(of32(baseDamage * 2048) / 4096);
        }

        if (isCrit) {
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

        if (!breaksAbility) {
            if (typeMod > 1 && (defAb === 'filter' || defAb === 'solidrock' || defAb === 'prismarmor')) {
                finalMods.push(3072);
            }
            if ((defender.hpPercent ?? 100) >= 100 && (defAb === 'multiscale' || defAb === 'shadowshield')) {
                finalMods.push(2048);
            }
            if (defAb === 'fluffy' && MoveIndex.isContact(move)) finalMods.push(2048);
            if (defAb === 'fluffy' && moveType === 'Fire') finalMods.push(8192);
            if (defAb === 'punkrock' && MoveIndex.isSound(move)) finalMods.push(2048);
            if ((defAb === 'thickfat' || defAb === 'heatproof') && (moveType === 'Fire' || (defAb === 'thickfat' && moveType === 'Ice'))) {
                if (defAb === 'thickfat') finalMods.push(2048);
                if (defAb === 'heatproof' && moveType === 'Fire') finalMods.push(2048);
            }
            if (defAb === 'waterbubble' && moveType === 'Fire') finalMods.push(2048);
            if (defAb === 'dryskin' && moveType === 'Fire') finalMods.push(5120);
            if (defSide.friendGuard) finalMods.push(3072);
        }
        if (atkAb === 'neuroforce' && typeMod > 1) finalMods.push(5120);
        if (atkAb === 'punkrock' && MoveIndex.isSound(move)) finalMods.push(5325);
        if (atkAb === 'sniper' && isCrit) finalMods.push(6144);

        if (!isCrit && atkAb !== 'infiltrator') {
            if (isSpecial && (defSide.lightScreen || defSide.auroraVeil)) {
                finalMods.push(field.format === 'Doubles' ? 2732 : 2048);
            }
            if (!isSpecial && (defSide.reflect || defSide.auroraVeil)) {
                finalMods.push(field.format === 'Doubles' ? 2732 : 2048);
            }
        }

        if (item === 'life orb') finalMods.push(5324);
        if (item === 'expert belt' && typeMod > 1) finalMods.push(4915);

        // Type-resist berries (halve SE damage of matching type; Chilan = any Normal)
        if (defItemsActive && defenderItem && RESIST_BERRIES[defenderItem]) {
            const berryType = RESIST_BERRIES[defenderItem];
            if (defenderItem === 'chilan berry') {
                if (moveType === 'Normal') finalMods.push(2048);
            } else if (typeMod > 1 && moveType === berryType) {
                finalMods.push(2048);
            }
        }

        const finalMod = chainMods(finalMods);
        const applyBurn = attacker.status === 'Burned' && !isSpecial && atkAb !== 'guts';

        let rolls = [];
        for (let i = 0; i < 16; i++) {
            rolls.push(getFinalDamage(baseDamage, i, typeMod, applyBurn, stabMod, finalMod));
        }

        // Parental Bond: second hit at 25% (Gen 7+). Skip multi-hit / status moves.
        const multiInfo = MoveIndex.getMultiHitInfo(move.name);
        if (atkAb === 'parentalbond' && category !== 'Status' && !multiInfo) {
            rolls = rolls.map(r => r + Math.floor(r * 0.25));
        }

        const hitCount = BC.resolveHitCount(move, attacker);
        if (hitCount > 1) {
            rolls = BC.combineMultiHitRolls(rolls, hitCount);
        }

        // Protect / Detect interactions
        if (defSide.protect) {
            const isContact = MoveIndex.isContact(move);
            if (atkAb === 'unseenfist' && isContact) {
                // Full damage through Protect on contact moves
            } else if (atkAb === 'piercingdrill' && isContact) {
                // 1/4 damage through Protect on contact moves
                rolls = rolls.map(r => Math.floor(r / 4));
            } else {
                rolls = rolls.map(() => 0);
            }
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
        res.hitCount = hitCount > 1 ? hitCount : (atkAb === 'parentalbond' && category !== 'Status' && !multiInfo ? 2 : 1);

        const drainRatio = DRAIN_RATIOS[mechanicMoveKey];
        if (drainRatio && rolls.some(r => r > 0)) {
            const attackerMaxHp = attacker.stats.hp || 1;
            const attackerHp = getCurrentHp(attacker, field);
            const missingHp = Math.max(0, attackerMaxHp - attackerHp);
            const defenderHp = getCurrentHp(defender, field);
            const liquidOoze = defAb === 'liquidooze' && !breaksAbility;
            const healingRolls = rolls.map(damage => {
                const actualDamage = Math.min(damage, defenderHp);
                const baseHealing = actualDamage > 0 ? Math.max(1, Math.round(actualDamage * drainRatio)) : 0;
                const restored = applyBigRoot(baseHealing, attacker, field);
                return liquidOoze ? -Math.min(attackerHp, restored) : Math.min(missingHp, restored);
            });
            res.effectKind = liquidOoze ? 'damage_and_hp_loss' : 'damage_and_healing';
            res.healMin = Math.min(...healingRolls);
            res.healMax = Math.max(...healingRolls);
            res.healPercentMin = (res.healMin * 100 / attackerMaxHp).toFixed(1);
            res.healPercentMax = (res.healMax * 100 / attackerMaxHp).toFixed(1);
            res.bigRootBoosted = itemsActiveFor(attacker, field) && (attacker.item || '').toLowerCase() === 'big root';
        }
        return res;
    }

    BC.calculateDamage = calculateDamage;
    BC.itemsActiveFor = itemsActiveFor;
    BC.RESIST_BERRIES = RESIST_BERRIES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
