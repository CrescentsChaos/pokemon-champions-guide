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
    let pokemonNames = new Set();
    try {
        if (fs.existsSync(pokemonPath)) {
            const pokes = JSON.parse(fs.readFileSync(pokemonPath, 'utf8'));
            pokes.forEach(p => {
                if (p.Name) pokemonNames.add(p.Name.toLowerCase());
            });
        }
    } catch (err) {
        console.error('Error loading pokemon data file:', err.message);
        process.exit(1);
    }

    let adding = true;
    while (adding) {
        let buildsData = [];
        try {
            if (fs.existsSync(buildsPath)) {
                buildsData = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));
            }
        } catch (err) {
            console.error('Error loading builds data:', err.message);
            break;
        }

        // 2. Get Pokepaste
        const paste = await askMultiLine('\nPaste your Pokepaste below (press ENTER on a blank line to finish):');
        const firstLine = paste.split('\n')[0];
        const extractedName = extractPokemonName(firstLine);

        // 3. Confirm Name and Validate
        let pokemonName = extractedName;
        if (!pokemonNames.has(pokemonName.toLowerCase())) {
            console.warn(`\n[WARNING] "${pokemonName}" not found in assets/pokemon.json!`);
        }

        // 4. Get Format
        const formatInput = await new Promise(resolve => {
            rl.question(`\nIs this for Singles or Doubles? (s/d) [default: d]: `, resolve);
        });
        const format = (formatInput.toLowerCase() === 's') ? 'Singles' : 'Doubles';

        // 5. Get Synergies
        const synergiesInput = await new Promise(resolve => {
            rl.question(`\nEnter synergy IDs (comma-separated, e.g. 01, 02) or leave blank: `, resolve);
        });
        
        const synergies = synergiesInput
            ? synergiesInput.split(',').map(s => s.trim().padStart(2, '0')).filter(s => s !== '')
            : [];

        // 6. Generate New ID
        let maxId = 0;
        buildsData.forEach(b => {
            const idNum = parseInt(b.id, 10);
            if (idNum > maxId) maxId = idNum;
        });
        const nextId = String(maxId + 1).padStart(2, '0');

        // 7. Create New Build Object
        const newBuild = {
            id: nextId,
            pokemon: pokemonName,
            build: paste.trim(),
            synergy: synergies,
            format: format
        };

        // 8. Save
        buildsData.push(newBuild);
        try {
            fs.writeFileSync(buildsPath, JSON.stringify(buildsData, null, 4), 'utf8');
            console.log(`\n--- Success! ---`);
            console.log(`Added build for ${pokemonName} [${format}] with ID: ${nextId}`);
        } catch (err) {
            console.error('Error saving builds.json:', err.message);
        }

        const answer = await new Promise(resolve => {
            rl.question('\nAdd another build? (y/n): ', resolve);
        });
        if (answer.toLowerCase() !== 'y') {
            adding = false;
        }
    }

    console.log('\nGoodbye!');
    rl.close();
}

main();
