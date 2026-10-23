import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPlus, ArrowLeftRight, Receipt, Repeat, UserPlus } from 'lucide-react-native';
import { ActionSheet } from '~/components/common/action-sheet';
import { Fab } from '~/components/common/fab';
import { LessonForm } from '~/components/forms/lesson-form';
import { RecurringForm } from '~/components/forms/recurring-form';
import { RecurringLessonForm } from '~/components/forms/recurring-lesson-form';
import { StudentForm } from '~/components/forms/student-form';
import { TransactionForm } from '~/components/forms/transaction-form';
import { api } from '~/lib/api';
import { bumpDataVersion, useDataVersion } from '~/lib/data-version';
import { useI18n } from '~/lib/i18n';
import { toast } from '~/lib/toast';
import { useApiQuery } from '~/lib/use-query';
import type { Student } from '~/lib/types';

type Form = 'lesson' | 'student' | 'transaction' | 'schedule' | 'expense';

const TAB_BAR_HEIGHT = 49;

export function GlobalAdd() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const version = useDataVersion();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [form, setForm] = React.useState<Form | null>(null);

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [version],
  );
  const list = students.data ?? [];
  const hasActiveStudents = list.some((s) => !s.archivedAt);

  const openStudentBound = (next: Form) => () => {
    if (!hasActiveStudents) return toast.error(t('Add a student first to log lessons.'));
    setForm(next);
  };
  const formProps = (name: Form) => ({
    open: form === name,
    onOpenChange: (open: boolean) => setForm(open ? name : null),
    onSaved: bumpDataVersion,
  });

  return (
    <>
      <Fab onPress={() => setMenuOpen(true)} bottom={TAB_BAR_HEIGHT + insets.bottom + 16} />
      <ActionSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={t('Add')}
        items={[
          { label: t('Lesson'), icon: CalendarPlus, onPress: openStudentBound('lesson') },
          { label: t('Student'), icon: UserPlus, onPress: () => setForm('student') },
          { label: t('Transaction'), icon: ArrowLeftRight, onPress: () => setForm('transaction') },
          { label: t('Recurring schedule'), icon: Repeat, onPress: openStudentBound('schedule') },
          { label: t('Recurring expense'), icon: Receipt, onPress: () => setForm('expense') },
        ]}
      />
      <LessonForm {...formProps('lesson')} students={list} />
      <StudentForm {...formProps('student')} />
      <TransactionForm {...formProps('transaction')} students={list} />
      <RecurringLessonForm {...formProps('schedule')} students={list} />
      <RecurringForm {...formProps('expense')} />
    </>
  );
}
