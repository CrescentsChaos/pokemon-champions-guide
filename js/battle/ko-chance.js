/**
 * Multi-hit resolution and KO probability helpers.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};
    const MoveIndex = BC.MoveIndex;

    function getMoveMultiHitInfo(moveName) {
        return MoveIndex.getMultiHitInfo(moveName);
    }

    function isMultiHitMove(moveName) {
        return getMoveMultiHitInfo(moveName) !== null;
    }

    function getDefaultHitCount(moveName, attacker) {
        const info = getMoveMultiHitInfo(moveName);
        if (!info) return 1;
        if (attacker?.ability === 'Skill Link') return info.max;
        if (info.variable) return Math.min(4, info.max);
        return info.min;
    }

    function combineMultiHitRolls(singleHitRolls, hitCount) {
        if (!hitCount || hitCount <= 1) return singleHitRolls.slice();
        return singleHitRolls.map(roll => roll * hitCount);
    }

    function resolveHitCount(move, attacker) {
        const info = getMoveMultiHitInfo(move.name);
        if (!info) return 1;
        if (move.hits && move.hits >= info.min && move.hits <= info.max) return move.hits;
        return getDefaultHitCount(move.name, attacker);
    }

    function getKOChance(rolls, hp) {
        if (rolls.length === 0) return 'No data';

        const ohkoCount = rolls.filter(r => r >= hp).length;
        if (ohkoCount > 0) {
            const prob = (ohkoCount / rolls.length * 100).toFixed(1);
            return (prob === '100.0' || prob === '100') ? 'Guaranteed OHKO' : `${prob}% chance to OHKO`;
        }

        let twoHKOCount = 0;
        for (let i = 0; i < rolls.length; i++) {
            for (let j = 0; j < rolls.length; j++) {
                if (rolls[i] + rolls[j] >= hp) twoHKOCount++;
            }
        }
        const total2 = rolls.length * rolls.length;
        if (twoHKOCount > 0) {
            const prob = (twoHKOCount / total2 * 100).toFixed(1);
            return (prob === '100.0' || prob === '100') ? 'Guaranteed 2HKO' : `${prob}% chance to 2HKO`;
        }

        let threeHKOCount = 0;
        for (let i = 0; i < rolls.length; i++) {
            for (let j = 0; j < rolls.length; j++) {
                for (let k = 0; k < rolls.length; k++) {
                    if (rolls[i] + rolls[j] + rolls[k] >= hp) threeHKOCount++;
                }
            }
        }
        const total3 = Math.pow(rolls.length, 3);
        if (threeHKOCount > 0) {
            const prob = (threeHKOCount / total3 * 100).toFixed(1);
            return (prob === '100.0' || prob === '100') ? 'Guaranteed 3HKO' : `${prob}% chance to 3HKO`;
        }

        return 'No immediate KO';
    }

    function findBestDamage(attacker, defender, field) {
        let best = null;
        attacker.moves.forEach(move => {
            if (!move || move.name === 'None') return;
            const res = BC.calculateDamage(attacker, defender, move, field);
            const maxPct = parseFloat(res.maxPercent);
            if (maxPct <= 0) return;
            if (!best || maxPct > parseFloat(best.maxPercent)) {
                const effHp = BC.getEffectiveDefenderHp
                    ? BC.getEffectiveDefenderHp(defender, field)
                    : Math.floor(defender.stats.hp * ((defender.hpPercent ?? 100) / 100));
                best = {
                    move: move.name,
                    minPercent: res.minPercent,
                    maxPercent: res.maxPercent,
                    rolls: res.rolls,
                    koLabel: getKOChance(res.rolls, effHp)
                };
            }
        });
        return best;
    }

    function isStrongAnswer(koLabel) {
        if (!koLabel) return false;
        return koLabel.includes('OHKO') || koLabel.includes('2HKO');
    }

    BC.getMoveMultiHitInfo = getMoveMultiHitInfo;
    BC.isMultiHitMove = isMultiHitMove;
    BC.getDefaultHitCount = getDefaultHitCount;
    BC.combineMultiHitRolls = combineMultiHitRolls;
    BC.resolveHitCount = resolveHitCount;
    BC.getKOChance = getKOChance;
    BC.findBestDamage = findBestDamage;
    BC.isStrongAnswer = isStrongAnswer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
