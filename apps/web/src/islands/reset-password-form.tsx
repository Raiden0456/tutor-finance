import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { resetPassword } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';

type ResetPasswordFormProps = {
  locale: Locale;
};

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const loginPath = localizePath('/login', locale);
  const forgotPasswordPath = localizePath('/forgot-password', locale);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const tokenParam = url.searchParams.get('token');
    const errorParam = url.searchParams.get('error');
    setToken(tokenParam);
    if (errorParam) {
      setError(t('This reset link is invalid or expired. Request a new one.'));
    } else if (!tokenParam) {
      setError(t('Missing reset token. Use the link from your email.'));
    }
  }, [t]);

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError(t('Missing or invalid reset token'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('Passwords do not match'));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? t('Could not reset password'));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 text-center text-sm duration-300">
        <p>{t('Password updated. You can now sign in.')}</p>
        <a href={loginPath} className="underline-offset-4 hover:underline">
          {t('Go to sign in')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('New password')}</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{t('Confirm password')}</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <Collapse open={!!error}>
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-sm text-destructive">{error}</p>
          {!token ? (
            <a
              href={forgotPasswordPath}
              className="text-sm underline-offset-4 transition-colors duration-200 hover:underline"
            >
              {t('Request a new reset link')}
            </a>
          ) : null}
        </div>
      </Collapse>
      <Button type="submit" disabled={loading || !token}>
        {loading ? t('Updating…') : t('Update password')}
      </Button>
    </form>
  );
}
