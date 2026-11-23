import Constants from 'expo-constants';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { api, ApiError, type User } from '@/lib/api';
import { getItem, setItem } from '@/lib/storage';
import { resolveTenant, type Tenant } from '@/lib/tenant';

const TENANT_KEY = 'tplan.tenant';
const TOKEN_KEY = 'tplan.token';
const EMAIL_KEY = 'tplan.email';

type SessionContextValue = {
  isLoading: boolean;
  tenant: Tenant | null;
  token: string | null;
  user: User | null;
  /** Zadnja vnesena e-pošta (za predizpolnitev prijave). */
  email: string;
  rememberEmail: (email: string) => Promise<void>;
  /** Preveri naslov podjetja in ga shrani. */
  selectTenant: (input: string) => Promise<Tenant>;
  /** Pozabi podjetje (in odjavi uporabnika). */
  clearTenant: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession mora biti znotraj <SessionProvider />');
  return value;
}

function deviceName() {
  return `${Constants.deviceName ?? 'Mobilna naprava'} (${Platform.OS})`;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');

  // Ob zagonu naloži shranjeno podjetje in žeton ter preveri, ali žeton še velja.
  useEffect(() => {
    (async () => {
      try {
        const [rawTenant, storedToken, storedEmail] = await Promise.all([
          getItem(TENANT_KEY),
          getItem(TOKEN_KEY),
          getItem(EMAIL_KEY),
        ]);
        const storedTenant: Tenant | null = rawTenant ? JSON.parse(rawTenant) : null;
        setTenant(storedTenant);
        setEmail(storedEmail ?? '');

        if (storedTenant && storedToken) {
          setToken(storedToken);
          try {
            setUser(await api.me(storedTenant.baseUrl, storedToken));
          } catch (e) {
            // 401: žeton je preklican ali potekel. Ob napaki omrežja uporabnika ne odjavimo.
            if (e instanceof ApiError && e.status === 401) {
              setToken(null);
              await setItem(TOKEN_KEY, null);
            }
          }
        }
      } catch {
        // pokvarjeni shranjeni podatki: začnemo znova
        await Promise.all([setItem(TENANT_KEY, null), setItem(TOKEN_KEY, null)]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const rememberEmail = useCallback(async (value: string) => {
    const trimmed = value.trim();
    setEmail(trimmed);
    await setItem(EMAIL_KEY, trimmed || null);
  }, []);

  const selectTenant = useCallback(async (input: string) => {
    const resolved = await resolveTenant(input);
    await setItem(TENANT_KEY, JSON.stringify(resolved));
    setTenant(resolved);
    return resolved;
  }, []);

  const signOut = useCallback(async () => {
    if (tenant && token) {
      // Žeton prekličemo na strežniku, a odjava lokalno uspe tudi brez povezave.
      api.logout(tenant.baseUrl, token).catch(() => {});
    }
    await setItem(TOKEN_KEY, null);
    setToken(null);
    setUser(null);
  }, [tenant, token]);

  const clearTenant = useCallback(async () => {
    await signOut();
    await setItem(TENANT_KEY, null);
    setTenant(null);
  }, [signOut]);

  const signIn = useCallback(
    async (loginEmail: string, password: string) => {
      if (!tenant) throw new ApiError('Najprej izberite podjetje.', 0);
      const result = await api.login(tenant.baseUrl, loginEmail.trim(), password, deviceName());
      await setItem(TOKEN_KEY, result.token);
      await rememberEmail(loginEmail);
      setUser(result.user);
      setToken(result.token);
    },
    [tenant, rememberEmail],
  );

  const value = useMemo(
    () => ({
      isLoading,
      tenant,
      token,
      user,
      email,
      rememberEmail,
      selectTenant,
      clearTenant,
      signIn,
      signOut,
    }),
    [isLoading, tenant, token, user, email, rememberEmail, selectTenant, clearTenant, signIn, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
