import { Stack } from 'expo-router';

import { useSession } from '@/context/session';

export default function AppLayout() {
  const { tenant } = useSession();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: tenant?.name ?? 'T-Plan' }} />
    </Stack>
  );
}
