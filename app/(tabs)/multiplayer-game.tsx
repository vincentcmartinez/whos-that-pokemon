import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useRef, useState, useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View, Dimensions, KeyboardAvoidingView, Platform, ColorValue, Animated, ScrollView } from 'react-native';
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
      const newStateCorrect = {...state,
        currentPokemonIndex: state.currentPokemonIndex + 1,
        spriteVisible: false,
        roundNum: state.roundNum + 1,
        guessText: ""
      };
      // Check for game over after state update
      if (newStateCorrect.roundNum >= 5) {
        return {...newStateCorrect, modalVisible: true};
      }
      return newStateCorrect;
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

export default function MultiplayerGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const {gamePokemon, loading, error, loadPokemon, clearPokemon, setPokemonFromServer} = usePokemon();
  const { party, updateScore, finishGame, endParty, leaveParty, isConnected, partyCode } = useMultiplayer();

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
  const [gameFinished, setGameFinished] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Update score to server and save locally when game ends
  useEffect(() => {
    if (state.modalVisible && !gameFinished) {
      setGameFinished(true);
      // Finish game on server
      if (party) {
        finishGame(state.score, state.lifeNum, state.roundNum).catch(console.error);
      }
      
      // Save score locally
      saveScore(state.score, state.lifeNum, state.roundNum);
    }
  }, [state.modalVisible, party, finishGame, gameFinished]);



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
      if (party?.pokemonList && party.pokemonList.length > 0 && gamePokemon.length === 0) {
        // Use Pokémon list from server only if we don't have Pokemon loaded
        console.log('Loading Pokemon from server:', party.pokemonList.length);
        setPokemonFromServer(party.pokemonList);
        resetGame();
      }
    }, [party, setPokemonFromServer, gamePokemon.length])
  );

  const resetGame = () => {
    if (!party?.pokemonList && gamePokemon.length === 0) {
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
    // Clear multiplayer state when returning home
    leaveParty();
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
  const allPlayersFinished = party?.players?.every((p: any) => p.finished);
  const gameResult = party?.gameResult;



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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={[styles.keyboardAvoidingView, { paddingTop: 40 }]}
      >
        <Modal 
          visible={state.modalVisible || (gameFinished && allPlayersFinished)}
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
                
                {!allPlayersFinished ? (
                  <Text style={styles.waitingText}>Waiting for all players to finish...</Text>
                ) : gameResult ? (
                  <View style={styles.winnerContainer}>
                    {gameResult.winner ? (
                      <Text style={styles.winnerText}>Winner: {gameResult.winner.name} ({gameResult.winner.finalScore} points)</Text>
                    ) : gameResult.tiedPlayers ? (
                      <View>
                        <Text style={styles.winnerText}>It's a tie!</Text>
                        {gameResult.tiedPlayers.map((player: any, index: number) => (
                          <Text key={index} style={styles.tieText}>{player.name} ({player.finalScore} points)</Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
                
                <View style={styles.modalButtons}>
                  {allPlayersFinished ? (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.modalButtonPressed
                      ]}
                      onPress={handleReturnHome}
                    >
                      <Text style={styles.modalButtonText}>Return Home</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.modalButtonPressed
                      ]}
                      onPress={handleReturnHome}
                    >
                      <Text style={styles.modalButtonText}>Return Home</Text>
                    </Pressable>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {!loading && gamePokemon.length > 0 && (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                {currentPokemon && (
                  <Animated.Image
                    source={{ uri: currentPokemon.spriteURL }}
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
                  const answer = currentPokemon?.name.toLowerCase();
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
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  cardContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  pokemonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 200,
    position: 'relative',
    // Remove shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  pokemonImage: {
    width: 120,
    height: 120,
    opacity: 0.5,
    tintColor: '#222',
  },
  spriteRevealed: {
    width: 120,
    height: 120,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.0)',
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
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 20,
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
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalScore: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  winnerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tieText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonPressed: {
    opacity: 0.7,
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 