export const GENERAL_PROMPTS = [
  'Summary for this week',
  'Who owes me?',
  'Any schedule conflicts?',
  'Plan my next lessons',
];

export const STUDENT_PROMPTS = [
  'Prepare a plan for the next lesson',
  'Suggest homework',
  'How is progress going?',
  'Draft a payment reminder message',
];

const WRITE_LABEL = 'Preparing a change';

const TOOL_LABELS: Record<string, string> = {
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

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? WRITE_LABEL;
}
