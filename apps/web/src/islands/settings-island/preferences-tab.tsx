import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

const REMINDER_PRESETS = ['10', '30', '60'];

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
  lessonReminderMinutes: number;
  saving: boolean;
  saved: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  onPrimaryCurrencyChange: (value: Currency) => void;
  onWeekStartsOnChange: (value: WeekStartsOn) => void;
  onLessonReminderChange: (value: number) => void;
  onSave: () => void;
};

export function PreferencesTab({
  appLocale,
  primaryCurrency,
  weekStartsOn,
  lessonReminderMinutes,
  saving,
  saved,
  t,
  onPrimaryCurrencyChange,
  onWeekStartsOnChange,
  onLessonReminderChange,
  onSave,
}: Props) {
  const [reminderChoice, setReminderChoice] = useState<string>(
    REMINDER_PRESETS.includes(String(lessonReminderMinutes))
      ? String(lessonReminderMinutes)
      : 'custom',
  );
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

          <div className="grid gap-2">
            <Label>{t('Lesson reminder')}</Label>
            <div className="flex gap-2">
              <Select
                value={reminderChoice}
                onValueChange={(v) => {
                  setReminderChoice(v);
                  if (v !== 'custom') onLessonReminderChange(Number(v));
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">{t('{count} min', { count: 10 })}</SelectItem>
                  <SelectItem value="30">{t('{count} min', { count: 30 })}</SelectItem>
                  <SelectItem value="60">{t('1 hour')}</SelectItem>
                  <SelectItem value="custom">{t('Custom')}</SelectItem>
                </SelectContent>
              </Select>
              {reminderChoice === 'custom' ? (
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={lessonReminderMinutes}
                  onChange={(e) => {
                    const v = Math.min(1440, Math.max(1, Number(e.target.value) || 30));
                    onLessonReminderChange(v);
                  }}
                  className="w-24"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{t('Minutes before lesson')}</p>
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
