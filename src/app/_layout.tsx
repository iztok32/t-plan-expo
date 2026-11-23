import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/context/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <RootNavigator />
      <StatusBar style="auto" />
    </SessionProvider>
  );
}

function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) SplashScreen.hide();
  return null;
}

/**
 * Tok: izbira podjetja -> prijava -> aplikacija.
 * Vse poti so vedno definirane; guard določa, katera je dostopna.
 */
function RootNavigator() {
  const { tenant, token } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!tenant && !!token}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!!tenant && !token}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      <Stack.Protected guard={!tenant}>
        <Stack.Screen name="company" />
      </Stack.Protected>
    </Stack>
  );
}
