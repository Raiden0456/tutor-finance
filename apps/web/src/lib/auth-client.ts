import { createAuthClient } from '@tutor-finance/auth/client';
import { PUBLIC_API_URL } from './env';

export const authClient = createAuthClient({ baseURL: PUBLIC_API_URL });
export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } =
  authClient;
