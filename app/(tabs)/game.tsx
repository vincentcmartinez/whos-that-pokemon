import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';


const fetchPokemon = async (id) => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await response.json();
    return {id, name: data.name, spriteURL: data.sprites.front_default};

  } catch (error) {
    console.error("fetch", error);
    
  }
}

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

const getRandomIDs = (n, gen) => {
  const {start, end} = GEN_RANGES[gen];
  const uniqueIDs = new Set();

  while (uniqueIDs.size < n) {
    const randomID = Math.floor(Math.random() * (end - start + 1)) + start;
    uniqueIDs.add(randomID);
  }

  return Array.from(uniqueIDs)
}


export default function GameScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      resetGame();
    }, [])
  );

  const [gamePokemons, setGamePokemons] = useState([]);
  const [currentPokemonIndex, setCurrentPokemonIndex] = useState(0);
  const [spriteVisible, setSpriteVisible] = useState(false)


  const resetGame = () => {
    setGamePokemons([]);
    setCurrentPokemonIndex(0);
    setSpriteVisible(false);
    loadPokemon();
  }

  const loadPokemon = async () => {
    try {
      const pokemonIDList = getRandomIDs(5, 1);//hardcoded 5 pokemon from gen 1
      const promises = pokemonIDList.map(id => fetchPokemon(id));
      const pokemons = await Promise.all(promises);

      setGamePokemons(pokemons);

    } catch (error) {
      console.error("load", error);
    }
  }

  
  
  const toggleSpriteVisible = () => {
    setSpriteVisible(visibility => !visibility);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Game"}} />
      <Text style={styles.title}>Guess the Pokémon!</Text>

      

      {gamePokemons[currentPokemonIndex]?.spriteURL && (<Image source = {{uri: gamePokemons[currentPokemonIndex].spriteURL}}
        style = {spriteVisible ? styles.spriteRevealed : styles.spriteHidden} //filter
      />)}

      {/* 

      // <TextInput placeholder="Your guess..." style={styles.input} />
      
      */}

      <Pressable onPress = {() => setCurrentPokemonIndex(currentPokemonIndex + 1)}> 
        <Text>Reload</Text>
      </Pressable>

      <Pressable onPress = {() => toggleSpriteVisible()}>
        <Text>Toggle</Text>
      </Pressable>

      <Pressable onPress = {() => router.push("/")}>
        <Text>Return</Text>
      </Pressable>

    </View>
  );
} 

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20 },
  input: { width: '100%', borderColor: '#aaa', borderWidth: 1, padding: 10, borderRadius: 5 },
  spriteHidden: {width: 300, height: 300, tintColor: "black"},
  spriteRevealed: {width: 300, height: 300}
});