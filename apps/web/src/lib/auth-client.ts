import { createAuthClient } from '@tutor-finance/auth/client';
import { BROWSER_API_URL } from './env';

// Auth requests go through the same-origin /api/auth/* proxy on the web app.
// Keeps the session cookie first-party even when API lives on another domain.
export const authClient = createAuthClient({ baseURL: BROWSER_API_URL });
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;
