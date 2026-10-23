import { useEffect, useState } from 'react';
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { MoneyInput } from '@/components/form/money-input';
import { fmtMajor } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import type { LessonActions } from '@/hooks/use-lesson-actions';

export function EditDetailsModal({
  open,
  onOpenChange,
  lesson,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  actions: LessonActions;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const [homework, setHomework] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    if (!open) return;
    setNotes(lesson.notes ?? '');
    setHomework(lesson.homework ?? '');
    setMeetingLink(lesson.meetingLink ?? '');
    setAmount(
      lesson.priceOverride
        ? fmtMajor(lesson.priceOverride.amount, lesson.priceOverride.currency)
        : '',
    );
    setCurrency(lesson.priceOverride?.currency ?? lesson.effectivePrice?.currency ?? 'USD');
  }, [open]);

  async function handleSave() {
    const minor = amount.trim() ? parseMajorToMinor(amount, currency) : null;
    if (minor !== null && minor <= 0) return;
    const ok = await actions.update({
      notes: notes.trim() || null,
      homework: homework.trim() || null,
      meetingLink: meetingLink.trim() || null,
      priceOverride: minor === null ? null : { amount: minor, currency },
    });
    if (ok) onOpenChange(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{t('Edit Details')}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-notes-${lesson.id}`}>{t('Notes')}</Label>
            <Textarea
              id={`edit-notes-${lesson.id}`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Add a note…')}
              className="resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-homework-${lesson.id}`}>{t('Homework')}</Label>
            <Textarea
              id={`edit-homework-${lesson.id}`}
              rows={3}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder={t('Add homework…')}
              className="resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-link-${lesson.id}`}>{t('Meeting link')}</Label>
            <Input
              id={`edit-link-${lesson.id}`}
              type="url"
              placeholder="https://…"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('Price override')}</Label>
            <MoneyInput
              amount={amount}
              currency={currency}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
              placeholder={t('Leave blank to use hourly rate')}
            />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={actions.pending}>
            {actions.pending && <Spinner />}
            {t('Save')}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
