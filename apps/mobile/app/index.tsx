import { Redirect } from 'expo-router';

// The auth gate in the root layout bounces unauthenticated users to /(auth).
export default function Index() {
  return <Redirect href="/(app)" />;
}
