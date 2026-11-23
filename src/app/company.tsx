import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, FormError } from '@/components/ui';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api';
import { directoryEnabled, lookupTenants, type DirectoryTenant } from '@/lib/directory';

type Mode = 'email' | 'url';

/**
 * Prvi korak: poišči podjetje.
 * - Privzeto po e-pošti prek imenika podjetij (t-plan-imenik).
 * - Rezervno z ročnim vnosom URL naslova namestitve.
 */
export default function CompanyScreen() {
  const { email: rememberedEmail, rememberEmail, selectTenant } = useSession();
  const [mode, setMode] = useState<Mode>(directoryEnabled ? 'email' : 'url');
  const [email, setEmail] = useState(rememberedEmail);
  const [address, setAddress] = useState('');
  const [matches, setMatches] = useState<DirectoryTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function errorMessage(e: unknown, fallback: string) {
    return e instanceof ApiError ? e.message : fallback;
  }

  async function chooseTenant(baseUrl: string) {
    setError(null);
    setLoading(true);
    try {
      // Preveri, da namestitev deluje; guard v _layout.tsx nato preusmeri na prijavo.
      await selectTenant(baseUrl);
    } catch (e) {
      setError(errorMessage(e, 'Povezava s podjetjem ni uspela.'));
    } finally {
      setLoading(false);
    }
  }

  async function submitEmail() {
    setError(null);
    setMatches(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Vnesite veljaven e-poštni naslov.');
      return;
    }

    setLoading(true);
    try {
      await rememberEmail(email);
      const tenants = await lookupTenants(email);
      if (tenants.length === 1) {
        await selectTenant(tenants[0].base_url);
        return;
      }
      if (tenants.length === 0) {
        setError(
          'Za ta e-poštni naslov nismo našli podjetja. Preverite naslov ali vnesite URL podjetja ročno.',
        );
        return;
      }
      setMatches(tenants);
    } catch (e) {
      setError(errorMessage(e, 'Iskanje podjetja ni uspelo.'));
    } finally {
      setLoading(false);
    }
  }

  async function submitUrl() {
    if (email.trim()) await rememberEmail(email);
    await chooseTenant(address);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMatches(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>T-Plan</Text>
            <Text style={styles.subtitle}>
              {mode === 'email'
                ? 'Vnesite službeni e-poštni naslov. Poiskali bomo vaše podjetje.'
                : 'Vnesite naslov, ki ga uporabljate za t-plan v brskalniku.'}
            </Text>
          </View>

          {mode === 'email' ? (
            <>
              <Field
                label="E-pošta"
                placeholder="ime.priimek@podjetje.si"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setMatches(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={submitEmail}
              />
              <FormError>{error}</FormError>

              {matches ? (
                <View style={styles.list}>
                  <Text style={styles.listTitle}>Izberite podjetje</Text>
                  {matches.map((t) => (
                    <Pressable
                      key={t.base_url}
                      onPress={() => chooseTenant(t.base_url)}
                      disabled={loading}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
                      <Text style={styles.itemName}>{t.name}</Text>
                      <Text style={styles.itemUrl}>{t.base_url.replace(/^https?:\/\//, '')}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Button title="Nadaljuj" onPress={submitEmail} loading={loading} />
              )}

              <Button
                title="Vnesi naslov podjetja ročno"
                variant="link"
                onPress={() => switchMode('url')}
              />
            </>
          ) : (
            <>
              <Field
                label="Naslov podjetja"
                placeholder="podjetje.t-plan.si"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                textContentType="URL"
                returnKeyType="go"
                onSubmitEditing={submitUrl}
              />
              <FormError>{error}</FormError>
              <Button title="Nadaljuj" onPress={submitUrl} loading={loading} />
              {directoryEnabled && (
                <Button
                  title="Poišči podjetje po e-pošti"
                  variant="link"
                  onPress={() => switchMode('email')}
                />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { gap: 8, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted },
  list: { gap: 8 },
  listTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.card,
    gap: 2,
  },
  itemPressed: { backgroundColor: '#eff6ff', borderColor: colors.primary },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemUrl: { fontSize: 13, color: colors.muted },
});
