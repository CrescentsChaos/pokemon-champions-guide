/**
 * Pokemon battle state setup and field defaults.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};
    const MoveIndex = BC.MoveIndex;

    function setupPokemonState(id) {
        return {
            id,
            name: '', baseStats: {}, stats: {},
            level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            nature: 'Hardy', ability: 'None', item: 'None', status: 'Healthy',
            type1: 'None', type2: 'None', tera: false, teraType: 'Normal',
            moves: Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false })),
            hpPercent: 100
        };
    }

    function getDefaultField(format = 'Singles') {
        return {
            format,
            weather: 'None',
            terrain: 'None',
            gravity: false,
            magicRoom: false,
            wonderRoom: false,
            side1: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false },
            side2: { reflect: false, lightScreen: false, auroraVeil: false, spikes: 0, stealthRock: false, protect: false, helpingHand: false, protosynthesis: false, quarkDrive: false }
        };
    }

    function buildCalcStateFromSlot(slot, id, db, movesDb) {
        const pk = setupPokemonState(id);
        if (!db || !slot) return pk;
        pk.name = db.Name;
        pk.type1 = db.Type_1;
        pk.type2 = db.Type_2 || 'None';
        pk.baseStats = {
            hp: parseInt(db.HP) || 0,
            atk: parseInt(db.Attack) || 0,
            def: parseInt(db.Defense) || 0,
            spa: parseInt(db['Sp.Atk']) || 0,
            spd: parseInt(db['Sp.Def']) || 0,
            spe: parseInt(db.Speed) || 0,
            weight: parseFloat(db['Weight{kg}']) || 10.0
        };
        pk.level = slot.level || 50;
        pk.ivs = { ...(slot.ivs || pk.ivs) };
        pk.evs = { ...(slot.evs || pk.evs) };
        pk.nature = slot.nature || 'Serious';
        pk.ability = slot.ability || (Array.isArray(db.Ability) ? db.Ability[0] : db.Ability) || 'None';
        pk.item = slot.item || 'None';
        pk.tera = false;
        pk.teraType = slot.tera || 'Normal';
        pk.hpPercent = 100;
        ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(k => {
            pk.stats[k] = calculateStat(pk.baseStats[k], pk.ivs[k], pk.evs[k], pk.level, pk.nature, k);
        });
        pk.moves = Array(4).fill().map(() => ({ name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false }));
        (slot.moves || []).filter(m => m).forEach((moveName, idx) => {
            if (idx >= 4) return;
            const rec = MoveIndex.findInArray(movesDb, moveName);
            if (rec) {
                pk.moves[idx] = MoveIndex.createMoveState(rec.name, {
                    basePower: rec.power,
                    type: rec.type,
                    category: rec.category
                });
            }
        });
        return pk;
    }

    function initMoveIndex(movesArray) {
        MoveIndex.init(movesArray);
    }

    BC.setupPokemonState = setupPokemonState;
    BC.getDefaultField = getDefaultField;
    BC.buildCalcStateFromSlot = buildCalcStateFromSlot;
    BC.initMoveIndex = initMoveIndex;
})(typeof globalThis !== 'undefined' ? globalThis : this);
