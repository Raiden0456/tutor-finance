import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { GoogleAuthSection } from './google-auth-button';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';

type LoginFormProps = {
  locale: Locale;
};

function LoginHeroImage({ alt }: { alt: string }) {
  return (
    <img
      src="/login-hero.svg"
      alt={alt}
      className="h-auto w-full max-w-md select-none transition-transform duration-300 ease-in-out hover:scale-[1.02]"
      draggable={false}
    />
  );
}

function LoginFields({
  email,
  password,
  loading,
  error,
  notice,
  locale,
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  locale: Locale;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
}) {
  const t = createTranslator(locale);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder={t('you@example.com')}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
      </Field>

      <Field>
        <div className="flex items-center">
          <FieldLabel htmlFor="password">{t('Password')}</FieldLabel>
          <a
            href={localizePath('/forgot-password', locale)}
            className="ml-auto text-sm underline-offset-4 hover:underline"
          >
            {t('Forgot password?')}
          </a>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
      </Field>

      <Collapse open={!!notice}>
        <p className="pt-1 text-sm text-muted-foreground">{notice}</p>
      </Collapse>

      <Collapse open={!!error}>
        <p role="alert" className="pt-1 text-sm text-destructive">
          {error}
        </p>
      </Collapse>

      <Field>
        <Button type="submit" disabled={loading}>
          {loading ? t('Signing in…') : t('Sign in')}
        </Button>
      </Field>

      <FieldDescription className="text-center">
        {t('No account?')} <a href={localizePath('/sign-up', locale)}>{t('Sign up')}</a>
      </FieldDescription>
    </FieldGroup>
  );
}

export function LoginForm({ locale }: LoginFormProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const loginPath = localizePath('/', locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.get('verified') === '1') {
      setNotice(t('Email verified. You can sign in now.'));
      url.searchParams.delete('verified');
      changed = true;
    }
    if (url.searchParams.get('oauth_error') === 'google') {
      setError(t('Could not sign in with Google'));
      url.searchParams.delete('oauth_error');
      changed = true;
    }
    if (changed) window.history.replaceState(null, '', url.toString());
  }, [t]);

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const res = await signIn.email({ email, password, callbackURL: loginPath });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? t('Invalid email or password'));
      return;
    }
    window.location.href = loginPath;
  }

  return (
    <>
      {/* ── Mobile layout: hero top + form sheet bottom ── */}
      <div className="flex min-h-svh flex-col md:hidden">
        {/* Hero section */}
        <div className="flex flex-1 flex-col items-center justify-center bg-[var(--tf-indigo)] px-6 text-white">
          <div className="w-full max-w-sm">
            <LoginHeroImage alt={t('Uchetka dashboard preview')} />
          </div>
        </div>

        {/* Form sheet */}
        <div className=" bg-card px-6 pb-10 pt-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold">{t('Welcome back')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('Sign in to your account')}</p>
          </div>
          <form onSubmit={onSubmit}>
            <LoginFields
              email={email}
              password={password}
              loading={loading}
              error={error}
              notice={notice}
              locale={locale}
              onEmail={setEmail}
              onPassword={setPassword}
            />
            <GoogleAuthSection
              className="mt-5"
              locale={locale}
              callbackURL={loginPath}
              errorCallbackURL={`${localizePath('/login', locale)}?oauth_error=google`}
              onError={setError}
            />
          </form>
        </div>
      </div>

      {/* ── Desktop layout: two-column card, centered ── */}
      <div className="hidden min-h-svh items-center justify-center px-4 md:flex">
        <Card className="w-full max-w-3xl overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={onSubmit} className="p-8">
              <FieldGroup>
                <div className="mb-2 flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">{t('Welcome back')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('Sign in to your Uchetka account')}
                  </p>
                </div>
                <LoginFields
                  email={email}
                  password={password}
                  loading={loading}
                  error={error}
                  notice={notice}
                  locale={locale}
                  onEmail={setEmail}
                  onPassword={setPassword}
                />
                <GoogleAuthSection
                  locale={locale}
                  callbackURL={loginPath}
                  errorCallbackURL={`${localizePath('/login', locale)}?oauth_error=google`}
                  onError={setError}
                />
              </FieldGroup>
            </form>

            {/* Brand panel */}
            <div className="flex flex-col items-center justify-center bg-[var(--tf-indigo)] p-4 text-white">
              <LoginHeroImage alt={t('Uchetka dashboard preview')} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
