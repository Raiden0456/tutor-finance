import { useState } from 'react';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth-client';
import { BrandMark } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, LogOut } from 'lucide-react';
import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import type { Settings } from '@/lib/types';

interface Props {
  initial: Settings;
}

export function SettingsIsland({ initial }: Props) {
  const [primaryCurrency, setPrimary] = useState<Currency>(initial.primaryCurrency);
  const [theme] = useState(initial.theme);
  const [locale, setLocale] = useState(initial.locale);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSignOut() {
    await signOut();
    window.location.href = '/login';
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    // Read the current theme from localStorage so a toggle made elsewhere isn't overwritten
    const currentTheme =
      (typeof window !== 'undefined'
        ? (localStorage.getItem('theme') as Settings['theme'] | null)
        : null) ?? theme;
    await api.patch('/settings/me', { primaryCurrency, theme: currentTheme, locale });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out md:hidden">
        <BrandMark className="h-11 w-11 rounded-xl" />
        <div>
          <p className="text-lg font-semibold tracking-tight">Uchetka</p>
          <p className="text-xs text-muted-foreground">Tutor finance tracker</p>
        </div>
      </div>

      <header>
        <h1 className="hidden text-xl font-semibold tracking-tight md:block">Settings</h1>
        <p className="text-xs text-muted-foreground">Personalise the app</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Primary currency</Label>
            <Select value={primaryCurrency} onValueChange={(v) => setPrimary(v as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Settings['locale'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Russian (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2">
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                'Saving…'
              ) : saved ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Saved
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
