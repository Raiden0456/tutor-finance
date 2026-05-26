import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createMailer, type MailerOptions } from './mailer.js';
import { resetPasswordTemplate, verifyEmailTemplate } from './templates.js';

// Caller passes the drizzle table objects so the same instances are shared
// between the adapter and migration generation. Shape matches Better Auth's
// default schema (user/session/account/verification).
export interface AuthSchema {
  user: unknown;
  session: unknown;
  account: unknown;
  verification: unknown;
}

export interface SocialProviderOptions {
  google?: {
    clientId: string;
    clientSecret: string;
    redirectURI?: string;
    prompt?: 'select_account';
  };
}

export interface AuthOptions {
  db: NodePgDatabase<Record<string, unknown>>;
  schema: AuthSchema;
  secret: string;
  baseUrl: string;
  trustedOrigins?: string[];
  email: MailerOptions;
  socialProviders?: SocialProviderOptions;
}

export type AuthInstance = ReturnType<typeof createAuth>;

export function createAuth(opts: AuthOptions) {
  const sendMail = createMailer(opts.email);

  const auth = betterAuth({
    database: drizzleAdapter(opts.db, {
      provider: 'pg',
      schema: opts.schema as unknown as Record<string, unknown>,
    }),
    secret: opts.secret,
    baseURL: opts.baseUrl,
    basePath: '/api/auth',
    trustedOrigins: opts.trustedOrigins ?? [opts.baseUrl],
    socialProviders: opts.socialProviders,
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ['email-password', 'google'],
        allowDifferentEmails: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        const tpl = resetPasswordTemplate({ url });
        await sendMail({ to: user.email, ...tpl });
      },
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const tpl = verifyEmailTemplate({ url });
        await sendMail({ to: user.email, ...tpl });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Cache session in a signed cookie so middleware doesn't hit the DB on
      // every page navigation. Short maxAge keeps it responsive to revocation.
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
  });

  return auth;
}

export type { MailerOptions, SmtpConfig } from './mailer.js';
