import { useEffect, useState, type FormEvent } from 'react';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

function LoginHeroImage() {
  return (
    <img
      src="/login-hero.svg"
      alt="Uchetka dashboard preview"
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
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    const res = await signIn.email({ email, password, callbackURL: '/' });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? 'Invalid email or password');
      return;
    }
    window.location.href = '/';
  }

  return (
    <>
      {/* ── Mobile layout: hero top + form sheet bottom ── */}
      <div className="flex min-h-svh flex-col md:hidden">
        {/* Hero section */}
        <div className="flex flex-1 flex-col items-center justify-center bg-[var(--tf-indigo)] px-6 text-white">
          <div className="w-full max-w-sm">
            <LoginHeroImage />
          </div>
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
              error={error}
              notice={notice}
              onEmail={setEmail}
              onPassword={setPassword}
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
                  error={error}
                  notice={notice}
                  onEmail={setEmail}
                  onPassword={setPassword}
                />
              </FieldGroup>
            </form>

            {/* Brand panel */}
            <div className="flex flex-col items-center justify-center bg-[var(--tf-indigo)] p-4 text-white">
              <LoginHeroImage />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
