import { StyleSheet, Text, View } from 'react-native';

import { Button, colors } from '@/components/ui';
import { useSession } from '@/context/session';

export default function HomeScreen() {
  const { user, tenant, signOut } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pozdravljeni{user ? `, ${user.name}` : ''}</Text>
      <Text style={styles.muted}>{user?.email}</Text>
      <Text style={styles.muted}>{tenant?.baseUrl}</Text>
      <View style={styles.actions}>
        <Button title="Odjava" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  actions: { marginTop: 24 },
});
