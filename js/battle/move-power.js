/**
 * Dynamic base power and move type resolution from moves.json metadata.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};
    const MoveIndex = BC.MoveIndex;

    const PLATE_TYPES = {
        flame: 'Fire', splash: 'Water', zap: 'Electric', meadow: 'Grass',
        icicle: 'Ice', fist: 'Fighting', toxic: 'Poison', earth: 'Ground',
        sky: 'Flying', psychic: 'Psychic', insect: 'Bug', stone: 'Rock',
        spooky: 'Ghost', draco: 'Dragon', dread: 'Dark', iron: 'Steel', pixie: 'Fairy'
    };

    function weatherFlags(field, attacker) {
        return {
            isSun: field.weather === 'Sun' || field.weather === 'Harsh Sun' || attacker.ability === 'Mega Sol' || attacker.ability === 'Desolate Land',
            isRain: field.weather === 'Rain' || field.weather === 'Heavy Rain' || attacker.ability === 'Primordial Sea',
            isSand: field.weather === 'Sand',
            isSnow: field.weather === 'Snow' || field.weather === 'Hail'
        };
    }

    function resolveMoveType(attacker, move, moveRecord, item, field) {
        let moveType = move.type;
        let basePower = move.basePower;
        let abilityBoost = 1.0;
        const dynamicType = moveRecord?.battle?.dynamicType || MoveIndex.getDynamicType(move.name);

        if (dynamicType === 'tera_blast' && attacker.tera) {
            if (attacker.teraType === 'Stellar') {
                moveType = 'Stellar';
                basePower = 100;
            } else {
                moveType = attacker.teraType;
            }
        }

        if (dynamicType === 'weather_ball') {
            const w = weatherFlags(field || { weather: 'None' }, attacker);
            if (w.isSun) { moveType = 'Fire'; basePower = 100; }
            else if (w.isRain) { moveType = 'Water'; basePower = 100; }
            else if (w.isSand) { moveType = 'Rock'; basePower = 100; }
            else if (w.isSnow) { moveType = 'Ice'; basePower = 100; }
        }

        if (dynamicType === 'techno_blast' || dynamicType === 'multi_attack') {
            if (item.includes('shock') || item.includes('electric')) moveType = 'Electric';
            if (item.includes('burn') || item.includes('fire')) moveType = 'Fire';
            if (item.includes('chill') || item.includes('ice')) moveType = 'Ice';
            if (item.includes('douse') || item.includes('water')) moveType = 'Water';
        }

        if (dynamicType === 'judgment' && item.includes('plate')) {
            const pType = Object.keys(PLATE_TYPES).find(k => item.startsWith(k));
            if (pType) moveType = PLATE_TYPES[pType];
        }

        if (dynamicType === 'ivy_cudgel') {
            if (item === 'wellspring mask') moveType = 'Water';
            else if (item === 'hearthflame mask') moveType = 'Fire';
            else if (item === 'cornerstone mask') moveType = 'Rock';
        }

        if (moveType === 'Normal' || (moveType || '').toLowerCase() === 'normal') {
            const ab = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (ab === 'pixilate') { moveType = 'Fairy'; abilityBoost = 1.2; }
            else if (ab === 'aerilate') { moveType = 'Flying'; abilityBoost = 1.2; }
            else if (ab === 'refrigerate') { moveType = 'Ice'; abilityBoost = 1.2; }
            else if (ab === 'galvanize') { moveType = 'Electric'; abilityBoost = 1.2; }
            else if (ab === 'dragonize') { moveType = 'Dragon'; abilityBoost = 1.2; }
        }

        // If the UI already shows the -ate result type (e.g. Fairy) but the catalog
        // move is Normal, still apply the 1.2× BP boost so damage matches Showdown.
        const catalogType = (moveRecord?.type || move.type || '').toLowerCase();
        if (abilityBoost === 1 && catalogType === 'normal') {
            const ab = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const ateMap = {
                pixilate: 'Fairy', aerilate: 'Flying', refrigerate: 'Ice',
                galvanize: 'Electric', dragonize: 'Dragon'
            };
            const ateType = ateMap[ab];
            if (ateType && (moveType === ateType || (moveType || '').toLowerCase() === ateType.toLowerCase())) {
                moveType = ateType;
                abilityBoost = 1.2;
            }
        }

        const abKey = (attacker.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (abKey === 'liquidvoice' && MoveIndex.isSound(move.name)) {
            moveType = 'Water';
        }
        if (abKey === 'normalize') {
            moveType = 'Normal';
        }

        return { moveType, basePower, abilityBoost };
    }

    function resolveBasePower(attacker, defender, move, moveRecord, field) {
        let basePower = move.basePower;
        const variablePower = moveRecord?.battle?.variablePower || MoveIndex.getVariablePower(move.name);

        if (variablePower === 'status_user' && attacker.status !== 'Healthy') basePower = 140;
        if (variablePower === 'status_target' && defender.status !== 'Healthy') basePower = 130;

        if (variablePower === 'hp_ratio') {
            const hpRatio = attacker.hpPercent / 100;
            basePower = Math.max(1, Math.floor(150 * hpRatio));
        }

        if (variablePower === 'low_hp') {
            const hpRatio = attacker.hpPercent / 100;
            if (hpRatio <= 0.0417) basePower = 200;
            else if (hpRatio <= 0.1042) basePower = 150;
            else if (hpRatio <= 0.2083) basePower = 100;
            else if (hpRatio <= 0.3542) basePower = 80;
            else if (hpRatio <= 0.6875) basePower = 40;
            else basePower = 20;
        }

        if (variablePower === 'weight_ratio') {
            const atkWeight = attacker.baseStats?.weight || 10.0;
            const defWeight = defender.baseStats?.weight || 10.0;
            const ratio = atkWeight / defWeight;
            if (ratio >= 5) basePower = 120;
            else if (ratio >= 4) basePower = 100;
            else if (ratio >= 3) basePower = 80;
            else if (ratio >= 2) basePower = 60;
            else basePower = 40;
        }

        if (variablePower === 'defender_weight') {
            const defWeight = defender.baseStats?.weight || 10.0;
            if (defWeight >= 200.0) basePower = 120;
            else if (defWeight >= 100.0) basePower = 100;
            else if (defWeight >= 50.0) basePower = 80;
            else if (defWeight >= 25.0) basePower = 60;
            else if (defWeight >= 10.0) basePower = 40;
            else basePower = 20;
        }

        if (variablePower === 'positive_boosts') {
            let positiveBoosts = 0;
            for (const k in attacker.boosts) {
                if (attacker.boosts[k] > 0) positiveBoosts += attacker.boosts[k];
            }
            basePower = 20 + (20 * positiveBoosts);
        }

        // Last Respects: 50 × (1 + fainted allies on user's side)
        const moveKey = (move.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (variablePower === 'fallen_allies' || moveKey === 'lastrespects') {
            const fallen = Math.max(0, Math.min(100, parseInt(attacker.alliesFainted, 10) || 0));
            basePower = 50 * (1 + fallen);
        }

        if (attacker.hpPercent <= 33.33) {
            const typeResolved = resolveMoveType(attacker, move, moveRecord, (attacker.item || '').toLowerCase(), field);
            const moveType = typeResolved.moveType;
            if (attacker.ability === 'Overgrow' && moveType === 'Grass') basePower = Math.floor(basePower * 1.5);
            if (attacker.ability === 'Blaze' && moveType === 'Fire') basePower = Math.floor(basePower * 1.5);
            if (attacker.ability === 'Torrent' && moveType === 'Water') basePower = Math.floor(basePower * 1.5);
            if (attacker.ability === 'Swarm' && moveType === 'Bug') basePower = Math.floor(basePower * 1.5);
        }

        return basePower;
    }

    function applyTeraBpFloor(attacker, move, moveType, basePower) {
        if (attacker.tera && moveType === attacker.teraType && basePower < 60 && basePower > 0 && attacker.teraType !== 'Stellar') {
            if (!MoveIndex.isPriority(move.name) && !move.hits && !MoveIndex.getMultiHitInfo(move.name)) {
                return 60;
            }
        }
        return basePower;
    }

    BC.resolveMoveType = resolveMoveType;
    BC.resolveBasePower = resolveBasePower;
    BC.applyTeraBpFloor = applyTeraBpFloor;
    BC.weatherFlags = weatherFlags;
})(typeof globalThis !== 'undefined' ? globalThis : this);
