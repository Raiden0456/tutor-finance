import { createAuth, type AuthInstance } from '@tutor-finance/auth';
import { getDb } from '../db/client.js';
import { authSchema } from '../db/schema.js';
import { env } from '../config.js';

let cached: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (cached) return cached;
  cached = createAuth({
    db: getDb(),
    schema: authSchema,
    secret: env.betterAuthSecret,
    baseUrl: env.betterAuthUrl,
    trustedOrigins: [env.betterAuthUrl, env.publicAppUrl, ...env.trustedOrigins],
    email: {
      provider: env.emailProvider,
      from: env.mailFrom,
      smtp: env.smtp,
      resendApiKey: env.resendApiKey,
    },
  });
  return cached;
}

export const auth = getAuth();
export type Auth = AuthInstance;
