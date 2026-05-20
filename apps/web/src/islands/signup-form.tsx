import { useState, type SyntheticEvent } from 'react';
import { sendVerificationEmail, signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';

type SignupFormProps = {
  locale: Locale;
};

export function SignupForm({ locale }: SignupFormProps) {
  const t = createTranslator(locale);
  const loginPath = localizePath('/login', locale);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signUp.email({
      email,
      password,
      name,
      callbackURL: `${window.location.origin}${loginPath}?verified=1`,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? t('Could not create account'));
      return;
    }
    setDone(true);
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    setResending(true);
    const res = await sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}${loginPath}?verified=1`,
    });
    setResending(false);
    if (res.error) {
      setError(res.error.message ?? t('Could not resend verification email'));
      return;
    }
    setNotice(t('Verification email sent again. Check your inbox.'));
  }

  if (done) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 text-center text-sm duration-300">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{t('Check your email')}</h1>
          <p className="text-muted-foreground">
            {t('We sent a verification link to')}{' '}
            <strong className="text-foreground">{email}</strong>. {t('Verify it, then sign in.')}
          </p>
        </div>
        <Collapse open={!!notice}>
          <p className="text-sm text-muted-foreground">{notice}</p>
        </Collapse>
        <Collapse open={!!error}>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </Collapse>
        <Button type="button" variant="outline" disabled={resending} onClick={resendVerification}>
          {resending ? t('Sending…') : t('Resend verification email')}
        </Button>
        <a
          href={loginPath}
          className="underline-offset-4 transition-colors duration-200 hover:underline"
        >
          {t('Go to sign in')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t('Name')}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('Email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('Password')}</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t('At least 8 characters.')}</p>
      </div>
      <Collapse open={!!error}>
        <p className="pt-1 text-sm text-destructive">{error}</p>
      </Collapse>
      <Button type="submit" disabled={loading}>
        {loading ? t('Creating account…') : t('Create account')}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t('Already registered?')}{' '}
        <a href={loginPath} className="text-foreground underline-offset-4 hover:underline">
          {t('Sign in')}
        </a>
      </p>
    </form>
  );
}
