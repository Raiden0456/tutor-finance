import { Button } from './ui/button';
import { signOut } from '@/lib/auth-client';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';
import { LogOut } from 'lucide-react';

export function SignOutButton({ locale = 'en' }: { locale?: Locale }) {
  const t = createTranslator(locale);
  async function handle() {
    await signOut();
    window.location.href = localizePath('/login', locale);
  }
  return (
    <Button variant="ghost" size="sm" onClick={handle}>
      <LogOut className="mr-2 h-4 w-4" />
      {t('Sign out')}
    </Button>
  );
}
