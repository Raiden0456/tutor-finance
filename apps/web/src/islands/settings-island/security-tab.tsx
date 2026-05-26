import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import type { Locale } from '@/lib/i18n';

type Props = {
  hasPassword: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordSaving: boolean;
  passwordNotice: string | null;
  passwordError: string | null;
  appLocale: Locale;
  t: (key: string) => string;
  localizePath: (path: string, locale: Locale) => string;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSavePassword: () => void;
};

export function SecurityTab({
  hasPassword,
  currentPassword,
  newPassword,
  confirmPassword,
  passwordSaving,
  passwordNotice,
  passwordError,
  appLocale,
  t,
  localizePath,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSavePassword,
}: Props) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {hasPassword ? t('Change password') : t('Add password')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSavePassword();
            }}
          >
            <p className="text-sm text-muted-foreground transition-colors duration-200">
              {hasPassword
                ? t('Update your password for email sign-in.')
                : t('Add a password to sign in with email as well as Google.')}
            </p>

            {hasPassword ? (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="current-password">{t('Current password')}</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={currentPassword}
                  onChange={(e) => onCurrentPasswordChange(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="new-password">{t('New password')}</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-new-password">{t('Confirm password')}</Label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
              />
            </div>

            <Collapse open={!!passwordNotice}>
              <p className="text-sm text-muted-foreground">{passwordNotice}</p>
            </Collapse>

            <Collapse open={!!passwordError}>
              <p role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            </Collapse>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={passwordSaving} className="w-full sm:w-auto">
                {passwordSaving
                  ? t('Updating…')
                  : hasPassword
                    ? t('Update password')
                    : t('Add password')}
              </Button>
              {hasPassword ? (
                <a
                  href={localizePath('/forgot-password', appLocale)}
                  className="text-center text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline sm:text-left"
                >
                  {t('Forgot password?')}
                </a>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
