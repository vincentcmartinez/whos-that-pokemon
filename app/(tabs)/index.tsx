import { StyleSheet, Dimensions, Pressable, View, Text, Switch, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const LIGHT_GRADIENT: ColorValue[] = ['#9191E9', '#f9fbf2'];
const DARK_GRADIENT: ColorValue[] = ['#2f3061', '#1b180e'];
const ACCENT_GRADIENT: ColorValue[] = ['#C2AFF0', '#9191E9']; // yellow gradient

export default function HomeScreen() {
  const router = useRouter();
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadTheme();
    // Check network connectivity
    const checkNetwork = async () => {
      try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon/1', {
          method: 'HEAD',
        });
        setNetworkStatus('online');
      } catch (error) {
        setNetworkStatus('offline');
      }
    };
    checkNetwork();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

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
        headerBackVisible: false,
      }} />
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Who's That</Text>
          <Text style={styles.pokemonTitle}>Pokémon?</Text>
        </View>
        <View style={styles.actionContainer}>
          <View style={styles.buttonContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.startButtonPressed
              ]}
              onPress={() => {router.push({ pathname: './game', params: { theme } })}}
            >
              <LinearGradient
                colors={ACCENT_GRADIENT as [ColorValue, ColorValue]}
                style={styles.buttonGradient}
              >
                <Text style={[styles.buttonText, {color: theme === 'light' ? '#eee' : '#222'}]}>Start Game</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={styles.themeToggleContainer}>
            <Text style={[styles.themeToggleLabel, {color: theme === 'light' ? '#222' : '#eee'}]}>Light</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              thumbColor={theme === 'dark' ? ACCENT_GRADIENT[1] : ACCENT_GRADIENT[0]}
              trackColor={{ false: '#bbb', true: '#C2AFF0' }}
            />
            <Text style={[styles.themeToggleLabel, {color: theme === 'light' ? '#222' : '#eee'}]}>Dark</Text>
          </View>
          <View style={styles.recordsButtonContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.recordsButton,
                pressed && styles.recordsButtonPressed
              ]}
              onPress={() => router.push('./records')}
            >
              <LinearGradient
                colors={[ACCENT_GRADIENT[1], ACCENT_GRADIENT[0]] as [ColorValue, ColorValue]}
                style={styles.recordsButtonGradient}
              >
                <Text style={[styles.recordsButtonText, {color: theme === 'light' ? '#eee' : '#222'}]}>View Records</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={styles.multiplayerButtonContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.multiplayerButton,
                pressed && styles.multiplayerButtonPressed
              ]}
              onPress={() => router.push('./multiplayer')}
            >
              <LinearGradient
                colors={[ACCENT_GRADIENT[0], ACCENT_GRADIENT[1]] as [ColorValue, ColorValue]}
                style={styles.multiplayerButtonGradient}
              >
                <Text style={[styles.multiplayerButtonText, {color: theme === 'light' ? '#eee' : '#222'}]}>Multiplayer</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
        <View style={styles.bottomWarningContainer}>
          {networkStatus === 'offline' && (
            <View style={styles.networkWarning}>
              <Text style={styles.networkWarningText}>
                ⚠️ Offline Mode - Using fallback data
              </Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 100,
    paddingBottom: 50,
  },
  titleContainer: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  pokemonTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    marginTop: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 0,
    gap: 8,
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  networkWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  networkWarningText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    width: width * 0.8,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIconText: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
  },
  bottomWarningContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  recordsButtonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  recordsButton: {
    width: width * 0.4,
    height: 50,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordsButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  recordsButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  multiplayerButtonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  multiplayerButton: {
    width: width * 0.4,
    height: 50,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  multiplayerButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  multiplayerButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplayerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
