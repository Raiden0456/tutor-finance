import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Settings } from '@/lib/types';
import { LogOut } from 'lucide-react';

type Props = {
  initial: Settings;
  profileDisplayName: string;
  t: (key: string) => string;
  onSignOut: () => void;
};

export function AccountTab({ initial, profileDisplayName, t, onSignOut }: Props) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('Profile')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1 rounded-xl border border-border bg-muted/30 p-3 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground">{t('Name')}</span>
            <span className="truncate text-sm font-semibold">{profileDisplayName}</span>
          </div>
          <div className="grid gap-1 rounded-xl border border-border bg-muted/30 p-3 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground">{t('Email')}</span>
            <span className="truncate text-sm font-semibold">{initial.profile.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('Account')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('Sign out')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
