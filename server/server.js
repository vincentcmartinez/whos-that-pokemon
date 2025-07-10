const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const https = require('https');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const parties = new Map();

const GEN_RANGES = {
    1: {start: 1, end: 151},
    2: {start: 152, end: 251},
    3: {start: 252, end: 386},
    4: {start: 387, end: 493},
    5: {start: 494, end: 649},
    6: {start: 650, end: 721},
    7: {start: 722, end: 809},
    8: {start: 810, end: 905},
    9: {start: 906, end: 1025},
};

const FALLBACK_POKEMON = [
    { id: 1, name: "bulbasaur", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
    { id: 4, name: "charmander", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
    { id: 7, name: "squirtle", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" },
    { id: 25, name: "pikachu", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
    { id: 133, name: "eevee", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" },
    { id: 6, name: "charizard", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png" },
    { id: 9, name: "blastoise", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png" },
    { id: 3, name: "venusaur", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png" },
    { id: 150, name: "mewtwo", spriteURL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png" },
];

const getRandomIDs = (n, gens) => {
    const validIDs = [];
    gens.forEach(gen => {
        const {start, end} = GEN_RANGES[gen];
        for (let i = start; i <= end; i++) {
            validIDs.push(i);
        }
    });

    const uniqueIDs = new Set();
    while (uniqueIDs.size < n) {
        const randomIndex = Math.floor(Math.random() * validIDs.length);
        uniqueIDs.add(validIDs[randomIndex]);
    }

    return Array.from(uniqueIDs);
};

const fetchPokemon = async (id) => {
    console.log(`Fetching Pokemon ID: ${id}`);
    return new Promise((resolve) => {
        try {
            const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
            console.log(`Making request to: ${url}`);
            
            const request = https.get(url, {
                headers: {
                    'User-Agent': 'Pokemon-Game-Server/1.0',
                    'Accept': 'application/json'
                },
                timeout: 5000
            }, (response) => {
                console.log(`Response status for Pokemon ${id}:`, response.statusCode);
                
                if (response.statusCode !== 200) {
                    console.error(`HTTP error for Pokemon ${id}: status ${response.statusCode}`);
                    const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
                    const fallback = FALLBACK_POKEMON[fallbackIndex];
                    console.log(`Using fallback Pokemon for ID ${id}: ${fallback.name}`);
                    resolve(fallback);
                    return;
                }
                
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        const pokemonData = JSON.parse(data);
                        console.log(`Successfully fetched Pokemon ${id}: ${pokemonData.name}`);
                        
                        resolve({
                            id, 
                            name: pokemonData.name,
                            spriteURL: pokemonData.sprites.front_default
                        });
                    } catch (parseError) {
                        console.error(`JSON parse error for Pokemon ${id}:`, parseError.message);
                        const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
                        const fallback = FALLBACK_POKEMON[fallbackIndex];
                        console.log(`Using fallback Pokemon for ID ${id}: ${fallback.name}`);
                        resolve(fallback);
                    }
                });
            });
            
            request.on('error', (error) => {
                console.error(`Fetch Error for Pokemon ID ${id}:`, error.message);
                const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
                const fallback = FALLBACK_POKEMON[fallbackIndex];
                console.log(`Using fallback Pokemon for ID ${id}: ${fallback.name}`);
                resolve(fallback);
            });
            
            request.on('timeout', () => {
                console.error(`Timeout for Pokemon ID ${id}`);
                request.destroy();
                const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
                const fallback = FALLBACK_POKEMON[fallbackIndex];
                console.log(`Using fallback Pokemon for ID ${id}: ${fallback.name}`);
                resolve(fallback);
            });
            
        } catch (error) {
            console.error(`Unexpected error for Pokemon ID ${id}:`, error.message);
            const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
            const fallback = FALLBACK_POKEMON[fallbackIndex];
            console.log(`Using fallback Pokemon for ID ${id}: ${fallback.name}`);
            resolve(fallback);
        }
    });
};
const generatePartyCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

setInterval(() => {
    const now = Date.now();
    for (const [code, party] of parties.entries()) {
        if (now - party.createdAt > 3600000) { // 1 hour
            parties.delete(code);
            console.log(`Cleaned up expired party: ${code}`);
        }
    }
}, 300000); 


app.post('/api/parties', async (req, res) => {
    try {
        const { playerName } = req.body;
        
        if (!playerName) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        let partyCode;
        do {
            partyCode = generatePartyCode();
        } while (parties.has(partyCode));

        console.log('Creating party:', partyCode, 'for player:', playerName);
        
        const pokemonIDList = getRandomIDs(9, [1]);
        console.log('Generated Pokemon IDs:', pokemonIDList);
        
        console.log('Starting Pokemon API calls...');
        const pokemonPromises = pokemonIDList.map(id => fetchPokemon(id));
        const pokemonList = await Promise.all(pokemonPromises);
        console.log('Pokemon API calls completed. Retrieved:', pokemonList.length, 'Pokemon');

        const party = {
            code: partyCode,
            createdAt: Date.now(),
            players: [{
                id: uuidv4(),
                name: playerName,
                score: 0,
                livesRemaining: 5,
                roundsCompleted: 0,
                isHost: true
            }],
            pokemonList,
            status: 'waiting',
            gameStartTime: null
        };

        parties.set(partyCode, party);

        console.log(`Party created: ${partyCode} by ${playerName}`);
        console.log(`Final Pokemon list:`, pokemonList.map(p => ({ id: p.id, name: p.name })));
        
        res.json({
            partyCode,
            playerId: party.players[0].id,
            pokemonList,
            players: party.players
        });
    } catch (error) {
        console.error('Error creating party:', error);
        res.status(500).json({ error: 'Failed to create party' });
    }
});

app.post('/api/parties/:code/join', async (req, res) => {
    try {
        const { code } = req.params;
        const { playerName } = req.body;

        if (!playerName) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        const party = parties.get(code);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        if (party.status !== 'waiting') {
            return res.status(400).json({ error: 'Party is not accepting new players' });
        }

        if (party.players.length >= 5) {
            return res.status(400).json({ error: 'Party is full' });
        }

        if (party.players.some(p => p.name === playerName)) {
            return res.status(400).json({ error: 'Player name already taken' });
        }

        const newPlayer = {
            id: uuidv4(),
            name: playerName,
            score: 0,
            livesRemaining: 5,
            roundsCompleted: 0,
            isHost: false
        };

        party.players.push(newPlayer);

        res.json({
            partyCode: code,
            playerId: newPlayer.id,
            pokemonList: party.pokemonList,
            players: party.players
        });
    } catch (error) {
        console.error('Error joining party:', error);
        res.status(500).json({ error: 'Failed to join party' });
    }
});

app.get('/api/parties/:code', (req, res) => {
    try {
        const { code } = req.params;
        const party = parties.get(code);

        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        res.json({
            code: party.code,
            status: party.status,
            players: party.players,
            pokemonList: party.pokemonList,
            gameStartTime: party.gameStartTime
        });
    } catch (error) {
        console.error('Error getting party info:', error);
        res.status(500).json({ error: 'Failed to get party info' });
    }
});

app.post('/api/parties/:code/start', (req, res) => {
    try {
        const { code } = req.params;
        const { playerId } = req.body;

        const party = parties.get(code);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        const player = party.players.find(p => p.id === playerId);
        if (!player || !player.isHost) {
            return res.status(403).json({ error: 'Only host can start the game' });
        }

        if (party.players.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 players to start' });
        }

        party.status = 'playing';
        party.gameStartTime = Date.now();

        res.json({
            status: 'playing',
            gameStartTime: party.gameStartTime,
            players: party.players
        });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Failed to start game' });
    }
});

app.post('/api/parties/:code/score', (req, res) => {
    try {
        const { code } = req.params;
        const { playerId, score, livesRemaining, roundsCompleted } = req.body;

        const party = parties.get(code);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        const player = party.players.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        player.score = score;
        player.livesRemaining = livesRemaining;
        player.roundsCompleted = roundsCompleted;

        res.json({
            players: party.players
        });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ error: 'Failed to update score' });
    }
});

app.post('/api/parties/:code/finish', (req, res) => {
    try {
        const { code } = req.params;
        const { playerId, finalScore, livesRemaining, roundsCompleted } = req.body;

        const party = parties.get(code);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        const player = party.players.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Mark player as finished
        player.finished = true;
        player.finalScore = finalScore;
        player.livesRemaining = livesRemaining;
        player.roundsCompleted = roundsCompleted;

        // Check if all players have finished
        const allPlayersFinished = party.players.every(p => p.finished);
        
        if (allPlayersFinished) {
            // Determine winner
            const sortedPlayers = [...party.players].sort((a, b) => b.finalScore - a.finalScore);
            const winner = sortedPlayers[0];
            
            // Check for ties
            const tiedPlayers = sortedPlayers.filter(p => p.finalScore === winner.finalScore);
            
            // Store game result in party
            party.gameResult = {
                winner: tiedPlayers.length > 1 ? null : winner,
                tiedPlayers: tiedPlayers.length > 1 ? tiedPlayers : null
            };
            
            res.json({
                players: party.players,
                allFinished: true,
                winner: party.gameResult.winner,
                tiedPlayers: party.gameResult.tiedPlayers
            });
        } else {
            res.json({
                players: party.players,
                allFinished: false
            });
        }
    } catch (error) {
        console.error('Error finishing game:', error);
        res.status(500).json({ error: 'Failed to finish game' });
    }
});

app.delete('/api/parties/:code', (req, res) => {
    try {
        const { code } = req.params;
        const { playerId } = req.body;

        const party = parties.get(code);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        const player = party.players.find(p => p.id === playerId);
        if (!player || !player.isHost) {
            return res.status(403).json({ error: 'Only host can end the party' });
        }

        const sortedPlayers = [...party.players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];

        parties.delete(code);

        res.json({
            winner: {
                name: winner.name,
                score: winner.score
            },
            allPlayers: party.players
        });
    } catch (error) {
        console.error('Error ending party:', error);
        res.status(500).json({ error: 'Failed to end party' });
    }
});

app.get('/api/parties/:code/status', (req, res) => {
    try {
        const { code } = req.params;
        const party = parties.get(code);

        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        res.json({
            status: party.status,
            players: party.players,
            gameStartTime: party.gameStartTime,
            gameResult: party.gameResult || null
        });
    } catch (error) {
        console.error('Error getting party status:', error);
        res.status(500).json({ error: 'Failed to get party status' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Multiplayer server running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  POST /api/parties - Create a party`);
    console.log(`  POST /api/parties/:code/join - Join a party`);
    console.log(`  GET /api/parties/:code - Get party info`);
    console.log(`  POST /api/parties/:code/start - Start game`);
    console.log(`  POST /api/parties/:code/score - Update score`);
    console.log(`  DELETE /api/parties/:code - End party`);
    console.log(`  GET /api/parties/:code/status - Get party status`);
    
    // Test PokeAPI connectivity
    console.log('Testing PokeAPI connectivity...');
    const testRequest = https.get('https://pokeapi.co/api/v2/pokemon/1', (response) => {
        console.log('PokeAPI connectivity test - Status:', response.statusCode);
        if (response.statusCode === 200) {
            console.log('✅ PokeAPI is accessible');
        } else {
            console.log('❌ PokeAPI returned error status:', response.statusCode);
        }
    });
    
    testRequest.on('error', (error) => {
        console.log('❌ PokeAPI connectivity test failed:', error.message);
    });
    
    testRequest.on('timeout', () => {
        console.log('❌ PokeAPI connectivity test timed out');
        testRequest.destroy();
    });
}); 