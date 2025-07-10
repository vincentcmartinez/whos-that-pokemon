import { StyleSheet, Dimensions, Pressable, View, Text, ScrollView, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const LIGHT_GRADIENT: ColorValue[] = ['#9191E9', '#f9fbf2'];
const DARK_GRADIENT: ColorValue[] = ['#2f3061', '#1b180e'];
const ACCENT_GRADIENT: ColorValue[] = ['#C2AFF0', '#9191E9'];

type ScoreRecord = {
  id: string;
  score: number;
  date: string;
  livesRemaining: number;
  roundsCompleted: number;
};

export default function RecordsScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
    loadRecords();
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

  const loadRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem('scoreRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords);
        // Sort by score (highest first)
        const sortedRecords = parsedRecords.sort((a: ScoreRecord, b: ScoreRecord) => b.score - a.score);
        setRecords(sortedRecords);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearRecords = async () => {
    try {
      await AsyncStorage.removeItem('scoreRecords');
      setRecords([]);
    } catch (error) {
      console.error('Error clearing records:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <LinearGradient
      colors={(theme === 'light' ? LIGHT_GRADIENT : DARK_GRADIENT) as [ColorValue, ColorValue]}
      style={styles.container}
    >
      <Stack.Screen options={{ 
        title: "Records",
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: '#fff',
        headerTransparent: true
      }} />
      
      <View style={styles.content}>
        <Text style={styles.title}>High Scores</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No records yet!</Text>
            <Text style={styles.emptySubtext}>Play a game to see your scores here.</Text>
          </View>
        ) : (
          <ScrollView style={styles.recordsContainer} showsVerticalScrollIndicator={false}>
            {records.map((record, index) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                  <Text style={styles.scoreText}>{record.score}</Text>
                </View>
                <View style={styles.recordDetails}>
                  <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                  <Text style={styles.statsText}>
                    Lives: {record.livesRemaining} | Rounds: {record.roundsCompleted}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        
        {records.length > 0 && (
          <Pressable 
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.clearButtonPressed
            ]}
            onPress={clearRecords}
          >
            <Text style={styles.clearButtonText}>Clear All Records</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  recordsContainer: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordDetails: {
    gap: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  statsText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  clearButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 