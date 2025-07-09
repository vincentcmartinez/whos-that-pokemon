import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useReducer } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePokemon } from '../../hooks/usePokemon';
import { useTimer } from '../../hooks/useTimer';

const GENS = [1];

const ACTIONS = {
  RESET: 'reset',
  UPDATE_SCORE: 'updateScore',
  UPDATE_GUESS_TEXT: 'updateGuessText',
  REVEAL_SPRITE: 'revealSprite',
  SKIP_POKEMON: 'skipPokemon',
  TIMER_EXPIRE: 'timerExpire',
  CORRECT_GUESS: 'correctGuess',
  GAME_OVER: 'gameOver'
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'updateGuessText':
      return {...state, guessText: action.payload};
    case 'updateScore'://fix
      return {...state,
        score: state.score + action.payload,
        scoreData: [...state.scoreData, [state.currentPokemonIndex, action.payload]]
      };
    case 'revealSprite':
      return {...state, spriteVisible: true};
    case 'skipPokemon':
      return {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        lifeNum: state.lifeNum - 1,
        guessText: ""
      };
    case 'timerExpire':
      return {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        roundNum: state.roundNum + 1,
        lifeNum: state.lifeNum - 1,
        guessText: ""
      };
    case 'correctGuess':
      return {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        spriteVisible: false,
        roundNum: state.roundNum + 1,
        guessText: ""
      };

    case 'gameOver':
      return {...state, modalVisible: true};
    case 'reset':
      return {
        currentPokemonIndex: 0,
        spriteVisible: false,
        roundNum: 1,
        lifeNum: 5,
        guessText: "",
        modalVisible: false,
        score: 0,
        scoreData: []
      };
    default:
      throw new Error();
  }
}


export default function GameScreen() {
  const router = useRouter();
  const {gamePokemon, loading, loadPokemon, clearPokemon} = usePokemon();

  const handleTimerExpire = () => {
    stopTimer();
    if (state.lifeNum === 1 || state.roundNum === 5){
      dispatch({type: ACTIONS.GAME_OVER});
    }else{
      dispatch({type: ACTIONS.TIMER_EXPIRE});
        resetTimer();
        startTimer();
    }
  }

  const {time, startTimer, stopTimer, resetTimer} = useTimer(30, handleTimerExpire);

  const [state, dispatch] = useReducer(reducer, {
    currentPokemonIndex: 0,
    spriteVisible: false,
    roundNum: 1,
    lifeNum: 5,
    guessText: "",
    modalVisible: false,
    score: 0,
    scoreData: []}
  );

  useFocusEffect(//game reset on focus
    useCallback(() => {
      resetGame();
    }, [])
  );

  const resetGame = () => {
    clearPokemon();
    dispatch({type: ACTIONS.RESET});
    loadPokemon(9, GENS);
    stopTimer();
    resetTimer();
    startTimer();
  }

  const handleGuessChange = (text: string) => {
    dispatch({type: ACTIONS.UPDATE_GUESS_TEXT, payload: text});
    if (text.trim().toLowerCase() === gamePokemon[state.currentPokemonIndex]?.name.toLowerCase()) {//correct
      handleCorrectGuess();
    }
  }

  const handleCorrectGuess = () => {
    stopTimer();
    dispatch({type: ACTIONS.REVEAL_SPRITE});
    dispatch({type: ACTIONS.UPDATE_SCORE, payload: time});
    if (state.roundNum === 5) {//on final round
      dispatch({type: ACTIONS.GAME_OVER});
    }else{//more rounds
      setTimeout(() => {//3 sec wait 
        dispatch({type: ACTIONS.CORRECT_GUESS});
        resetTimer();
        startTimer();
      }, 3000);
    }
  }

  const handleSkip = () => {
    stopTimer();
    if (state.lifeNum === 1){//skipped or timedout on last life
      dispatch({type: ACTIONS.GAME_OVER});
    }else{//normal skip
      dispatch({type: ACTIONS.SKIP_POKEMON});
      resetTimer();
      startTimer();
    }
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Game"}} />
      <Modal style = {styles.modal} visible = {state.modalVisible}>
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
      <Text>Pokemon: {gamePokemon[state.currentPokemonIndex]?.name}</Text> 
      <Text>Time: {time}</Text> 

      {gamePokemon[state.currentPokemonIndex]?.spriteURL && (<Image source = {{uri: gamePokemon[state.currentPokemonIndex].spriteURL}}//add loading
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
  modal: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)',},
  title: { fontSize: 22, marginBottom: 20 },
  input: { width: '100%', borderColor: '#aaa', borderWidth: 1, padding: 10, borderRadius: 5 },
  spriteHidden: {width: 300, height: 300, tintColor: "black"},
  spriteRevealed: {width: 300, height: 300}
});