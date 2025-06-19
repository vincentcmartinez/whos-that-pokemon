import { Stack } from 'expo-router';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function GameScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Game" }} />
      <Text style={styles.title}>Guess the Pokémon!</Text>
      <TextInput placeholder="Your guess..." style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20 },
  input: { width: '100%', borderColor: '#aaa', borderWidth: 1, padding: 10, borderRadius: 5 },
});