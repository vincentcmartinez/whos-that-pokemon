import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
  ColorValue
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const LIGHT_GRADIENT: ColorValue[] = ['#9191E9', '#f9fbf2'];
const DARK_GRADIENT: ColorValue[] = ['#2f3061', '#1b180e'];
const ACCENT_GRADIENT: ColorValue[] = ['#C2AFF0', '#9191E9'];

export default function MultiplayerScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const {
    partyCode,
    party,
    isHost,
    isConnected,
    error,
    loading,
    createParty,
    joinParty,
    startGame,
    leaveParty,
    clearError
  } = useMultiplayer();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

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
  useEffect(() => {
    if (party?.status === 'playing') {
      router.push('./multiplayer-game');
    }
  }, [party?.status, router, isConnected]);

  const handleCreateParty = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      await createParty(playerName.trim());
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create party');
    }
  };

  const handleJoinParty = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a party code');
      return;
    }

    try {
      await joinParty(joinCode.trim().toUpperCase(), playerName.trim());
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join party');
    }
  };

  const handleStartGame = async () => {
    try {
      await startGame();

      router.push('./multiplayer-game');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start game');
    }
  };

  const handleLeaveParty = () => {
    Alert.alert(
      'Leave Party',
      'Are you sure you want to leave the party?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leaveParty }
      ]
    );
  };

  if (isConnected && party) {
    return (
      <LinearGradient
        colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
        style={styles.container}
      >
        <Stack.Screen options={{ 
          headerTitle: '',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
          headerTransparent: true,
          headerBackVisible: true,
        }} />
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Multiplayer Lobby</Text>
            <Text style={styles.partyCode}>Party Code: {partyCode}</Text>
          </View>

          <View style={styles.playersContainer}>
            <Text style={styles.sectionTitle}>
              Players ({party.players.length}/5)
            </Text>
            {party.players.map((player, index) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {player.name} {player.isHost ? '(Host)' : ''}
                  </Text>

                </View>
                {player.isHost && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>HOST</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {party.status === 'waiting' ? 'Waiting for players...' : 'Game in progress'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {isHost && party.status === 'waiting' && party.players.length >= 2 && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed
                ]}
                onPress={handleStartGame}
                disabled={loading}
              >
                <LinearGradient
                  colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Start Game</Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}

            {!isHost && party.status === 'waiting' && (
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>
                  Waiting for host to start the game...
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleLeaveParty}
            >
              <LinearGradient
                colors={[ACCENT_GRADIENT[1], ACCENT_GRADIENT[0]] as [ColorValue, ColorValue]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Leave Party</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
      style={styles.container}
    >
              <Stack.Screen options={{ 
          headerTitle: '',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
          headerTransparent: true,
          headerBackVisible: true,
        }} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Multiplayer</Text>
          <Text style={styles.subtitle}>Play with friends!</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={20}
            />
          </View>

          {!showJoinForm ? (
            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed
                ]}
                onPress={handleCreateParty}
                disabled={loading}
              >
                <LinearGradient
                  colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Party</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => setShowJoinForm(true)}
              >
                <LinearGradient
                  colors={[ACCENT_GRADIENT[1], ACCENT_GRADIENT[0]] as [ColorValue, ColorValue]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Join Party</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.joinContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter party code"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  maxLength={6}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={handleJoinParty}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Join</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={() => setShowJoinForm(false)}
                >
                  <LinearGradient
                    colors={[ACCENT_GRADIENT[1], ACCENT_GRADIENT[0]] as [ColorValue, ColorValue]}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  partyCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  secondaryButton: {
    marginTop: 5,
  },
  buttonGradient: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  joinContainer: {
    marginTop: 20,
  },
  playersContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  playerScore: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  hostBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  dismissButton: {
    paddingVertical: 5,
  },
  dismissText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
}); 