import { Button } from './ui/button';
import { signOut } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  async function handle() {
    await signOut();
    window.location.href = '/login';
  }
  return (
    <Button variant="ghost" size="sm" onClick={handle}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  );
}
