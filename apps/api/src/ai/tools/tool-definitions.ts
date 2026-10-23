import {
  AiLanguageEnum,
  FrequencyEnum,
  LessonFrequencyEnum,
  SUPPORTED_CURRENCIES,
} from '@tutor-finance/shared';

type JsonSchema = Record<string, unknown>;

export const TOOL_NAMESPACE = 'tutor';

export const READ_TOOLS = [
  'get_today_overview',
  'list_lessons',
  'get_lesson',
  'list_students',
  'get_student',
  'find_schedule_conflicts',
  'get_unpaid_lessons',
  'finance_summary',
  'list_transactions',
  'list_recurring_schedules',
  'search_notes',
  'get_settings',
] as const;

export const WRITE_TOOLS = [
  'create_student',
  'update_student',
  'set_package_payment',
  'close_package',
  'set_student_archived',
  'create_lesson',
  'update_lesson',
  'set_lesson_status',
  'archive_lesson',
  'delete_lesson',
  'delete_archived_lessons',
  'create_recurring_schedule',
  'update_recurring_schedule',
  'delete_recurring_schedule',
  'create_recurring_expense',
  'update_recurring_expense',
  'delete_recurring_expense',
  'create_transaction',
  'update_transaction',
  'delete_transaction',
  'update_settings',
  'sync_google_calendar',
] as const;

export type ReadToolName = (typeof READ_TOOLS)[number];
export type WriteToolName = (typeof WRITE_TOOLS)[number];

export function isReadTool(name: string): name is ReadToolName {
  return (READ_TOOLS as readonly string[]).includes(name);
}

export function isWriteTool(name: string): name is WriteToolName {
  return (WRITE_TOOLS as readonly string[]).includes(name);
}

const DATE_HINT =
  'ISO 8601. A value without offset (e.g. 2026-10-23 or 2026-10-23T15:30) is read in the user time zone; a date-only "to" includes that whole day.';
const str = (description: string): JsonSchema => ({ type: 'string', description });
const uuid = (description: string): JsonSchema => ({ type: 'string', format: 'uuid', description });
const int = (description: string, minimum = 1, maximum?: number): JsonSchema => ({
  type: 'integer',
  description,
  minimum,
  ...(maximum ? { maximum } : {}),
});
const amount = (description: string): JsonSchema => ({
  type: 'number',
  description: `${description} In major units (e.g. 25.5 means 25.50), never minor units.`,
  exclusiveMinimum: 0,
});
const currency: JsonSchema = { type: 'string', enum: [...SUPPORTED_CURRENCIES] };
const bool = (description: string): JsonSchema => ({ type: 'boolean', description });
const days: JsonSchema = {
  type: 'array',
  items: { type: 'integer', minimum: 0, maximum: 6 },
  minItems: 1,
  description: '0 = Sunday, 1 = Monday … 6 = Saturday.',
};
const studentRef = str(
  "For a student that does not exist yet: the pendingActionId returned by create_student in this conversation (or that new student's exact name). Use instead of studentId.",
);
const lessonRef = str(
  'For a lesson that does not exist yet: the pendingActionId returned by create_lesson in this conversation. Use instead of lessonId.',
);
const CONTACTS = {
  email: str('Email.'),
  phone: str('Phone.'),
  telegramLink: str('Telegram link.'),
  whatsappLink: str('WhatsApp link.'),
  meetingLink: str('Default meeting URL.'),
};
const PRICING = {
  pricingMode: { type: 'string', enum: ['hourly', 'package'] },
  hourlyRate: amount('Hourly pricing: rate per rate period.'),
  ratePeriodMin: int('Minutes the hourly rate covers (default 60).', 1, 1440),
  packageLessons: int('Package pricing: number of lessons in the package.', 1, 1000),
  packagePrice: amount('Package pricing: total price of the package.'),
  packagePaidAmount: {
    type: 'number',
    minimum: 0,
    description:
      'Package pricing: amount already paid for the package in major units (full price = paid, 0 = unpaid).',
  },
};

function fn(
  name: ReadToolName | WriteToolName,
  description: string,
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
): JsonSchema {
  return {
    type: 'function',
    name,
    description,
    parameters: { type: 'object', properties, required, additionalProperties: false },
    strict: false,
  };
}

const PROPOSE =
  'WRITE: does not change data. It creates a proposal the user must confirm in the app; describe it and wait.';

const functions: JsonSchema[] = [
  fn(
    'get_today_overview',
    "Today's lessons, lessons awaiting payment, schedule conflicts in the next 7 days and month-to-date income/expense in the primary currency. Start here for daily summaries.",
  ),
  fn(
    'list_lessons',
    'Lessons in a date range, ordered by start time. Includes student, display status, price, notes and homework.',
    {
      from: str(`Range start. ${DATE_HINT}`),
      to: str(`Range end. ${DATE_HINT}`),
      studentId: uuid('Only lessons of this student.'),
      status: {
        type: 'string',
        enum: ['scheduled', 'awaiting_payment', 'paid', 'cancelled'],
        description: 'Display status filter.',
      },
    },
    ['from', 'to'],
  ),
  fn('get_lesson', 'Full details of one lesson.', { lessonId: uuid('Lesson id.') }, ['lessonId']),
  fn(
    'list_students',
    'All students with pricing, active package, contacts, notes preview and count of lessons awaiting payment.',
    { includeArchived: { type: 'boolean', description: 'Include archived students.' } },
  ),
  fn(
    'get_student',
    "One student's full profile: rate, package, notes, contacts, recent and upcoming lessons (with notes and homework) and recent payments. Use for homework help and lesson planning.",
    { studentId: uuid('Student id.') },
    ['studentId'],
  ),
  fn(
    'find_schedule_conflicts',
    'Overlapping (double-booked) lessons in a date range. Pass daysOfWeek + startTime (+ durationMin, frequency) to also check a planned weekly slot against existing lessons (proposedSlotConflicts).',
    {
      from: str(`Range start. ${DATE_HINT}`),
      to: str(`Range end. ${DATE_HINT}`),
      daysOfWeek: days,
      startTime: str('Planned local start time HH:MM.'),
      durationMin: int('Planned duration in minutes (default 60).', 1, 1440),
      frequency: { type: 'string', enum: [...LessonFrequencyEnum.options] },
    },
    ['from', 'to'],
  ),
  fn(
    'get_unpaid_lessons',
    'Conducted lessons still awaiting payment, with outstanding amounts and totals grouped by student (debts).',
    { studentId: uuid('Only this student.') },
  ),
  fn(
    'finance_summary',
    'Income, expenses, net and planned lesson income for a period, per currency and converted to a target currency.',
    {
      from: str(`Range start. ${DATE_HINT}`),
      to: str(`Range end. ${DATE_HINT}`),
      currency: { ...currency, description: 'Target currency; defaults to the primary currency.' },
    },
    ['from', 'to'],
  ),
  fn(
    'list_transactions',
    'Income/expense transactions in a date range, newest first (max 100).',
    {
      from: str(`Range start. ${DATE_HINT}`),
      to: str(`Range end. ${DATE_HINT}`),
      type: { type: 'string', enum: ['income', 'expense'] },
      studentId: uuid('Only transactions of this student.'),
    },
    ['from', 'to'],
  ),
  fn(
    'list_recurring_schedules',
    'Recurring weekly/biweekly lesson schedules (with ids, for update/delete) and recurring expenses.',
  ),
  fn(
    'search_notes',
    'Case-insensitive text search over lesson notes, lesson homework and student notes.',
    { query: str('Text to search for (min 2 characters).') },
    ['query'],
  ),
  fn(
    'get_settings',
    'User settings: primary currency, interface and assistant language, week start, reminder minutes, time zone and Google Calendar sync status.',
  ),
  fn(
    'create_student',
    `${PROPOSE} Add a student with hourly pricing (hourlyRate) or a lesson package (packageLessons + packagePrice, optional packagePaidAmount). Currency defaults to the primary currency.`,
    {
      name: str('Full name.'),
      defaultCurrency: { ...currency, description: 'Currency for this student and its prices.' },
      ...PRICING,
      ...CONTACTS,
      notes: str('Notes, e.g. level, goals.'),
    },
    ['name'],
  ),
  fn(
    'update_student',
    `${PROPOSE} Update name, notes, contacts, currency or pricing of a student. Passing packageLessons + packagePrice sets a new active package (switches to package pricing). Only pass fields to change. To append to notes, pass the full new text.`,
    {
      studentId: uuid('Student id.'),
      studentRef,
      name: str('New name.'),
      notes: str('New full notes text.'),
      ...CONTACTS,
      ...PRICING,
      currency: { ...currency, description: 'Currency of the new rate or package.' },
      defaultCurrency: { ...currency, description: 'New default currency of the student.' },
    },
  ),
  fn(
    'set_package_payment',
    `${PROPOSE} Set how much of the active lesson package is paid (full price = paid, 0 = unpaid). Records the income automatically.`,
    {
      studentId: uuid('Student id.'),
      studentRef,
      paidAmount: {
        type: 'number',
        minimum: 0,
        description: 'Total paid for the package so far, in major units of the package currency.',
      },
    },
    ['paidAmount'],
  ),
  fn(
    'close_package',
    `${PROPOSE} Close the active lesson package of a student.`,
    {
      studentId: uuid('Student id.'),
      coveredLessons: int('Lessons the package covered; defaults to completed lessons.', 0, 1000),
    },
    ['studentId'],
  ),
  fn(
    'set_student_archived',
    `${PROPOSE} Archive a student (archived=true) or restore from archive (archived=false).`,
    { studentId: uuid('Student id.'), archived: bool('true = archive, false = restore.') },
    ['studentId', 'archived'],
  ),
  fn(
    'create_lesson',
    `${PROPOSE} Schedule a single lesson. Price defaults to the student's rate or package. The result lists conflicts with existing lessons.`,
    {
      studentId: uuid('Student id.'),
      studentRef,
      startsAt: str(`Start time. ${DATE_HINT}`),
      durationMin: int('Duration in minutes (default 60).', 1, 1440),
      notes: str('Lesson notes / plan.'),
      homework: str('Homework.'),
      meetingLink: str('Meeting URL.'),
      price: amount('Optional price override.'),
      currency: { ...currency, description: 'Currency of the price override.' },
    },
    ['startsAt'],
  ),
  fn(
    'update_lesson',
    `${PROPOSE} Reschedule a lesson or change its duration, price, notes, homework or meeting link. Only pass fields to change; an empty string clears a text field.`,
    {
      lessonId: uuid('Lesson id.'),
      lessonRef,
      startsAt: str(`New start time. ${DATE_HINT}`),
      durationMin: int('New duration in minutes.', 1, 1440),
      price: amount('New price override.'),
      currency: { ...currency, description: 'Currency of the price override.' },
      notes: str('New notes.'),
      homework: str('New homework.'),
      meetingLink: str('New meeting URL.'),
    },
  ),
  fn(
    'set_lesson_status',
    `${PROPOSE} complete = lesson took place; mark_paid = fully paid; partial = partially paid (requires paidAmount); cancel; no_show; reopen = back to scheduled.`,
    {
      lessonId: uuid('Lesson id.'),
      lessonRef,
      action: {
        type: 'string',
        enum: ['complete', 'mark_paid', 'partial', 'cancel', 'no_show', 'reopen'],
      },
      paidAmount: amount('Amount paid so far, for action=partial, in the lesson price currency.'),
    },
    ['action'],
  ),
  fn(
    'archive_lesson',
    `${PROPOSE} Move a lesson to the archive.`,
    { lessonId: uuid('Lesson id.') },
    ['lessonId'],
  ),
  fn('delete_lesson', `${PROPOSE} Permanently delete a lesson.`, { lessonId: uuid('Lesson id.') }, [
    'lessonId',
  ]),
  fn('delete_archived_lessons', `${PROPOSE} Permanently delete all archived lessons.`),
  fn(
    'create_recurring_schedule',
    `${PROPOSE} Create a recurring lesson schedule; lessons are generated automatically. The result lists conflicts with existing lessons in the first 4 weeks.`,
    {
      studentId: uuid('Student id.'),
      studentRef,
      daysOfWeek: days,
      startTime: str('Local start time HH:MM (24h).'),
      durationMin: int('Duration in minutes (default 60).', 1, 1440),
      frequency: {
        type: 'string',
        enum: [...LessonFrequencyEnum.options],
        description: 'Default weekly.',
      },
      startDate: str('First date YYYY-MM-DD; defaults to today.'),
      endDate: str('Last date YYYY-MM-DD.'),
      price: amount('Optional price override per lesson.'),
      currency: { ...currency, description: 'Currency of the price override.' },
      meetingLink: str('Meeting URL.'),
      notes: str('Notes.'),
    },
    ['daysOfWeek', 'startTime'],
  ),
  fn(
    'update_recurring_schedule',
    `${PROPOSE} Change, pause (active=false, removes its future scheduled lessons) or resume (active=true) a recurring lesson schedule. Only pass fields to change.`,
    {
      scheduleId: uuid('Recurring lesson schedule id.'),
      daysOfWeek: days,
      startTime: str('Local start time HH:MM (24h).'),
      durationMin: int('Duration in minutes.', 1, 1440),
      frequency: { type: 'string', enum: [...LessonFrequencyEnum.options] },
      endDate: str('Last date YYYY-MM-DD; empty string removes the end date.'),
      active: bool('false = pause, true = resume.'),
      price: amount('Price override per lesson.'),
      currency: { ...currency, description: 'Currency of the price override.' },
      meetingLink: str('Meeting URL.'),
      notes: str('Notes.'),
    },
    ['scheduleId'],
  ),
  fn(
    'delete_recurring_schedule',
    `${PROPOSE} Delete a recurring lesson schedule (already generated lessons stay).`,
    { scheduleId: uuid('Recurring lesson schedule id.') },
    ['scheduleId'],
  ),
  fn(
    'create_recurring_expense',
    `${PROPOSE} Create a recurring expense that is recorded automatically.`,
    {
      amount: amount('Amount.'),
      currency: { ...currency, description: 'Defaults to the primary currency.' },
      category: str('Category, e.g. rent, software.'),
      frequency: { type: 'string', enum: [...FrequencyEnum.options] },
      startDate: str('First date YYYY-MM-DD; defaults to today.'),
      description: str('Description.'),
    },
    ['amount', 'category', 'frequency'],
  ),
  fn(
    'update_recurring_expense',
    `${PROPOSE} Change, pause (active=false) or resume (active=true) a recurring expense. Only pass fields to change.`,
    {
      expenseId: uuid('Recurring expense id.'),
      amount: amount('Amount.'),
      currency,
      category: str('Category.'),
      frequency: { type: 'string', enum: [...FrequencyEnum.options] },
      active: bool('false = pause, true = resume.'),
      description: str('Description.'),
    },
    ['expenseId'],
  ),
  fn(
    'delete_recurring_expense',
    `${PROPOSE} Delete a recurring expense.`,
    { expenseId: uuid('Recurring expense id.') },
    ['expenseId'],
  ),
  fn(
    'create_transaction',
    `${PROPOSE} Record a manual income or expense. Lesson payments go through set_lesson_status and package payments through set_package_payment / packagePaidAmount instead.`,
    {
      type: { type: 'string', enum: ['income', 'expense'] },
      amount: amount('Amount.'),
      currency: { ...currency, description: 'Defaults to the primary currency.' },
      category: str('Category, e.g. books, rent, software, lesson.'),
      occurredAt: str(`When it happened; defaults to now. ${DATE_HINT}`),
      studentId: uuid('Related student.'),
      studentRef,
      description: str('Description.'),
    },
    ['type', 'amount', 'category'],
  ),
  fn(
    'update_transaction',
    `${PROPOSE} Change a transaction. Only pass fields to change.`,
    {
      transactionId: uuid('Transaction id.'),
      amount: amount('Amount.'),
      currency,
      category: str('Category.'),
      occurredAt: str(`Date. ${DATE_HINT}`),
      studentId: uuid('Related student.'),
      description: str('Description.'),
    },
    ['transactionId'],
  ),
  fn(
    'delete_transaction',
    `${PROPOSE} Delete a transaction.`,
    { transactionId: uuid('Transaction id.') },
    ['transactionId'],
  ),
  fn('update_settings', `${PROPOSE} Change settings. Only pass fields to change.`, {
    primaryCurrency: currency,
    weekStartsOn: int('First day of the week: 0 = Sunday, 1 = Monday … 6 = Saturday.', 0, 6),
    lessonReminderMinutes: int('Minutes before a lesson to send the reminder.', 1, 1440),
    assistantLanguage: { type: 'string', enum: [...AiLanguageEnum.options] },
  }),
  fn('sync_google_calendar', `${PROPOSE} Push lessons to the connected Google Calendar now.`),
];

export function toolsFor(readOnly: boolean): JsonSchema[] {
  return [
    {
      type: 'namespace',
      name: TOOL_NAMESPACE,
      description: "Read and propose changes to this tutor's students, lessons and finances.",
      tools: readOnly ? functions.filter((f) => isReadTool(String(f.name))) : functions,
    },
  ];
}
