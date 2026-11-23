import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Varna hramba ključ/vrednost.
 * Na iOS/Android uporablja SecureStore (Keychain / Keystore), na spletu localStorage.
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
    } catch {
      // zasebno okno ali blokirana hramba: sejo obdržimo le v pomnilniku
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
