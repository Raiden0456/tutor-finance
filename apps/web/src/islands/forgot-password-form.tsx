import { useEffect, useState, type FormEvent } from 'react';
import { requestPasswordReset, sendVerificationEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
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
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? 'Could not send reset email');
      return;
    }
    setDone(true);
    setNotice(nextNotice);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendResetLink(null);
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    setVerifying(true);
    const res = await sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/login?verified=1`,
    });
    setVerifying(false);
    if (res.error) {
      setError(res.error.message ?? 'Could not send verification email');
      return;
    }
    setNotice('Verification link sent. Check your inbox.');
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (done) {
    const busy = loading || verifying;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 text-center text-sm duration-300">
        <p>
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
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
            You can request another link in {cooldown}s.
          </p>
        </Collapse>
        <Collapse open={cooldown === 0}>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => sendResetLink('Reset link sent again. Check your inbox.')}
            >
              {loading ? 'Sending…' : 'Resend reset link'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={resendVerification}>
              {verifying ? 'Sending…' : 'Send verification link'}
            </Button>
          </div>
        </Collapse>
        <a
          href="/login"
          className="underline-offset-4 transition-colors duration-200 hover:underline"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
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
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>
      <a href="/login" className="text-center text-sm underline-offset-4 hover:underline">
        Back to sign in
      </a>
    </form>
  );
}
