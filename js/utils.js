/**
 * Shared utility functions for Pokemon Champions Guide
 */

/**
 * Safely extracts abilities from a pokemon.json database entry.
 * Handles both the new 'Ability' array and old 'Ability_1', 'Ability_2', 'Ability_Hidden' fields.
 * @param {Object} db - The database entry for the Pokémon
 * @returns {string[]} An array of ability names
 */
function getPokemonAbilities(db) {
    if (!db) return ['None'];
    
    let abilities = [];
    
    // Check for the new 'Ability' field (array)
    if (db.Ability && Array.isArray(db.Ability)) {
        abilities = [...db.Ability];
    } else if (typeof db.Ability === 'string' && db.Ability) {
        abilities = [db.Ability];
    }
    
    // Check for legacy fields if no abilities found yet
    if (abilities.length === 0) {
        const legacy = [db.Ability_1, db.Ability_2, db.Ability_Hidden].filter(a => a && a !== '' && a !== 'None');
        if (legacy.length > 0) abilities = legacy;
    }
    
    // Fallback
    return abilities.length > 0 ? abilities : ['None'];
}

/**
 * Calculates a specific stat based on base, IV, EV, level, and nature.
 * @param {number} base - Base stat
 * @param {number} iv - IV value (0-31)
 * @param {number} ev - EV value (0-252)
 * @param {number} level - Level (1-100)
 * @param {string} natureType - Nature name
 * @param {string} statKey - Stat identifier ('hp', 'atk', etc.)
 * @returns {number} The calculated stat
 */
function calculateStat(base, iv, ev, level, natureType, statKey, championsMode = false) {
    const lvl = parseInt(level) || 50;
    const ivVal = parseInt(iv || 31);
    const evBonus = championsMode ? 0 : Math.floor(parseInt(ev || 0) / 4);

    if (statKey === 'hp') {
        if (parseInt(base) === 1) return 1; // Shedinja
        let val = Math.floor(((2 * parseInt(base) + ivVal + evBonus) * lvl) / 100) + lvl + 10;
        if (championsMode) val += parseInt(ev || 0);
        return val;
    }

    let val = Math.floor(((2 * parseInt(base) + ivVal + evBonus) * lvl) / 100) + 5;
    if (championsMode) val += parseInt(ev || 0);
    
    // Constant nature map to avoid dependency on global
    const natureMap = {
        'Adamant': { pos: 'atk', neg: 'spa' },
        'Bold': { pos: 'def', neg: 'atk' },
        'Brave': { pos: 'atk', neg: 'spe' },
        'Calm': { pos: 'spd', neg: 'atk' },
        'Careful': { pos: 'spd', neg: 'spa' },
        'Gentle': { pos: 'spd', neg: 'def' },
        'Hasty': { pos: 'spe', neg: 'def' },
        'Impish': { pos: 'def', neg: 'spa' },
        'Jolly': { pos: 'spe', neg: 'spa' },
        'Lax': { pos: 'def', neg: 'spd' },
        'Lonely': { pos: 'atk', neg: 'def' },
        'Mild': { pos: 'spa', neg: 'def' },
        'Modest': { pos: 'spa', neg: 'atk' },
        'Naive': { pos: 'spe', neg: 'spd' },
        'Naughty': { pos: 'atk', neg: 'spd' },
        'Quiet': { pos: 'spa', neg: 'spe' },
        'Rash': { pos: 'spa', neg: 'spd' },
        'Relaxed': { pos: 'def', neg: 'spe' },
        'Sassy': { pos: 'spd', neg: 'spe' },
        'Timid': { pos: 'spe', neg: 'atk' }
    };
    
    const nature = natureMap[natureType];
    if (nature) {
        if (nature.pos === statKey) val = Math.floor(val * 1.1);
        if (nature.neg === statKey) val = Math.floor(val * 0.9);
    }
    return val;
}

const EV_STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const CHAMPIONS_EV_TOTAL = 66;
const CHAMPIONS_EV_MAX_STAT = 32;
const STANDARD_EV_TOTAL = 508;
const STANDARD_EV_MAX_STAT = 252;

/**
 * Normalizes Champions EVs to exactly 66 total (or less if capped).
 * Remainder is filled into the lowest non-zero EV first (keeps dumps on invested stats).
 * Falls back to zero stats only when no invested stat has room left.
 */
function normalizeChampionsEvs(evs, targetTotal = CHAMPIONS_EV_TOTAL, maxPerStat = CHAMPIONS_EV_MAX_STAT) {
    const result = {};
    EV_STAT_KEYS.forEach(k => {
        result[k] = Math.max(0, Math.min(maxPerStat, parseInt(evs?.[k], 10) || 0));
    });

    let total = EV_STAT_KEYS.reduce((sum, k) => sum + result[k], 0);

    if (total > targetTotal) {
        let excess = total - targetTotal;
        ['spe', 'spd', 'spa', 'def', 'atk', 'hp'].forEach(k => {
            if (excess <= 0) return;
            const sub = Math.min(result[k], excess);
            result[k] -= sub;
            excess -= sub;
        });
        return result;
    }

    let remainder = targetTotal - total;
    while (remainder > 0) {
        let lowestKey = null;
        let lowestVal = Infinity;

        // Prefer lowest non-zero invested stats that still have room
        EV_STAT_KEYS.forEach(k => {
            if (result[k] > 0 && result[k] < maxPerStat && result[k] < lowestVal) {
                lowestVal = result[k];
                lowestKey = k;
            }
        });

        // Fallback: no invested room left (or empty spread) → use lowest under-cap stat
        if (!lowestKey) {
            lowestVal = Infinity;
            EV_STAT_KEYS.forEach(k => {
                if (result[k] < maxPerStat && result[k] < lowestVal) {
                    lowestVal = result[k];
                    lowestKey = k;
                }
            });
        }

        if (!lowestKey) break;
        const add = Math.min(remainder, maxPerStat - result[lowestKey]);
        result[lowestKey] += add;
        remainder -= add;
    }

    return result;
}

/**
 * Converts standard (Smogon) EVs to Champions EVs with full 66-point allocation.
 */
function convertEvsToChampions(evs) {
    const converted = {};
    EV_STAT_KEYS.forEach(k => {
        converted[k] = Math.min(CHAMPIONS_EV_MAX_STAT, Math.round((parseInt(evs?.[k], 10) || 0) / 8));
    });
    return normalizeChampionsEvs(converted);
}

/**
 * Converts Champions EVs back to standard Smogon EVs.
 */
function convertEvsFromChampions(evs) {
    const converted = {};
    EV_STAT_KEYS.forEach(k => {
        converted[k] = Math.min(STANDARD_EV_MAX_STAT, (parseInt(evs?.[k], 10) || 0) * 8);
    });

    let total = EV_STAT_KEYS.reduce((sum, k) => sum + converted[k], 0);
    if (total > STANDARD_EV_TOTAL) {
        let excess = total - STANDARD_EV_TOTAL;
        ['spe', 'spd', 'spa', 'def', 'atk', 'hp'].forEach(k => {
            if (excess <= 0) return;
            const sub = Math.min(converted[k], excess);
            converted[k] -= sub;
            excess -= sub;
        });
    }
    return converted;
}

/**
 * Clamps EVs to format limits; in Champions mode ensures 66 total via remainder fill.
 */
function clampEvsForMode(evs, championsMode = false) {
    if (championsMode) {
        return normalizeChampionsEvs(evs);
    }

    const result = {};
    EV_STAT_KEYS.forEach(k => {
        result[k] = Math.max(0, Math.min(STANDARD_EV_MAX_STAT, parseInt(evs?.[k], 10) || 0));
    });

    let total = EV_STAT_KEYS.reduce((sum, k) => sum + result[k], 0);
    if (total > STANDARD_EV_TOTAL) {
        let excess = total - STANDARD_EV_TOTAL;
        ['spe', 'spd', 'spa', 'def', 'atk', 'hp'].forEach(k => {
            if (excess <= 0) return;
            const sub = Math.min(result[k], excess);
            result[k] -= sub;
            excess -= sub;
        });
    }
    return result;
}

// Export for Node environments (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPokemonAbilities, calculateStat, getPermanentForm,
        normalizeChampionsEvs, convertEvsToChampions, convertEvsFromChampions, clampEvsForMode
    };
}

function getPermanentForm(p) {
    if (!p) return null;
    const item = (p.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const species = (p.species || p.Name || p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Zacian-Crowned
    if (species === 'zacian' && item === 'rustedsword') return 'Zacian-Crowned';
    // Zamazenta-Crowned
    if (species === 'zamazenta' && item === 'rustedshield') return 'Zamazenta-Crowned';
    // Giratina-Origin
    if (species === 'giratina' && (item === 'griseousorb' || item === 'griseouscore')) return 'Giratina-Origin';
    // Dialga-Origin
    if (species === 'dialga' && (item === 'adamantcrystal' || item === 'adamantorb')) return 'Dialga-Origin';
    // Palkia-Origin
    if (species === 'palkia' && (item === 'lustrousglobe' || item === 'lustrousorb')) return 'Palkia-Origin';
    
    // Ogerpon Forms
    if (species === 'ogerpon') {
        if (item === 'wellspringmask') return 'Ogerpon-Wellspring';
        if (item === 'hearthflamemask') return 'Ogerpon-Hearthflame';
        if (item === 'cornerstonemask') return 'Ogerpon-Cornerstone';
    }

    // Arceus Forms
    if (species === 'arceus') {
        const plates = {
            'insectplate': 'Bug', 'dreadplate': 'Dark', 'dracoplate': 'Dragon', 'zapplate': 'Electric',
            'pixieplate': 'Fairy', 'fistplate': 'Fighting', 'flameplate': 'Fire', 'skyplate': 'Flying',
            'spookyplate': 'Ghost', 'meadowplate': 'Grass', 'earthplate': 'Ground', 'icicleplate': 'Ice',
            'toxicplate': 'Poison', 'mindplate': 'Psychic', 'stoneplate': 'Rock', 'ironplate': 'Steel',
            'splashplate': 'Water'
        };
        if (plates[item]) return 'Arceus-' + plates[item];
    }

    // Silvally Forms
    if (species === 'silvally') {
        const memories = {
            'bugmemory': 'Bug', 'darkmemory': 'Dark', 'dragonmemory': 'Dragon', 'electricmemory': 'Electric',
            'fairymemory': 'Fairy', 'fightingmemory': 'Fighting', 'firememory': 'Fire', 'flyingmemory': 'Flying',
            'ghostmemory': 'Ghost', 'grassmemory': 'Grass', 'groundmemory': 'Ground', 'icememory': 'Ice',
            'poisonmemory': 'Poison', 'psychicmemory': 'Psychic', 'rockmemory': 'Rock', 'steelmemory': 'Steel',
            'watermemory': 'Water'
        };
        if (memories[item]) return 'Silvally-' + memories[item];
    }

    return null;
}
