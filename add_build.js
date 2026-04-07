const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paths
const buildsPath = path.join(__dirname, 'assets', 'builds.json');
const pokemonPath = path.join(__dirname, 'assets', 'pokemon.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Prompts the user for multi-line input.
 * Finish by entering an empty line.
 */
function askMultiLine(prompt) {
    console.log(prompt);
    return new Promise((resolve) => {
        let lines = [];
        const onLine = (line) => {
            // End on an empty line after at least one line of input
            if (line.trim() === '' && lines.length > 0) {
                rl.removeListener('line', onLine);
                resolve(lines.join('\n'));
            } else if (line.trim() !== '' || lines.length > 0) {
                lines.push(line);
            }
        };
        rl.on('line', onLine);
    });
}

/**
 * Extracts the Pokémon name from the first line of a Pokepaste.
 * Handles:
 * - Pikachu @ Light Ball
 * - Buzz (Pikachu) @ Light Ball
 * - Pikachu
 * - Buzz (Pikachu)
 */
function extractPokemonName(firstLine) {
    // 1. Remove item part if exists
    let namePart = firstLine.split('@')[0].trim();
    
    // 2. Check for nickname in format "Nickname (RealName)"
    const match = namePart.match(/\(([^)]+)\)/);
    if (match) {
        return match[1].trim();
    }
    
    return namePart;
}

async function main() {
    console.log('--- Pokémon Build Adder ---');
    
    // 1. Load Data
    let buildsData = [];
    let pokemonNames = new Set();
    
    try {
        if (fs.existsSync(buildsPath)) {
            buildsData = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));
        }
        
        if (fs.existsSync(pokemonPath)) {
            const pokes = JSON.parse(fs.readFileSync(pokemonPath, 'utf8'));
            pokes.forEach(p => {
                if (p.Name) pokemonNames.add(p.Name.toLowerCase());
            });
        }
    } catch (err) {
        console.error('Error loading data files:', err.message);
        process.exit(1);
    }

    // 2. Get Pokepaste
    const paste = await askMultiLine('Paste your Pokepaste below (press ENTER on a blank line to finish):');
    const firstLine = paste.split('\n')[0];
    const extractedName = extractPokemonName(firstLine);

    // 3. Confirm Name and Validate
    let pokemonName = extractedName;
    if (!pokemonNames.has(pokemonName.toLowerCase())) {
        console.warn(`\n[WARNING] "${pokemonName}" not found in assets/pokemon.json!`);
        // We still allow it but warn.
    }

    // 4. Get Synergies
    const synergiesInput = await new Promise(resolve => {
        rl.question(`\nEnter synergy IDs (comma-separated, e.01, 02) or leave blank: `, resolve);
    });
    
    const synergies = synergiesInput
        ? synergiesInput.split(',').map(s => s.trim().padStart(2, '0')).filter(s => s !== '')
        : [];

    // 5. Generate New ID
    let maxId = 0;
    buildsData.forEach(b => {
        const idNum = parseInt(b.id, 10);
        if (idNum > maxId) maxId = idNum;
    });
    const nextId = String(maxId + 1).padStart(2, '0');

    // 6. Create New Build Object
    const newBuild = {
        id: nextId,
        pokemon: pokemonName,
        build: paste.trim(),
        synergy: synergies
    };

    // 7. Save
    buildsData.push(newBuild);
    try {
        fs.writeFileSync(buildsPath, JSON.stringify(buildsData, null, 4), 'utf8');
        console.log(`\n--- Success! ---`);
        console.log(`Added build for ${pokemonName} with ID: ${nextId}`);
        console.log(`Stored in: ${buildsPath}`);
    } catch (err) {
        console.error('Error saving builds.json:', err.message);
    }

    rl.close();
}

main();
