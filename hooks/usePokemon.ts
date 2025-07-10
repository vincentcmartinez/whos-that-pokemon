import { useCallback, useState } from 'react';

const GEN_RANGES: {[key: number]: {start: number; end: number}} = {
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

type Pokemon = {
    id: number;
    name: string;
    spriteURL: string;
};

// Fallback Pokémon data in case API fails
const FALLBACK_POKEMON: Pokemon[] = [
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

const getRandomIDs = (n: number, gens: number[]): number[] => {//assumes n and gens are valid
    const validIDs: number[] = [];
    gens.forEach(gen => {
        const {start, end} = GEN_RANGES[gen];
        for (let i=start; i<=end; i++) {
            validIDs.push(i);
        }
    });

    const uniqueIDs = new Set<number>();
    while (uniqueIDs.size < n) {
      const randomIndex = Math.floor(Math.random() * validIDs.length);
      uniqueIDs.add(validIDs[randomIndex]);
    }
  
    return Array.from(uniqueIDs);
};

const fetchPokemon = async (id: number): Promise<Pokemon> => {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            id, 
            name: data.name,
            spriteURL: data.sprites.front_default
        };
    } catch (error) {
        console.error("Fetch Error for Pokemon ID", id, error);
        // Return a fallback Pokémon if API fails
        const fallbackIndex = (id - 1) % FALLBACK_POKEMON.length;
        return FALLBACK_POKEMON[fallbackIndex];
    }
};

export const usePokemon = () => {
    const [gamePokemon, setGamePokemon] = useState<Pokemon[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPokemon = useCallback(async (count=9, generations=[1]) => {//default 9 pokemon from gen 1
        setLoading(true);
        setError(null);

        try {
            const pokemonIDList = getRandomIDs(count, generations);
            const promises = pokemonIDList.map(id => fetchPokemon(id));
            const pokemon = await Promise.all(promises);

            setGamePokemon(pokemon);
        } catch (error) {
            console.error("Loading Error", error);
            setError("Failed to load Pokémon. Using fallback data.");
            // Use fallback data if all API calls fail
            setGamePokemon(FALLBACK_POKEMON.slice(0, count));
        } finally {
            setLoading(false);
        }
    }, []);

    const clearPokemon = useCallback (() => {
        setGamePokemon([]);
        setError(null);
    }, []);

    const setPokemonFromServer = useCallback((pokemonList: any[]) => {
        const serverPokemon = pokemonList.map((pokemon: any) => ({
            id: pokemon.id,
            name: pokemon.name,
            spriteURL: pokemon.spriteURL
        }));
        setGamePokemon(serverPokemon);
        setError(null);
    }, []);

    return {
        gamePokemon,
        loading,
        error,
        loadPokemon,
        clearPokemon,
        setPokemonFromServer
    };
};