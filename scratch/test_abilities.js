const { getPokemonAbilities } = require('../js/utils.js');

const tests = [
    {
        name: 'Legacy Structure',
        entry: { Ability_1: 'Intimidate', Ability_2: 'None', Ability_Hidden: 'Moxie' },
        expected: ['Intimidate', 'Moxie']
    },
    {
        name: 'New Array Structure (Mega)',
        entry: { Name: 'Venusaur-Mega', Ability: ['Thick Fat'] },
        expected: ['Thick Fat']
    },
    {
        name: 'Mixed Structure',
        entry: { Ability: ['Levitate'], Ability_1: 'Levitate' },
        expected: ['Levitate']
    },
    {
        name: 'Missing structures',
        entry: { Name: 'MissingNo' },
        expected: ['None']
    }
];

let failed = 0;
tests.forEach(t => {
    const result = getPokemonAbilities(t.entry);
    const pass = JSON.stringify(result) === JSON.stringify(t.expected);
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${t.name}`);
    if (!pass) {
        console.log(`  Expected: ${JSON.stringify(t.expected)}`);
        console.log(`  Got:      ${JSON.stringify(result)}`);
        failed++;
    }
});

if (failed === 0) console.log('\nAll tests passed!');
else process.exit(1);
