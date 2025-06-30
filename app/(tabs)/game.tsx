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
      const pokemonIDList = [1, 4, 7, 10, 11]
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