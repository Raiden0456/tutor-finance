import { useEffect, useState, type SyntheticEvent } from 'react';
import { requestPasswordReset, sendVerificationEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';

const RESEND_COOLDOWN_SECONDS = 60;

type ForgotPasswordFormProps = {
  locale: Locale;
};

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = createTranslator(locale);
  const loginPath = localizePath('/login', locale);
  const resetPasswordPath = localizePath('/reset-password', locale);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!done || cooldown <= 0) return;

    const timeout = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown, done]);

  async function sendResetLink(nextNotice: string | null) {
    setError(null);
    setNotice(null);
    setLoading(true);
    const res = await requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}${resetPasswordPath}`,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? t('Could not send reset email'));
      return;
    }
    setDone(true);
    setNotice(nextNotice);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendResetLink(null);
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    setVerifying(true);
    const res = await sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}${loginPath}?verified=1`,
    });
    setVerifying(false);
    if (res.error) {
      setError(res.error.message ?? t('Could not send verification email'));
      return;
    }
    setNotice(t('Verification link sent. Check your inbox.'));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (done) {
    const busy = loading || verifying;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 text-center text-sm duration-300">
        <p>
          {t('If an account exists for')} <strong>{email}</strong>,{' '}
          {t('a reset link has been sent.')}
        </p>
        <Collapse open={!!notice}>
          <p className="text-sm text-muted-foreground">{notice}</p>
        </Collapse>
        <Collapse open={!!error}>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </Collapse>
        <Collapse open={cooldown > 0}>
          <p className="text-sm text-muted-foreground">
            {t('You can request another link in {seconds}s.', { seconds: cooldown })}
          </p>
        </Collapse>
        <Collapse open={cooldown === 0}>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => sendResetLink(t('Reset link sent again. Check your inbox.'))}
            >
              {loading ? t('Sending…') : t('Resend reset link')}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={resendVerification}>
              {verifying ? t('Sending…') : t('Send verification link')}
            </Button>
          </div>
        </Collapse>
        <a
          href={loginPath}
          className="underline-offset-4 transition-colors duration-200 hover:underline"
        >
          {t('Back to sign in')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('Email')}</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Collapse open={!!error}>
        <p className="pt-1 text-sm text-destructive">{error}</p>
      </Collapse>
      <Button type="submit" disabled={loading}>
        {loading ? t('Sending…') : t('Send reset link')}
      </Button>
      <a href={loginPath} className="text-center text-sm underline-offset-4 hover:underline">
        {t('Back to sign in')}
      </a>
    </form>
  );
}
