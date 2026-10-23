import type { TFunction } from '~/lib/i18n';

const LABELS: Record<string, string> = {
  get_today_overview: "Checking today's overview",
  list_lessons: 'Looking through lessons',
  get_lesson: 'Reading lesson details',
  list_students: 'Looking through students',
  get_student: 'Reading student profile',
  find_schedule_conflicts: 'Checking schedule conflicts',
  get_unpaid_lessons: 'Checking unpaid lessons',
  finance_summary: 'Crunching the numbers',
  list_transactions: 'Looking through transactions',
  list_recurring_schedules: 'Checking recurring schedules',
  search_notes: 'Searching notes',
  get_settings: 'Reading settings',
};

export function toolLabel(name: string, t: TFunction): string {
  return t(LABELS[name] ?? 'Preparing a change');
}
