import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, FormError } from '@/components/ui';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api';

export default function SignInScreen() {
  const { tenant, email: rememberedEmail, signIn, clearTenant } = useSession();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setErrors({});
    setFormError(null);

    const local: Record<string, string> = {};
    if (!email.trim()) local.email = 'Vnesite e-poštni naslov.';
    if (!password) local.password = 'Vnesite geslo.';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // guard v _layout.tsx samodejno preusmeri v aplikacijo
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.errors).length) {
        // Laravel validacijske napake: { email: ['...'], password: ['...'] }
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
      } else {
        setFormError(e instanceof ApiError ? e.message : 'Prijava ni uspela.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Prijava</Text>
            <Text style={styles.company}>{tenant?.name}</Text>
            <Text style={styles.subtitle}>{tenant?.baseUrl.replace(/^https?:\/\//, '')}</Text>
          </View>

          <Field
            label="E-pošta"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            ref={passwordRef}
            label="Geslo"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <FormError>{formError}</FormError>
          <Button title="Prijava" onPress={submit} loading={loading} />
          <Button title="Zamenjaj podjetje" variant="link" onPress={clearTenant} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  company: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 14, color: colors.muted },
});
