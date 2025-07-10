import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useRef, useState, useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View, Dimensions, KeyboardAvoidingView, Platform, ColorValue, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePokemon } from '../../hooks/usePokemon';
import { useTimer } from '../../hooks/useTimer';
import { useMultiplayer } from '../../hooks/useMultiplayer';

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
    case 'updateScore':
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

export default function MultiplayerGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const {gamePokemon, loading, error, loadPokemon, clearPokemon, setPokemonFromServer} = usePokemon();
  const { party, updateScore, endParty } = useMultiplayer();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark');
      } else {
        setTheme('light');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setTheme('light');
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
        mode: 'multiplayer'
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

  // Update score to server and save locally when game ends
  useEffect(() => {
    if (state.modalVisible) {
      // Update score to server
      if (party) {
        updateScore(state.score, state.lifeNum, state.roundNum).catch(console.error);
      }
      
      // Save score locally
      saveScore(state.score, state.lifeNum, state.roundNum);
    }
  }, [state.modalVisible, party, updateScore]);

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

  useFocusEffect(
    useCallback(() => {
      if (party?.pokemonList && party.pokemonList.length > 0) {
        // Use Pokémon list from server
        setPokemonFromServer(party.pokemonList);
        resetGame();
      }
    }, [party, setPokemonFromServer])
  );

  const resetGame = () => {
    if (!party?.pokemonList) {
      clearPokemon();
      loadPokemon(9, GENS);
    }
    dispatch({type: ACTIONS.RESET});
    stopTimer();
    resetTimer();
    startTimer();
  }

  const handleGuessChange = (text: string) => {
    dispatch({type: ACTIONS.UPDATE_GUESS_TEXT, payload: text});
    if (text.trim().toLowerCase() === gamePokemon[state.currentPokemonIndex]?.name.toLowerCase()) {
      handleCorrectGuess();
    }
  };

  const handleCorrectGuess = () => {
    stopTimer();
    const points = Math.max(1, Math.floor(time / 3));
    dispatch({type: ACTIONS.UPDATE_SCORE, payload: points});
    dispatch({type: ACTIONS.REVEAL_SPRITE});
    
    // Update score to server immediately
    if (party) {
      updateScore(state.score + points, state.lifeNum, state.roundNum).catch(console.error);
    }

    setBetweenRounds(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setBetweenRounds(false);
          dispatch({type: ACTIONS.CORRECT_GUESS});
          startTimer();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    startShake();
  };

  const handleSkip = () => {
    stopTimer();
    dispatch({type: ACTIONS.SKIP_POKEMON});
    resetTimer();
    startTimer();
  };

  const handleGameOver = async () => {
    try {
      if (party) {
        await endParty();
      }
      router.push('./multiplayer');
    } catch (error) {
      console.error('Error ending party:', error);
      router.push('./multiplayer');
    }
  };

  const handleReturnHome = () => {
    router.push('./');
  };

  if (!party) {
    return (
      <LinearGradient
        colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme === 'light' ? '#222' : '#fff' }]}>
            Not connected to a party
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push('./multiplayer')}
          >
            <LinearGradient
              colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Return to Multiplayer</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient
        colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: theme === 'light' ? '#222' : '#fff' }]}>
            Loading Pokémon...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme === 'light' ? '#222' : '#fff' }]}>
            {error}
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push('./multiplayer')}
          >
            <LinearGradient
              colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Return to Multiplayer</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const currentPokemon = gamePokemon[state.currentPokemonIndex];

  return (
    <LinearGradient
      colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
      style={styles.container}
    >
      <Stack.Screen options={{ 
        headerTitle: 'Multiplayer Game',
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: theme === 'light' ? '#222' : '#fff',
        headerTransparent: true,
        headerBackVisible: false,
      }} />

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: theme === 'light' ? '#222' : '#fff' }]}>
              Score: {state.score}
            </Text>
            <Text style={[styles.livesText, { color: theme === 'light' ? '#222' : '#fff' }]}>
              Lives: {state.lifeNum}
            </Text>
          </View>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: theme === 'light' ? '#222' : '#fff' }]}>
              {time}s
            </Text>
          </View>
        </View>

        <View style={styles.gameContainer}>
          <View style={styles.pokemonContainer}>
            <View style={[styles.pokemonCard, { backgroundColor: CARD_COLOR }]}>
              {currentPokemon && (
                <Image
                  source={{ uri: currentPokemon.spriteURL }}
                  style={[
                    styles.pokemonSprite,
                    state.spriteVisible ? styles.visibleSprite : styles.hiddenSprite
                  ]}
                />
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.guessInput,
                { 
                  backgroundColor: theme === 'dark' ? '#333' : '#f0f0f0',
                  color: theme === 'light' ? '#222' : '#fff',
                  borderColor: theme === 'dark' ? '#555' : '#ddd'
                }
              ]}
              placeholder="Enter Pokémon name..."
              placeholderTextColor={theme === 'dark' ? '#aaa' : '#666'}
              value={state.guessText}
              onChangeText={handleGuessChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!betweenRounds}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={betweenRounds}
            >
              <LinearGradient
                colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                style={styles.skipButtonGradient}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {betweenRounds && (
          <View style={styles.countdownContainer}>
            <Animated.View
              style={[
                styles.countdownBox,
                {
                  transform: [{
                    translateX: shakeAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-10, 10]
                    })
                  }]
                }
              ]}
            >
              <Text style={[styles.countdownText, { color: theme === 'light' ? '#222' : '#fff' }]}>
                {countdown}
              </Text>
            </Animated.View>
          </View>
        )}

        <Modal
          visible={state.modalVisible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme === 'dark' ? '#333' : '#fff' }]}>
              <Text style={[styles.modalTitle, { color: theme === 'light' ? '#222' : '#fff' }]}>
                Game Over!
              </Text>
              <Text style={[styles.modalScore, { color: theme === 'light' ? '#222' : '#fff' }]}>
                Final Score: {state.score}
              </Text>
              <Text style={[styles.modalLives, { color: theme === 'light' ? '#222' : '#fff' }]}>
                Lives Remaining: {state.lifeNum}
              </Text>
              <Text style={[styles.modalRounds, { color: theme === 'light' ? '#222' : '#fff' }]}>
                Rounds Completed: {state.roundNum}
              </Text>
              
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalButton}
                  onPress={handleGameOver}
                >
                  <LinearGradient
                    colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>End Game</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  livesText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pokemonContainer: {
    marginBottom: 40,
  },
  pokemonCard: {
    width: 200,
    height: 200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pokemonSprite: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  visibleSprite: {
    opacity: 1,
  },
  hiddenSprite: {
    opacity: 0.1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  guessInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  skipButton: {
    width: 120,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  skipButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  countdownBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalLives: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalRounds: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 