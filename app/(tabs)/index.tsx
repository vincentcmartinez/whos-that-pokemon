import { StyleSheet } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Stack.Screen options= {{ title: "Home" }} />
      <Text style={styles.title}>Who's That Pokemon?</Text>
      <Button title="Start Game" onPress={() => {router.push('./game')}} />
    </View>
  )
    
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
});
