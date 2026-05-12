import { useEffect, useState, type FormEvent } from 'react';
import { resetPassword } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    setToken(url.searchParams.get('token'));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError('Missing or invalid reset token');
      return;
    }
    setError(null);
    setLoading(true);
    const res = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? 'Could not reset password');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 text-center text-sm duration-300">
        <p>Password updated. You can now sign in.</p>
        <a href="/login" className="underline-offset-4 hover:underline">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Collapse open={!!error}>
        <p className="pt-1 text-sm text-destructive">{error}</p>
      </Collapse>
      <Button type="submit" disabled={loading}>
        {loading ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
