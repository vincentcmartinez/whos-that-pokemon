import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';


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

const reducer = (state, action) => {
  switch (action.type) {
    case "nextPokemon":
      return {...state, currentPokemonIndex: state.currentPokemonIndex + 1};
    case "revealSprite":
      return {...state, spriteVisible: true};
    case "hideSprite":
      return {...state, spriteVisible: false};
    case "toggleSprite":
      return {...state, spriteVisible: !state.spriteVisible};
    case "loseLife":
      return {...state, lifeNum: state.lifeNum - 1};
    case "skipPokemon":
      return {...state, currentPokemonIndex: state.currentPokemonIndex + 1, lifeNum: state.lifeNum - 1, guessTime: 30};
    case "updateGuessText":
      return {...state, guessText: action.payload}
    case "correctGuess":
      return {...state, currentPokemonIndex: state.currentPokemonIndex + 1, spriteVisible: false, roundNum: state.roundNum + 1, guessText: ""}
    case "gameOver":
      return {...state, modalVisible: true, timerActive: false}
    case "timerTick":
      return {...state, guessTime: state.guessTime - 1}
    case "timerExpired":
      return {...state, currentPokemonIndex: state.currentPokemonIndex + 1, lifeNum: state.lifeNum - 1, roundNum: state.roundNum + 1, guessTime: 30}
    case "timerReset":
      return {...state, guessTime: 30, timerActive: true}
    case "timerPause":
      return {...state, timerActive: false}
    case "reset":
      return {currentPokemonIndex: 0, spriteVisible: false, roundNum: 1, lifeNum: 5, guessText: "", modalVisible: false, score: 0, guessTime: 30, timerActive: true};
    default:
      throw new Error();
  }
}


export default function GameScreen() {
  const router = useRouter();

  useFocusEffect(//game reset on focus
    useCallback(() => {
      resetGame();
    }, [])
  );

  const [state, dispatch] = useReducer(reducer, {currentPokemonIndex: 0, spriteVisible: false, roundNum: 1, lifeNum: 5, guessText: "", modalVisible: false, score: 0, guessTime: 30, timerActive: true});

  const [gamePokemons, setGamePokemons] = useState([]);

  const resetGame = () => {
    setGamePokemons([]);
    dispatch({type: "reset"});
    loadPokemon();
  }

  const loadPokemon = async () => {
    try {
      const pokemonIDList = getRandomIDs(9, 1);//hardcoded 9 pokemon from gen 1 - 5 rounds + max of 4 skips
      const promises = pokemonIDList.map(id => fetchPokemon(id));
      const pokemons = await Promise.all(promises);

      setGamePokemons(pokemons);

    } catch (error) {
      console.error("load", error);
    }
  }

  const handleGuessChange = (text) => {
    dispatch({type: "updateGuessText", payload: text});

    if (text === gamePokemons[state.currentPokemonIndex]?.name) {//correct
      dispatch({type: "revealSprite"});

      if (state.roundNum === 5) {//on final round
        dispatch({type: "gameOver"});
      }else{//more rounds
        dispatch({type: "timerPause"});
        setTimeout(() => {//3 sec wait before advance/score/hide/cleartext
          dispatch({type: "correctGuess"});
          dispatch({type: "timerReset"});
        }, 3000);
        
      }
    }
  }

  const handleSkip = () => {
    if (state.lifeNum === 1){//skipped or timedout on last life
      dispatch({type: "gameOver"});
    }else{//normal skip
      dispatch({type: "skipPokemon"});
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (state.timerActive){
        if (state.guessTime >= 1){
          dispatch({type: "timerTick"});
        }else{
          if (state.lifeNum === 1){//timeout on last
            dispatch({type: "gameOver"});
          }else{
            dispatch({type: "timerExpired"});
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.guessTime, state.timerActive, state.lifeNum]);

  return (
    
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Game"}} />
      <Modal visible = {state.modalVisible}>
        <View>
          <Text>Game Over !</Text>
          <Text>Score: {state.score}</Text>
          <Pressable onPress = {() => resetGame()}>
            <Text>Play Again</Text>
          </Pressable>
          <Pressable onPress = {() => router.push("/")}>
            <Text>Return Home</Text>
          </Pressable>
        </View>
      </Modal>

      <Text style={styles.title}>Guess the Pokémon!</Text>
      <Text>Round {state.roundNum}</Text>
      <Text>Lives: {state.lifeNum}</Text>
      <Text>Score: {state.score}</Text>
      <Text>Pokemon: {gamePokemons[state.currentPokemonIndex]?.name}</Text> 
      <Text>Time: {state.guessTime}</Text> 

      {gamePokemons[state.currentPokemonIndex]?.spriteURL && (<Image source = {{uri: gamePokemons[state.currentPokemonIndex].spriteURL}}//add loading
        style = {state.spriteVisible ? styles.spriteRevealed : styles.spriteHidden} 
      />)}

      <TextInput 
        placeholder = "Your guess..." 
        autoCorrect = {false}
        value = {state.guessText}
        onChangeText = {handleGuessChange}
        //onSubmitEditing = {} implment shake
        style = {styles.input} 
      />
      
      <Pressable onPress = {() => handleSkip()}> 
        <Text>Skip Pokemon</Text>
      </Pressable>

      <Pressable onPress = {() => router.push("/")}>
        <Text>Return</Text>
      </Pressable>

    </View>
  );
} 

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-around', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20 },
  input: { width: '100%', borderColor: '#aaa', borderWidth: 1, padding: 10, borderRadius: 5 },
  spriteHidden: {width: 300, height: 300, tintColor: "black"},
  spriteRevealed: {width: 300, height: 300}
});