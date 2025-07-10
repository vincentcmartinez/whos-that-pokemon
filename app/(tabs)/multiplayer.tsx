import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from '../../hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

export default function MultiplayerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  
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

  // Auto-navigate to game screen when game starts
  useEffect(() => {
    if (party?.status === 'playing') {
      router.push('./multiplayer-game');
    }
  }, [party?.status, router]);

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
      // Navigate to multiplayer game screen
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

  const getGradientColors = (): [string, string] => {
    return colorScheme === 'dark' 
      ? ['#4A148C', '#1A1A1A'] 
      : ['#E3F2FD', '#FFFFFF'];
  };

  const getButtonGradientColors = (): [string, string] => {
    return colorScheme === 'dark' 
      ? ['#FFD700', '#FFA500'] 
      : ['#FFD700', '#FFA500'];
  };

  const getSecondaryButtonGradientColors = (): [string, string] => {
    return colorScheme === 'dark' 
      ? ['#FFA500', '#FFD700'] 
      : ['#FFA500', '#FFD700'];
  };

  if (isConnected && party) {
    return (
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>
              Multiplayer Lobby
            </Text>
            <Text style={[styles.partyCode, { color: textColor }]}>
              Party Code: {partyCode}
            </Text>
          </View>

          <View style={styles.playersContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Players ({party.players.length}/5)
            </Text>
            {party.players.map((player, index) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={[styles.playerName, { color: textColor }]}>
                  {player.name} {player.isHost ? '(Host)' : ''}
                </Text>
                <Text style={[styles.playerScore, { color: textColor }]}>
                  Score: {player.score}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: textColor }]}>
              Status: {party.status === 'waiting' ? 'Waiting for players...' : 'Game in progress'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {isHost && party.status === 'waiting' && party.players.length >= 2 && (
              <TouchableOpacity
                style={styles.button}
                onPress={handleStartGame}
                disabled={loading}
              >
                <LinearGradient
                  colors={getButtonGradientColors()}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Start Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!isHost && party.status === 'waiting' && (
              <Text style={[styles.waitingText, { color: textColor }]}>
                Waiting for host to start the game...
              </Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleLeaveParty}
            >
              <LinearGradient
                colors={getSecondaryButtonGradientColors()}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Leave Party</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            Multiplayer
          </Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Play with friends!
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0',
              color: textColor,
              borderColor: colorScheme === 'dark' ? '#555' : '#ddd'
            }]}
            placeholder="Enter your name"
            placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
          />

          {!showJoinForm ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateParty}
                disabled={loading}
              >
                <LinearGradient
                  colors={getButtonGradientColors()}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.buttonText}>Create Party</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => setShowJoinForm(true)}
              >
                <LinearGradient
                  colors={getSecondaryButtonGradientColors()}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Join Party</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.joinContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0',
                  color: textColor,
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd'
                }]}
                placeholder="Enter party code"
                placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
                value={joinCode}
                onChangeText={setJoinCode}
                maxLength={6}
                autoCapitalize="characters"
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleJoinParty}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={getButtonGradientColors()}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.buttonText}>Join</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setShowJoinForm(false)}
                >
                  <LinearGradient
                    colors={getSecondaryButtonGradientColors()}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.8,
  },
  partyCode: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  gradientButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
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
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  playerScore: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
  },
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  dismissText: {
    color: '#ff0000',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
}); 