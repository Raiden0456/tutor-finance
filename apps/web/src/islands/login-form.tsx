import { useEffect, useState, type FormEvent } from 'react';
import { sendVerificationEmail, signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function BrandHero() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <p className="text-2xl font-semibold tracking-tight">Uchetka</p>
      <p className="max-w-[20ch] text-sm opacity-60">
        Track lessons, students &amp; income — all in one place.
      </p>
    </div>
  );
}

function LoginFields({
  email,
  password,
  loading,
  resending,
  error,
  notice,
  showResend,
  onEmail,
  onPassword,
  onResendVerification,
}: {
  email: string;
  password: string;
  loading: boolean;
  resending: boolean;
  error: string | null;
  notice: string | null;
  showResend: boolean;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onResendVerification: () => void;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
      </Field>

      <Field>
        <div className="flex items-center">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <a href="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
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
        <div className="flex flex-col gap-2 pt-1">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          {showResend ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resending}
              onClick={onResendVerification}
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </Button>
          ) : null}
        </div>
      </Collapse>

      <Field>
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Field>

      <FieldDescription className="text-center">
        No account? <a href="/sign-up">Sign up</a>
      </FieldDescription>
    </FieldGroup>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('verified') === '1') {
      setNotice('Email verified. You can sign in now.');
      url.searchParams.delete('verified');
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setShowResend(false);
    setLoading(true);
    const res = await signIn.email({ email, password, callbackURL: '/' });
    setLoading(false);
    if (res.error) {
      const message = res.error.message ?? 'Invalid email or password';
      setError(message);
      setShowResend(message.toLowerCase().includes('verify'));
      return;
    }
    window.location.href = '/';
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    setResending(true);
    const res = await sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/login?verified=1`,
    });
    setResending(false);
    if (res.error) {
      setError(res.error.message ?? 'Could not resend verification email');
      setShowResend(true);
      return;
    }
    setNotice('Verification email sent. Check your inbox.');
    setShowResend(false);
  }

  return (
    <>
      {/* ── Mobile layout: hero top + form sheet bottom ── */}
      <div className="flex min-h-svh flex-col md:hidden">
        {/* Hero section */}
        <div className="flex flex-1 flex-col items-center justify-center bg-[var(--tf-indigo)] px-6 text-white">
          <BrandHero />
        </div>

        {/* Form sheet */}
        <div className=" bg-card px-6 pb-10 pt-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          </div>
          <form onSubmit={onSubmit}>
            <LoginFields
              email={email}
              password={password}
              loading={loading}
              resending={resending}
              error={error}
              notice={notice}
              showResend={showResend}
              onEmail={setEmail}
              onPassword={setPassword}
              onResendVerification={resendVerification}
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
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-sm text-muted-foreground">Sign in to your Uchetka account</p>
                </div>
                <LoginFields
                  email={email}
                  password={password}
                  loading={loading}
                  resending={resending}
                  error={error}
                  notice={notice}
                  showResend={showResend}
                  onEmail={setEmail}
                  onPassword={setPassword}
                  onResendVerification={resendVerification}
                />
              </FieldGroup>
            </form>

            {/* Brand panel */}
            <div className="flex flex-col items-center justify-center bg-[var(--tf-indigo)] p-10 text-white">
              <BrandHero />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
