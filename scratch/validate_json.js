const fs = require('fs');
const path = require('path');

const files = [
    'assets/pokemon.json',
    'assets/moves.json',
    'assets/items.json',
    'assets/builds.json'
];

const basePath = 'c:\\Users\\USER\\Desktop\\DEV\\Pokemon Champions Guide';

files.forEach(f => {
    const fullPath = path.join(basePath, f);
    console.log(`Checking ${f}...`);
    try {
        if (!fs.existsSync(fullPath)) {
            console.error(`  ERROR: File does not exist!`);
            return;
        }
        const str = fs.readFileSync(fullPath, 'utf8');
        JSON.parse(str);
        console.log(`  OK.`);
    } catch (e) {
        console.error(`  ERROR: Invalid JSON! ${e.message}`);
    }
});
