import { Stack } from 'expo-router';

// Stack above the bottom tabs so detail screens (lessons/[id], students/[id])
// push OVER the tabs from any tab and "back" returns to wherever you came from
// (instead of being trapped inside a single tab's stack).
export default function AppStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lessons/[id]" />
      <Stack.Screen name="students/[id]" />
    </Stack>
  );
}
