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

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: num('PORT', num('API_PORT', 3000)),
  databaseUrl: required('DATABASE_URL'),
  betterAuthSecret: required('BETTER_AUTH_SECRET'),
  betterAuthUrl: required('BETTER_AUTH_URL'),
  publicAppUrl: optional('PUBLIC_APP_URL', 'http://localhost:4321'),
  trustedOrigins: optional('TRUSTED_ORIGINS', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  emailProvider: optional('AUTH_EMAIL_PROVIDER', 'smtp') as 'smtp' | 'resend',
  mailFrom: optional('MAIL_FROM', 'Uchetka <noreply@tutor-finance.local>'),
  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: num('SMTP_PORT', 1025),
    secure: bool('SMTP_SECURE', false),
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
  },
  resendApiKey: optional('RESEND_API_KEY'),
  fxApiUrl: optional('FX_API_URL', 'https://api.exchangerate.host/latest'),
  cache: {
    enabled: bool('CACHE_ENABLED', true),
    redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
    dashboardTtlSeconds: num('CACHE_DASHBOARD_TTL_SECONDS', 60),
    fxTtlSeconds: num('CACHE_FX_TTL_SECONDS', 60 * 60 * 6),
  },
};
