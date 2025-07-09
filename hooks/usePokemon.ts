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

const fetchPokemon = async (id: number) => {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await response.json();
        return {
            id, 
            name: data.name,
            spriteURL: data.sprites.front_default
        };
    } catch (error) {
      console.error("Fetch Error", error);
      throw error;
    }
};

export const usePokemon = () => {
    const [gamePokemon, setGamePokemon] = useState<Pokemon[]>([]);
    const [loading, setLoading] = useState(false);

    const loadPokemon = useCallback(async (count=9, generations=[1]) => {//default 9 pokemon from gen 1
        setLoading(true);

        try {
            const pokemonIDList = getRandomIDs(count, generations);
            const promises = pokemonIDList.map(id => fetchPokemon(id));
            const pokemon = await Promise.all(promises);

            setGamePokemon(pokemon);
        } catch (error) {
            console.error("Loading Error", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearPokemon = useCallback (() => {
        setGamePokemon([]);
    }, []);

    return {
        gamePokemon,
        loading,
        loadPokemon,
        clearPokemon
    };
};