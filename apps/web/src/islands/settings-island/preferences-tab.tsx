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
import { GoogleCalendarCard } from '@/islands/google-calendar-card';
import { SUPPORTED_CURRENCIES, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { Check } from 'lucide-react';

const weekStartOptions: Array<{ value: WeekStartsOn; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

type Props = {
  appLocale: 'en' | 'ru';
  primaryCurrency: Currency;
  weekStartsOn: WeekStartsOn;
  saving: boolean;
  saved: boolean;
  t: (key: string) => string;
  onPrimaryCurrencyChange: (value: Currency) => void;
  onWeekStartsOnChange: (value: WeekStartsOn) => void;
  onSave: () => void;
};

export function PreferencesTab({
  appLocale,
  primaryCurrency,
  weekStartsOn,
  saving,
  saved,
  t,
  onPrimaryCurrencyChange,
  onWeekStartsOnChange,
  onSave,
}: Props) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('Preferences')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t('Primary currency')}</Label>
            <Select value={primaryCurrency} onValueChange={(v) => onPrimaryCurrencyChange(v as Currency)}>
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
            <Label>{t('Week starts on')}</Label>
            <Select
              value={String(weekStartsOn)}
              onValueChange={(v) => onWeekStartsOnChange(Number(v) as WeekStartsOn)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekStartOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {t(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                t('Saving…')
              ) : saved ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  {t('Saved')}
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <GoogleCalendarCard locale={appLocale} />
    </div>
  );
}
