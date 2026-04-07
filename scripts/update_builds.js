const fs = require('fs');

const builds = JSON.parse(fs.readFileSync('assets/builds.json', 'utf8'));

// 1. Sort Alphabetically by Pokemon Name
builds.sort((a, b) => a.pokemon.localeCompare(b.pokemon));

// 2. Add Format and Re-index IDs
builds.forEach((b, i) => {
    // Re-index to be safe and clean
    const oldId = b.id;
    const newId = (i + 1).toString().padStart(2, '0');
    b.id = newId;

    // Infer Format
    const content = b.build.toLowerCase();
    if (content.includes('level: 50') || content.includes('- protect') || content.includes('- fake out') || content.includes('- tailwind')) {
        b.format = 'Doubles';
    } else {
        b.format = 'Singles';
    }

    // Manual overrides for specific cases
    if (b.pokemon === 'Abomasnow') b.format = 'Singles'; // Most in his paste were Smogon style
    if (['Flutter Mane', 'Incineroar', 'Indeedee-F', 'Armarouge'].includes(b.pokemon)) b.format = 'Doubles';
});

// 3. Fix Synergy References (Since IDs changed)
// Since synergy is manually entered and currently contains things like "06", "07"
// and even "0y" (invalid), I will reset synergies for now or try to map them if possible.
// Actually, mapping is hard if I don't know the exact old mapping.
// I'll keep synergies but note that they might need manual fixing if they point to specific IDs.
// Actually, looking at the file, Incineroar (10) pointed to 06, 07, 08, 09 (Flutter Mane).
// After sort, Flutter Mane is still near the top but IDs might shift.
// To be safe, I'll keep the IDs as they were IF I can.
// But the user asked to sort...

// Let's NOT re-index automatically yet to avoid breaking synergies.
// I'll just sort them and Add the format.

const sortedBuilds = [...JSON.parse(fs.readFileSync('assets/builds.json', 'utf8'))];
sortedBuilds.sort((a, b) => a.pokemon.localeCompare(b.pokemon));

sortedBuilds.forEach(b => {
    const content = b.build.toLowerCase();
    if (!b.format) {
        if (content.includes('level: 50') || content.includes('- protect') || content.includes('- fake out')) {
            b.format = 'Doubles';
        } else {
            b.format = 'Singles';
        }
    }
});

fs.writeFileSync('assets/builds.json', JSON.stringify(sortedBuilds, null, 4));
console.log('Builds sorted and format added.');
