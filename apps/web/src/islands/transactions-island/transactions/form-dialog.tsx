import { useEffect, useState } from 'react';
import {
  parseMajorToMinor,
  SUPPORTED_CURRENCIES,
  type Currency,
  type TransactionType,
} from '@tutor-finance/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { MoreFields } from '@/components/form/more-fields';
import { fmtMajor } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { StudentRef, Tx } from '@/lib/types';
import { useMutation } from '@/hooks/use-mutation';
import { toLocalDateTimeValue } from '@/utils/lesson';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryLabel } from '../constants';

const NO_STUDENT = 'none';

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  currency: Currency;
  occurredAt: string;
  category: string;
  studentId?: string;
  description?: string;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  editing,
  primaryCurrency,
  students,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Tx | null;
  primaryCurrency: Currency;
  students: StudentRef[];
  onSubmit: (payload: TransactionPayload) => Promise<void>;
}) {
  const { t } = useI18n();
  const { run, pending } = useMutation();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [category, setCategory] = useState('other');
  const [occurredAt, setOccurredAt] = useState('');
  const [studentId, setStudentId] = useState(NO_STUDENT);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? 'expense');
    setAmount(editing ? fmtMajor(editing.amount, editing.currency) : '');
    setCurrency(editing?.currency ?? primaryCurrency);
    setCategory(editing?.category ?? 'other');
    setOccurredAt(toLocalDateTimeValue(editing?.occurredAt ?? new Date().toISOString()));
    setStudentId(editing?.studentId ?? NO_STUDENT);
    setDescription(editing?.description ?? '');
  }, [open, editing]);

  const categories: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function submit() {
    const minor = parseMajorToMinor(amount, currency);
    if (minor <= 0) return;
    const ok = await run(() =>
      onSubmit({
        type,
        amount: minor,
        currency,
        occurredAt: new Date(occurredAt).toISOString(),
        category,
        studentId: studentId === NO_STUDENT ? undefined : studentId,
        description: description.trim() || undefined,
      }),
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {editing ? t('Edit transaction') : t('New transaction')}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pending) void submit();
          }}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <ResponsiveModalBody className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tx-type">{t('Type')}</Label>
                <Select
                  value={type}
                  disabled={!!editing}
                  onValueChange={(v) => {
                    setType(v as TransactionType);
                    setCategory('other');
                  }}
                >
                  <SelectTrigger id="tx-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('Income')}</SelectItem>
                    <SelectItem value="expense">{t('Expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-amount">{t('Amount')}</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tx-category">{t('Category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="tx-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {categoryLabel(c, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-date">{t('Date')}</Label>
                <Input
                  id="tx-date"
                  type="datetime-local"
                  required
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </div>
            </div>
            <MoreFields>
              <div className="grid gap-2">
                <Label htmlFor="tx-currency">{t('Currency')}</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger id="tx-currency">
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
                <Label htmlFor="tx-student">{t('Student')}</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger id="tx-student">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STUDENT}>{t('No student')}</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-description">{t('Description')}</Label>
                <Input
                  id="tx-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </MoreFields>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending && <Spinner />}
              {editing ? t('Save') : t('Create')}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
