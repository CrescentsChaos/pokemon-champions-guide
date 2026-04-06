const fs = require('fs');
const path = require('path');

const csvPath = 'c:/Users/USER/Desktop/DEV/Pokemon Champions Guide/assets/moves_database.csv';
const jsonPath = 'c:/Users/USER/Desktop/DEV/Pokemon Champions Guide/assets/moves.json';

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
    const headers = lines[0].split(',');

    const moves = lines.slice(1).map(line => {
        // Handle potential commas in double quotes (though rare in simple move csvs)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') inQuotes = !inQuotes;
            else if (line[i] === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += line[i];
            }
        }
        values.push(current.trim());

        const move = {};
        headers.forEach((header, index) => {
            let val = values[index];
            if (val === undefined || val === '') {
                move[header] = null;
            } else if (!isNaN(val) && val.trim() !== '') {
                move[header] = Number(val);
            } else {
                move[header] = val;
            }
        });
        return move;
    });

    fs.writeFileSync(jsonPath, JSON.stringify(moves, null, 2));
    console.log(`Successfully converted ${moves.length} moves to JSON.`);
} catch (err) {
    console.error('Error converting CSV:', err);
}
