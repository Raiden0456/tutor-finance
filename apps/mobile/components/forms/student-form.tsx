import * as React from 'react';
import { View } from 'react-native';
import {
  toMinorUnits,
  fromMinorUnits,
  type Currency,
  type PricingMode,
} from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { MoreSection } from '~/components/common/more-section';
import { Segmented } from '~/components/common/segmented';
import { TabFade } from '~/components/common/tab-fade';
import { SelectField } from '~/components/common/select-field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useMutation } from '~/lib/use-mutation';
import { currencyOptions } from '~/lib/catalog';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Student } from '~/lib/types';

export function StudentForm({
  open,
  onOpenChange,
  student,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { primaryCurrency } = useSettings();

  const [name, setName] = React.useState('');
  const [pricingMode, setPricingMode] = React.useState<PricingMode>('hourly');
  const [currency, setCurrency] = React.useState<Currency>(primaryCurrency);
  const [rate, setRate] = React.useState('');
  const [ratePeriod, setRatePeriod] = React.useState('60');
  const [lessonCount, setLessonCount] = React.useState('');
  const [packagePrice, setPackagePrice] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [telegram, setTelegram] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setMore(
      !!student &&
        !!(
          student.email ||
          student.phone ||
          student.meetingLink ||
          student.telegramLink ||
          student.whatsappLink ||
          student.notes
        ),
    );
    setName(student?.name ?? '');
    setPricingMode(student?.pricingMode ?? 'hourly');
    setCurrency(student?.defaultCurrency ?? primaryCurrency);
    setRate(
      student ? String(fromMinorUnits(student.hourlyRate.amount, student.hourlyRate.currency)) : '',
    );
    setRatePeriod(student ? String(student.ratePeriodMin) : '60');
    setLessonCount(student?.activePackage ? String(student.activePackage.lessonCount) : '');
    setPackagePrice(
      student?.activePackage
        ? String(
            fromMinorUnits(
              student.activePackage.price.amount,
              student.activePackage.price.currency,
            ),
          )
        : '',
    );
    setEmail(student?.email ?? '');
    setPhone(student?.phone ?? '');
    setMeetingLink(student?.meetingLink ?? '');
    setTelegram(student?.telegramLink ?? '');
    setWhatsapp(student?.whatsappLink ?? '');
    setNotes(student?.notes ?? '');
  }, [open, student, primaryCurrency]);

  const submit = useMutation(
    async () => {
      setError(null);
      if (!name.trim()) return setError(t('Student name'));
      const base: Record<string, unknown> = {
        name: name.trim(),
        defaultCurrency: currency,
        pricingMode,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        telegramLink: telegram.trim() || undefined,
        whatsappLink: whatsapp.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (pricingMode === 'hourly') {
        base.hourlyRate = { amount: toMinorUnits(Number(rate) || 0, currency), currency };
        base.ratePeriodMin = Number(ratePeriod) || 60;
      } else {
        base.package = {
          lessonCount: Number(lessonCount) || 1,
          price: { amount: toMinorUnits(Number(packagePrice) || 0, currency), currency },
        };
      }

      if (student) await api.patch(`students/${student.id}`, base);
      else await api.post('students', base);

      onOpenChange(false);
      onSaved();
    },
    { onError: setError },
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={student ? t('Edit student') : t('New student')}
      footer={
        <Button onPress={() => void submit.run()} disabled={submit.pending}>
          {submit.pending ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Notice message={error} />
        <Field label={t('Student name')}>
          <Input value={name} onChangeText={setName} />
        </Field>

        <Field label={t('Pricing')}>
          <Segmented<PricingMode>
            value={pricingMode}
            onChange={setPricingMode}
            options={[
              { value: 'hourly', label: t('Hourly') },
              { value: 'package', label: t('Package') },
            ]}
          />
        </Field>

        <TabFade tabKey={pricingMode} className="gap-4">
          {pricingMode === 'package' ? (
            <Field label={t('Lessons in package')}>
              <Input value={lessonCount} onChangeText={setLessonCount} keyboardType="number-pad" />
            </Field>
          ) : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={pricingMode === 'hourly' ? t('Rate') : t('Package price')}>
                {pricingMode === 'hourly' ? (
                  <Input
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                ) : (
                  <Input
                    value={packagePrice}
                    onChangeText={setPackagePrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                )}
              </Field>
            </View>
            <View className="w-28">
              <Field label={t('Currency')}>
                <SelectField
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                  options={currencyOptions()}
                />
              </Field>
            </View>
          </View>
        </TabFade>

        <MoreSection open={more} onOpenChange={setMore}>
          {pricingMode === 'hourly' ? (
            <Field label={t('Rate period (min)')}>
              <Input value={ratePeriod} onChangeText={setRatePeriod} keyboardType="number-pad" />
            </Field>
          ) : null}
          <Field label={t('Email')}>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Field>
          <Field label={t('Phone')}>
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </Field>
          <Field label={t('Default lesson link')}>
            <Input value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" />
          </Field>
          <Field label={t('Telegram link')}>
            <Input value={telegram} onChangeText={setTelegram} autoCapitalize="none" />
          </Field>
          <Field label={t('WhatsApp link')}>
            <Input value={whatsapp} onChangeText={setWhatsapp} autoCapitalize="none" />
          </Field>
          <Field label={t('Notes')}>
            <Textarea value={notes} onChangeText={setNotes} placeholder={t('Add a note…')} />
          </Field>
        </MoreSection>
      </View>
    </FormSheet>
  );
}
