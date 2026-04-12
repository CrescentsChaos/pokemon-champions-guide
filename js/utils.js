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
function calculateStat(base, iv, ev, level, natureType, statKey) {
    const lvl = parseInt(level) || 50;
    const evBonus = Math.floor(parseInt(ev || 0) / 4);
    const ivVal = parseInt(iv || 31);
    
    if (statKey === 'hp') {
        if (parseInt(base) === 1) return 1; // Shedinja
        return Math.floor(((2 * parseInt(base) + ivVal + evBonus) * lvl) / 100) + lvl + 10;
    }
    
    let val = Math.floor(((2 * parseInt(base) + ivVal + evBonus) * lvl) / 100) + 5;
    
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

// Export for Node environments (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getPokemonAbilities, calculateStat, getPermanentForm };
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
