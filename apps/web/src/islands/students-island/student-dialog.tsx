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
import { SUPPORTED_CURRENCIES } from '@tutor-finance/shared';
import type { Student } from '@/lib/types';

export function StudentDialog({
  editing,
  onSubmit,
}: {
  editing: Student | null;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const { t } = useI18n();

  return (
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>
          {editing ? t('Edit student') : t('New student')}
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          {t('Hourly rate stored in minor units; enter major value (e.g. 30.00).')}
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rate">{t('Hourly rate')}</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={
                  editing ? fmtMajor(editing.hourlyRate.amount, editing.hourlyRate.currency) : ''
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t('Currency')}</Label>
              <Select name="currency" defaultValue={editing?.hourlyRate.currency ?? 'USD'}>
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
