import { Stack } from 'expo-router';
import { ConsentSheetHost } from '~/components/assistant/consent-sheet';

export default function AppStackLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lessons/[id]" />
        <Stack.Screen name="students/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="assistant/index" />
        <Stack.Screen name="assistant/[threadId]" />
      </Stack>
      <ConsentSheetHost />
    </>
  );
}
