import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ResponsiveModalContent,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { fmtMajor } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { TabSwitcher } from '@/islands/transactions-island/tab-switcher';
import { SUPPORTED_CURRENCIES } from '@tutor-finance/shared';
import type { PricingMode, Student } from '@/lib/types';

export function StudentDialog({
  editing,
  onSubmit,
}: {
  editing: Student | null;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const { t } = useI18n();
  const [pricingMode, setPricingMode] = useState<PricingMode>(editing?.pricingMode ?? 'hourly');

  useEffect(() => {
    setPricingMode(editing?.pricingMode ?? 'hourly');
  }, [editing?.id, editing?.pricingMode]);

  const activePackage = editing?.activePackage ?? null;
  const hourlyCurrency = editing?.hourlyRate.currency ?? editing?.defaultCurrency ?? 'USD';
  const packageCurrency = activePackage?.price.currency ?? editing?.defaultCurrency ?? 'USD';

  return (
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>
          {editing ? t('Edit student') : t('New student')}
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          {t('Set an hourly rate or a prepaid lesson package.')}
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <input type="hidden" name="pricingMode" value={pricingMode} />
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input id="name" name="name" required defaultValue={editing?.name ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('Email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">{t('Phone')}</Label>
            <Input id="phone" name="phone" defaultValue={editing?.phone ?? ''} />
          </div>

          <div className="grid gap-2">
            <Label>{t('Pricing')}</Label>
            <TabSwitcher<PricingMode>
              value={pricingMode}
              onChange={setPricingMode}
              groupId={editing ? `student-pricing-${editing.id}` : 'student-pricing-new'}
              tabs={[
                { key: 'hourly', label: t('Hourly') },
                { key: 'package', label: t('Package') },
              ]}
            />
          </div>

          <AnimatePresence initial={false} mode="wait">
            {pricingMode === 'hourly' ? (
              <motion.div
                key="hourly"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="rate">{t('Rate')}</Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={
                        editing
                          ? fmtMajor(editing.hourlyRate.amount, editing.hourlyRate.currency)
                          : ''
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">{t('Currency')}</Label>
                    <Select name="currency" defaultValue={hourlyCurrency}>
                      <SelectTrigger id="currency">
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ratePeriodMin">{t('Rate period (min)')}</Label>
                  <Input
                    id="ratePeriodMin"
                    name="ratePeriodMin"
                    type="number"
                    min="1"
                    required
                    defaultValue={editing?.ratePeriodMin ?? 60}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="package"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="packageLessonCount">{t('Lessons in package')}</Label>
                    <Input
                      id="packageLessonCount"
                      name="packageLessonCount"
                      type="number"
                      min="1"
                      required
                      defaultValue={activePackage?.lessonCount ?? ''}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="packagePrice">{t('Package price')}</Label>
                    <Input
                      id="packagePrice"
                      name="packagePrice"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={
                        activePackage
                          ? fmtMajor(activePackage.price.amount, activePackage.price.currency)
                          : ''
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageCurrency">{t('Currency')}</Label>
                  <Select name="packageCurrency" defaultValue={packageCurrency}>
                    <SelectTrigger id="packageCurrency">
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
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-2">
            <Label htmlFor="meetingLink">{t('Default lesson link')}</Label>
            <Input
              id="meetingLink"
              name="meetingLink"
              type="url"
              placeholder="https://…"
              defaultValue={editing?.meetingLink ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="telegramLink">{t('Telegram link')}</Label>
              <Input
                id="telegramLink"
                name="telegramLink"
                type="url"
                placeholder="https://t.me/..."
                defaultValue={editing?.telegramLink ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsappLink">{t('WhatsApp link')}</Label>
              <Input
                id="whatsappLink"
                name="whatsappLink"
                type="url"
                placeholder="https://wa.me/..."
                defaultValue={editing?.whatsappLink ?? ''}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{t('Notes')}</Label>
            <Input id="notes" name="notes" defaultValue={editing?.notes ?? ''} />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" className="w-full sm:w-auto">
            {editing ? t('Save') : t('Create')}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
  );
}

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="text-sm font-medium">{t('No students yet')}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('Add your first one to start tracking lessons.')}
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="h-4 w-4" /> {t('Add student')}
      </Button>
    </div>
  );
}
