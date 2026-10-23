import { Button } from './ui/button';
import { signOut } from '@/lib/auth-client';
import { createTranslator, localizePath, type Locale } from '@/lib/i18n';
import { LogOut } from 'lucide-react';

export async function signOutAndRedirect(locale: Locale) {
  await signOut();
  window.location.href = localizePath('/login', locale);
}

export function SignOutButton({ locale = 'en' }: { locale?: Locale }) {
  const t = createTranslator(locale);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('Sign out')}
      title={t('Sign out')}
      onClick={() => void signOutAndRedirect(locale)}
      className="shrink-0 text-muted-foreground"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
