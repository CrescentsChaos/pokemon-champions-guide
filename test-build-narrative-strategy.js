const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pokemonDb = {
    Garchomp: { Name: 'Garchomp', Attack: 130, 'Sp.Atk': 80, Speed: 102, Total_Stats: 600, Ability: ['Rough Skin'] },
    Charizard: { Name: 'Charizard', Attack: 84, 'Sp.Atk': 109, Speed: 100, Total_Stats: 534, Ability: ['Blaze'] },
    'Charizard-Mega-Y': { Name: 'Charizard-Mega-Y', Attack: 104, 'Sp.Atk': 159, Speed: 100, Total_Stats: 634, Ability: ['Drought'] },
    Clefairy: { Name: 'Clefairy', Attack: 45, 'Sp.Atk': 60, Speed: 35, Total_Stats: 323, Ability: ['Friend Guard'] },
    Pelipper: { Name: 'Pelipper', Attack: 50, 'Sp.Atk': 95, Speed: 65, Total_Stats: 440, Ability: ['Drizzle'] },
    Barraskewda: { Name: 'Barraskewda', Attack: 123, 'Sp.Atk': 60, Speed: 136, Total_Stats: 490, Ability: ['Swift Swim'] },
    Cresselia: { Name: 'Cresselia', Attack: 70, 'Sp.Atk': 75, Speed: 85, Total_Stats: 580, Ability: ['Levitate'] },
    Ursaluna: { Name: 'Ursaluna', Attack: 140, 'Sp.Atk': 45, Speed: 50, Total_Stats: 550, Ability: ['Guts'] },
    Toxapex: { Name: 'Toxapex', Attack: 63, 'Sp.Atk': 53, Speed: 35, Total_Stats: 495, Ability: ['Regenerator'] },
    Blissey: { Name: 'Blissey', Attack: 10, 'Sp.Atk': 75, Speed: 55, Total_Stats: 540, Ability: ['Natural Cure'] },
    Serperior: { Name: 'Serperior', Attack: 75, 'Sp.Atk': 75, Speed: 113, Total_Stats: 528, Ability: ['Contrary'] },
    'Meowstic-M': { Name: 'Meowstic-M', Attack: 48, 'Sp.Atk': 83, Speed: 104, Total_Stats: 466, Ability: ['Prankster'] },
    'Ninetales-Alola': { Name: 'Ninetales-Alola', Attack: 67, 'Sp.Atk': 81, Speed: 109, Total_Stats: 505, Ability: ['Snow Warning'] },
    Cetitan: { Name: 'Cetitan', Attack: 113, 'Sp.Atk': 45, Speed: 73, Total_Stats: 521, Ability: ['Slush Rush'] }
};

const moveData = [
    ['Earthquake', 'Ground', 'Physical', 100],
    ['Dragon Claw', 'Dragon', 'Physical', 80],
    ['Heat Wave', 'Fire', 'Special', 95],
    ['Solar Beam', 'Grass', 'Special', 120],
    ['Hurricane', 'Flying', 'Special', 110],
    ['Liquidation', 'Water', 'Physical', 85],
    ['Facade', 'Normal', 'Physical', 70],
    ['Headlong Rush', 'Ground', 'Physical', 120],
    ['Leaf Storm', 'Grass', 'Special', 130],
    ['Blizzard', 'Ice', 'Special', 110],
    ['Icicle Crash', 'Ice', 'Physical', 85]
].map(([name, type, damage_class, power]) => ({ name, type, damage_class, power, tags: [] }));

const context = {
    console,
    allMoves: moveData,
    movesMap: Object.fromEntries(moveData.map(move => [move.name.toLowerCase().replace(/[^a-z0-9]/g, ''), move])),
    getMonDb(mon) {
        if (mon.item === 'Charizardite Y') return pokemonDb['Charizard-Mega-Y'];
        return pokemonDb[mon.species] || null;
    },
    globalThis: null
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/build-narrative.js', 'utf8'), context);

const blankUtils = {
    drizzle: false, drought: false, sand: false, snow: false, tr: false, tailwind: false,
    fakeout: false, redirection: false, screens: false, psychicterrain: false,
    grassyterrain: false, electricterrain: false, expandingforce: false, spread: false
};
const makeCtx = overrides => ({
    utils: { ...blankUtils, ...(overrides.utils || {}) },
    speedTiers: overrides.speedTiers || {},
    teamSize: overrides.teamSize || 2,
    flatRoles: overrides.flatRoles || []
});
const mon = (species, moves, extra = {}) => ({
    species,
    moves,
    item: '',
    ability: pokemonDb[species]?.Ability?.[0] || '',
    evs: { atk: 0, spa: 0 },
    ...extra
});

{
    const team = [
        mon('Garchomp', ['Earthquake', 'Dragon Claw'], { evs: { atk: 32, spa: 0 } }),
        mon('Charizard', ['Heat Wave', 'Solar Beam', 'Protect'], { item: 'Charizardite Y', ability: 'Blaze', evs: { atk: 0, spa: 32 } }),
        mon('Clefairy', ['Follow Me', 'Helping Hand', 'Protect'])
    ];
    const roles = [
        ['Physical Sweeper', 'Wallbreaker'],
        ['Special Sweeper', 'Wallbreaker', 'Weather Setter'],
        ['Redirection', 'Damage Mitigation']
    ];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        teamSize: 3,
        utils: { drought: true, redirection: true },
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.ace, 'Charizard', 'Mega Charizard Y should outrank Garchomp as the ace');
    assert.strictEqual(result.archetype, 'Sun Offense');
    assert.deepStrictEqual(Array.from(result.core), ['Charizard', 'Clefairy']);

    const reorderedTeam = [team[2], team[0], team[1]];
    const reorderedRoles = [roles[2], roles[0], roles[1]];
    const reordered = context.BuildNarrative.inspectTeamStrategy(reorderedTeam, reorderedRoles, makeCtx({
        teamSize: 3,
        utils: { drought: true, redirection: true },
        flatRoles: reorderedRoles.flat()
    }));
    assert.strictEqual(reordered.ace, result.ace, 'Ace selection must not depend on team slot order');
    assert.deepStrictEqual(Array.from(reordered.core), Array.from(result.core), 'Core selection must not depend on team slot order');
}

{
    const team = [mon('Pelipper', ['Hurricane', 'Tailwind']), mon('Barraskewda', ['Liquidation', 'Protect'])];
    const roles = [['Weather Setter', 'Speed Control'], ['Physical Sweeper', 'Weather Abuser']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        utils: { drizzle: true, tailwind: true },
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.archetype, 'Rain Offense');
}

{
    const team = [mon('Cresselia', ['Trick Room', 'Helping Hand']), mon('Ursaluna', ['Facade', 'Headlong Rush'])];
    const roles = [['Trick Room Setter'], ['Trick Room Abuser', 'Wallbreaker']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        utils: { tr: true },
        speedTiers: { trAbuser: 1 },
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.archetype, 'Trick Room Offense');
    assert.strictEqual(result.ace, 'Ursaluna');
}

{
    const team = [
        mon('Garchomp', ['Swords Dance', 'Earthquake', 'Dragon Claw', 'Protect'], { evs: { atk: 32, spa: 0 } }),
        mon('Clefairy', ['Follow Me', 'Helping Hand', 'Life Dew', 'Protect'])
    ];
    const roles = [['Physical Sweeper'], ['Redirection', 'Damage Mitigation']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        utils: { redirection: true },
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.archetype, 'Supported Setup Sweep');
    assert.deepStrictEqual(Array.from(result.core), ['Garchomp', 'Clefairy']);
}

{
    const team = [
        mon('Serperior', ['Leaf Storm', 'Protect'], { ability: 'Contrary', evs: { atk: 0, spa: 32 } }),
        mon('Meowstic-M', ['Tickle', 'Fake Tears', 'Protect'], { ability: 'Prankster' })
    ];
    const roles = [['Special Sweeper', 'Contrary Abuser'], ['Disruptor']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.archetype, 'Contrary Ally-Boost Engine');
    assert.strictEqual(result.ace, 'Serperior');
    assert.deepStrictEqual(Array.from(result.core), ['Serperior', 'Meowstic-M']);
    assert.strictEqual(
        context.BuildNarrative.getStrategySpriteUrl(team[1]),
        'https://play.pokemonshowdown.com/sprites/ani/meowstic.gif'
    );
}

{
    const team = [
        mon('Ninetales-Alola', ['Blizzard', 'Aurora Veil', 'Protect'], { ability: 'Snow Warning' }),
        mon('Cetitan', ['Icicle Crash', 'Protect'], { ability: 'Slush Rush', evs: { atk: 32, spa: 0 } })
    ];
    const roles = [['Weather Setter', 'Screener'], ['Physical Sweeper', 'Weather Abuser']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({
        utils: { snow: true, screens: true },
        flatRoles: roles.flat()
    }));
    assert.strictEqual(result.archetype, 'Snow / Aurora Veil Offense');
    assert(result.strategies.includes('Screens Offense'));
}

{
    const team = [
        mon('Toxapex', ['Recover', 'Toxic', 'Toxic Spikes']),
        mon('Blissey', ['Soft-Boiled', 'Thunder Wave', 'Stealth Rock'])
    ];
    const roles = [['Physical Wall'], ['Special Wall', 'Cleric/Healer']];
    const result = context.BuildNarrative.inspectTeamStrategy(team, roles, makeCtx({ flatRoles: roles.flat() }));
    assert.strictEqual(result.archetype, 'Status Stall / Attrition');
    assert(result.strategies.includes('Hazard Stack'));
}

console.log('Build narrative strategy tests passed.');
