import { SIGNUP_MODES } from '@tutor-finance/shared';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function list(name: string): string[] {
  return optional(name)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function oneOf<T extends readonly string[]>(
  name: string,
  values: T,
  fallback: T[number],
): T[number] {
  const raw = optional(name, fallback);
  if ((values as readonly string[]).includes(raw)) return raw as T[number];
  throw new Error(`Invalid ${name}: expected one of ${values.join(', ')}`);
}

const nodeEnv = optional('NODE_ENV', 'development');
const port = num('PORT', num('API_PORT', 3000));
const isProd = nodeEnv === 'production';
const publicAppUrl = optional('PUBLIC_APP_URL', 'http://localhost:4321');
const googleClientId = optional('GOOGLE_CLIENT_ID');
const googleClientSecret = optional('GOOGLE_CLIENT_SECRET');

if ((googleClientId && !googleClientSecret) || (!googleClientId && googleClientSecret)) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together');
}

const emailProvider = oneOf('AUTH_EMAIL_PROVIDER', ['smtp', 'resend'] as const, 'smtp');
const mailFrom = isProd
  ? required('MAIL_FROM')
  : optional('MAIL_FROM', 'Uchetka <noreply@tutor-finance.local>');
const resendApiKey =
  emailProvider === 'resend' ? required('RESEND_API_KEY') : optional('RESEND_API_KEY');

export const env = {
  nodeEnv,
  port,
  databaseUrl: required('DATABASE_URL'),
  betterAuthSecret: required('BETTER_AUTH_SECRET'),
  betterAuthUrl: required('BETTER_AUTH_URL'),
  publicAppUrl,
  trustedOrigins: list('TRUSTED_ORIGINS'),
  mobileSchemes: ['uchetka://', 'uchetka-dev://', 'uchetka-family://'],
  signup: {
    mode: oneOf('AUTH_SIGNUP', SIGNUP_MODES, 'open'),
    allowedEmails: list('AUTH_ALLOWED_EMAILS'),
  },
  emailProvider,
  mailFrom,
  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: num('SMTP_PORT', 1025),
    secure: bool('SMTP_SECURE', false),
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
  },
  resendApiKey,
  authProviders: {
    google:
      googleClientId && googleClientSecret
        ? {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            redirectURI:
              optional('GOOGLE_REDIRECT_URI') || `${publicAppUrl}/api/auth/callback/google`,
            prompt: 'select_account' as const,
            accessType: 'offline' as const,
          }
        : undefined,
  },
  fxApiUrl: optional('FX_API_URL', 'https://open.er-api.com/v6/latest'),
  cache: {
    enabled: bool('CACHE_ENABLED', isProd),
    redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
    dashboardTtlSeconds: num('CACHE_DASHBOARD_TTL_SECONDS', 60),
    dataTtlSeconds: num('CACHE_DATA_TTL_SECONDS', 60),
    fxTtlSeconds: num('CACHE_FX_TTL_SECONDS', 60 * 60 * 6),
  },
  push: {
    enabled: bool('PUSH_NOTIFICATIONS_ENABLED', true),
  },
  ai: {
    openaiApiKey: optional('OPENAI_API_KEY'),
    model: optional('AI_MODEL', 'gpt-6.1-sol'),
    chatEffort: optional('AI_CHAT_EFFORT', 'medium'),
    digestEffort: optional('AI_DIGEST_EFFORT', 'low'),
    digestHour: num('AI_DIGEST_HOUR', 7),
    transcribeModel: optional('AI_TRANSCRIBE_MODEL', 'gpt-transcribe'),
    tokenEncryptionKey: optional('AI_TOKEN_ENCRYPTION_KEY'),
    chatgpt: {
      enabled: bool('AI_CHATGPT_ENABLED', true),
      hostId: optional('CHATGPT_HOST_ID'),
      redirectUri: optional('CHATGPT_REDIRECT_URI', `http://127.0.0.1:${port}/auth/callback`),
      agentName: optional('CHATGPT_AGENT_NAME', 'Uchetka'),
    },
  },
};
