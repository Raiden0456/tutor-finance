import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { createMailer, type MailerOptions } from './mailer.js';
import { resetPasswordTemplate, verifyEmailTemplate } from './templates.js';

export interface AuthOptions {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  trustedOrigins?: string[];
  email: MailerOptions;
}

export type AuthInstance = ReturnType<typeof createAuth>;

export function createAuth(opts: AuthOptions) {
  const client = new MongoClient(opts.databaseUrl);
  const db = client.db();
  const sendMail = createMailer(opts.email);

  const auth = betterAuth({
    database: mongodbAdapter(db, { client }),
    secret: opts.secret,
    baseURL: opts.baseUrl,
    trustedOrigins: opts.trustedOrigins ?? [opts.baseUrl],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        const tpl = resetPasswordTemplate({ url });
        await sendMail({ to: user.email, ...tpl });
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const tpl = verifyEmailTemplate({ url });
        await sendMail({ to: user.email, ...tpl });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });

  return auth;
}

export type { MailerOptions, SmtpConfig } from './mailer.js';
