import { useState, type FormEvent } from 'react';
import { requestPasswordReset } from '@/lib/auth-client';
import { PUBLIC_APP_URL } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await requestPasswordReset({ email, redirectTo: `${PUBLIC_APP_URL}/reset-password` });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? 'Could not send reset email');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-center text-sm">
        If an account exists for <strong>{email}</strong>, a reset link has been sent.
      </p>
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>
      <a href="/login" className="text-center text-sm underline-offset-4 hover:underline">
        Back to sign in
      </a>
    </form>
  );
}
