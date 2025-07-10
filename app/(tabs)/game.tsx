import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useRef, useState, useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View, Dimensions, KeyboardAvoidingView, Platform, ColorValue, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePokemon } from '../../hooks/usePokemon';
import { useTimer } from '../../hooks/useTimer';

const { width, height } = Dimensions.get('window');

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

const reducer = (state:any, action:any) => {
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
      const newStateSkip = {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        lifeNum: Math.max(0, state.lifeNum - 1),
        guessText: ""
      };
      // Check for game over after state update
      if (newStateSkip.lifeNum <= 0 || newStateSkip.roundNum >= 5) {
        return {...newStateSkip, modalVisible: true};
      }
      return newStateSkip;
    case 'timerExpire':
      const newStateTimer = {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        roundNum: state.roundNum + 1,
        lifeNum: Math.max(0, state.lifeNum - 1),
        guessText: ""
      };
      // Check for game over after state update
      if (newStateTimer.lifeNum <= 0 || newStateTimer.roundNum >= 5) {
        return {...newStateTimer, modalVisible: true};
      }
      return newStateTimer;
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

const LIGHT_GRADIENT: ColorValue[] = ['#9191E9', '#f9fbf2'];
const DARK_GRADIENT: ColorValue[] = ['#2f3061', '#1b180e'];
const ACCENT_GRADIENT: ColorValue[] = ['#C2AFF0', '#9191E9'];
const CARD_COLOR = ACCENT_GRADIENT[1];

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const {gamePokemon, loading, error, loadPokemon, clearPokemon} = usePokemon();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark');
      } else {
        // Fallback to route params if no saved theme
        setTheme((params.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      // Fallback to route params
      setTheme((params.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark');
    }
  };

  const saveScore = async (score: number, livesRemaining: number, roundsCompleted: number) => {
    try {
      const newRecord = {
        id: Date.now().toString(),
        score,
        date: new Date().toISOString(),
        livesRemaining,
        roundsCompleted,
      };

      const existingRecords = await AsyncStorage.getItem('scoreRecords');
      let records = existingRecords ? JSON.parse(existingRecords) : [];
      
      // Add new record
      records.push(newRecord);
      
      // Keep only top 50 records
      records = records.sort((a: any, b: any) => b.score - a.score).slice(0, 50);
      
      await AsyncStorage.setItem('scoreRecords', JSON.stringify(records));
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

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

  const [betweenRounds, setBetweenRounds] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Save score when game ends
  useEffect(() => {
    if (state.modalVisible) {
      saveScore(state.score, state.lifeNum, state.roundNum);
    }
  }, [state.modalVisible]);

  const startShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleTimerExpire = () => {
    stopTimer();
    dispatch({type: ACTIONS.TIMER_EXPIRE});
    resetTimer();
    startTimer();
  }

  const {time, startTimer, stopTimer, resetTimer} = useTimer(30, handleTimerExpire);

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
    setBetweenRounds(true);
    setCountdown(3);
    startShake();
    let interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(interval);
          setBetweenRounds(false);
        }
        return prev - 1;
      });
    }, 1000);
    if (state.roundNum === 5) {
      dispatch({type: ACTIONS.GAME_OVER});
    } else {
      setTimeout(() => {
        dispatch({type: ACTIONS.CORRECT_GUESS});
        resetTimer();
        startTimer();
      }, 3000);
    }
  }

  const handleSkip = () => {
    stopTimer();
    dispatch({type: ACTIONS.SKIP_POKEMON});
    resetTimer();
    startTimer();
  }
  
  const handleGameOver = () => {
    // Save the score when game ends
    saveScore(state.score, state.lifeNum, state.roundNum);
  };

  return (
    <LinearGradient
      colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
      style={styles.container}
    >
      <Stack.Screen options={{ 
        title: "Home",
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: '#fff',
        headerTransparent: true
      }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.keyboardAvoidingView, { paddingTop: 40 }]}
      >
        <Modal 
          visible={state.modalVisible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>Game Over!</Text>
                <Text style={styles.modalScore}>Final Score: {state.score}</Text>
                <View style={styles.modalButtons}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.modalButtonPressed
                    ]}
                    onPress={() => resetGame()}
                  >
                    <Text style={styles.modalButtonText}>Play Again</Text>
                  </Pressable>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.modalButtonPressed
                    ]}
                    onPress={() => router.push("/")}
                  >
                    <Text style={styles.modalButtonText}>Return Home</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Pokémon...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && gamePokemon.length > 0 && (
          <>
            <View style={styles.gameInfoContainer}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Round</Text>
                  <Text style={styles.infoValue}>{state.roundNum}/5</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Lives</Text>
                  <Text style={styles.infoValue}>{state.lifeNum}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Score</Text>
                  <Text style={styles.infoValue}>{state.score}</Text>
                </View>
              </View>
              
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Time Left</Text>
                <Text style={styles.timerValue}>{time}s</Text>
              </View>
            </View>

            <View style={styles.cardContainer}>
              <View style={styles.pokemonCard}>
                {gamePokemon[state.currentPokemonIndex] && (
                  <Animated.Image
                    source={{ uri: gamePokemon[state.currentPokemonIndex].spriteURL }}
                    style={[
                      state.spriteVisible ? styles.spriteRevealed : styles.pokemonImage,
                      betweenRounds && {
                        transform: [{ translateX: shakeAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: [-10, 10],
                        }) }],
                      },
                    ]}
                    resizeMode="contain"
                  />
                )}
                {betweenRounds && (
                  <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{countdown > 0 ? countdown : ''}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput 
                placeholder="Type your guess..." 
                placeholderTextColor="rgba(128, 112, 136, 0.78)"
                autoCorrect={false}
                value={state.guessText}
                onChangeText={handleGuessChange}
                editable={!betweenRounds}
                style={styles.input} 
                onSubmitEditing={() => {
                  const guess = state.guessText.trim().toLowerCase();
                  const answer = gamePokemon[state.currentPokemonIndex]?.name.toLowerCase();
                  if (guess === answer) {
                    handleCorrectGuess();
                  } else if (guess.length > 0 && !betweenRounds) {
                    // Subtract a life and clear input
                    if (state.lifeNum === 1) {
                      dispatch({type: ACTIONS.GAME_OVER});
                    } else {
                      dispatch({type: ACTIONS.SKIP_POKEMON});
                    }
                  }
                }}
              />
              
              <View style={styles.buttonRow}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.skipButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={handleSkip}
                  disabled={betweenRounds}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </Pressable>

              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
} 

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  gameInfoContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    minWidth: 80,
  },
  infoLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 15,
  },
  timerLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  timerValue: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  pokemonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  spriteHidden: {
    width: width * 0.7,
    height: width * 0.7,
    tintColor: "black",
    opacity: 0.3,
  },
  spriteRevealed: {
    width: width * 0.7,
    height: width * 0.7,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  homeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  skipButtonText: {
    color: '#C2AFF0',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalScore: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalButtonPressed: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  pokemonCard: {
    backgroundColor: CARD_COLOR,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    minHeight: 200,
  },
  pokemonImage: {
    width: 120,
    height: 120,
    opacity: 0.5, // silhouette effect
    tintColor: '#222', // dark silhouette
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 2,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
});