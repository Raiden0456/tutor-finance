import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { createAuth } from '@tutor-finance/auth';
import {
  schema,
  authSchema,
  user,
  students,
  lessons,
  transactions,
  recurringExpenses,
  userSettings,
} from '../src/db/schema.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEED_EMAIL = process.env.SEED_EMAIL ?? 'demo@tutor.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'demo12345';
const SEED_NAME = process.env.SEED_NAME ?? 'Demo Tutor';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool, { schema });

const auth = createAuth({
  db,
  schema: authSchema,
  secret: process.env.BETTER_AUTH_SECRET ?? 'seed-only-secret-pad-32-bytes-padding',
  baseUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  email: {
    provider: 'smtp',
    from: 'seed@local',
    smtp: { host: 'localhost', port: 1025, secure: false },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(p: number): boolean {
  return Math.random() < p;
}
/** Date exactly N days ago at a given hour */
function daysAgo(d: number, hour = 10, minute = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}
/** Date N days in the future at a given hour */
function daysFromNow(d: number, hour = 10, minute = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}
/** Payment date: 0-3 days after the lesson, but never in the future */
function paymentDate(lessonDate: Date): Date {
  const delay = randInt(0, 3);
  const d = new Date(lessonDate);
  d.setDate(d.getDate() + delay);
  return d > new Date() ? new Date() : d;
}

const MAJOR = (n: number) => Math.round(n * 100);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STUDENTS = [
  {
    name: 'Alice Pine',
    email: 'alice@example.com',
    phone: '+1 555 0101',
    rate: { amount: MAJOR(35), currency: 'USD' as const },
    notes: 'Wants weekly conversation practice',
  },
  {
    name: 'Bob Foam',
    email: 'bob@example.com',
    phone: '+1 555 0102',
    rate: { amount: MAJOR(45), currency: 'USD' as const },
    notes: 'Prep for SAT writing',
  },
  {
    name: 'Clara Iris',
    email: 'clara@example.com',
    phone: '+33 6 12 34 56 78',
    rate: { amount: MAJOR(30), currency: 'EUR' as const },
    notes: 'Business English, intermediate',
  },
  {
    name: 'Dmitri Rose',
    email: 'dmitri@example.com',
    phone: '+7 916 555 0104',
    rate: { amount: MAJOR(2500), currency: 'RUB' as const },
    notes: 'Twice a week, 90 min sessions',
  },
  {
    name: 'Eva Gold',
    email: 'eva@example.com',
    phone: '+44 20 7946 0958',
    rate: { amount: MAJOR(28), currency: 'GBP' as const },
    notes: 'IELTS preparation',
  },
];

const EXPENSE_CATEGORIES = [
  { name: 'subscriptions', amounts: [10, 12, 15, 25], currency: 'USD' as const },
  { name: 'software', amounts: [9, 19, 29], currency: 'USD' as const },
  { name: 'supplies', amounts: [4, 8, 12, 18], currency: 'USD' as const },
  { name: 'marketing', amounts: [50, 75, 120], currency: 'USD' as const },
  { name: 'transport', amounts: [8, 15, 22], currency: 'USD' as const },
  { name: 'food', amounts: [12, 18, 25], currency: 'EUR' as const },
];

const LESSON_NOTES = [
  'Reviewed past tenses, homework assigned',
  'Speaking practice, good progress',
  'Grammar focus: conditionals',
  'Exam prep, mock test reviewed',
  null,
  null,
  null,
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  // 1. Ensure user exists
  let existing = (await db.select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1))[0];

  if (!existing) {
    console.log(`Creating user ${SEED_EMAIL} via better-auth…`);
    await auth.api.signUpEmail({
      body: { email: SEED_EMAIL, password: SEED_PASSWORD, name: SEED_NAME },
      asResponse: false,
    });
    existing = (await db.select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1))[0];
    if (!existing) throw new Error('user creation failed');
  } else {
    console.log(`Reusing existing user ${SEED_EMAIL}`);
  }

  const userId = existing.id;

  // 2. Wipe domain data
  console.log('Wiping domain data…');
  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(lessons).where(eq(lessons.userId, userId));
  await db.delete(students).where(eq(students.userId, userId));
  await db.delete(recurringExpenses).where(eq(recurringExpenses.userId, userId));

  // 3. Settings
  await db
    .insert(userSettings)
    .values({ userId, primaryCurrency: 'USD', theme: 'system', locale: 'en' })
    .onConflictDoUpdate({ target: userSettings.userId, set: { primaryCurrency: 'USD' } });

  // 4. Students
  console.log('Seeding students…');
  const studentRows = await db
    .insert(students)
    .values(
      STUDENTS.map((s) => ({
        userId,
        name: s.name,
        email: s.email,
        phone: s.phone,
        hourlyRateAmount: s.rate.amount,
        hourlyRateCurrency: s.rate.currency,
        defaultCurrency: s.rate.currency,
        notes: s.notes,
      })),
    )
    .returning();

  const studentById = new Map(studentRows.map((s) => [s.id, s]));

  // 5. Lessons — past 60 days + today + upcoming
  console.log('Seeding lessons…');
  const lessonRows: (typeof lessons.$inferInsert)[] = [];

  // Past lessons (2–60 days ago): paid, partially_paid, due, cancelled, no_show
  for (const s of studentRows) {
    for (let d = 60; d >= 2; d -= randInt(3, 7)) {
      const hour = rand([9, 10, 11, 14, 15, 16, 17, 18] as const);
      const duration = rand([45, 60, 60, 60, 90] as const);
      // Weight heavily toward paid so transactions list has content
      const status = rand([
        'paid',
        'paid',
        'paid',
        'paid',
        'partially_paid',
        'due',
        'cancelled',
        'no_show',
      ] as const);
      lessonRows.push({
        userId,
        studentId: s.id,
        startsAt: daysAgo(d, hour, rand([0, 30] as const)),
        durationMin: duration,
        status,
        paidAmount:
          status === 'partially_paid' ? Math.round((s.hourlyRateAmount * duration) / 60 / 2) : null,
        notes: rand(LESSON_NOTES),
      });
    }
  }

  // Today's lessons — mix of scheduled (upcoming) and due (payment pending)
  const todayHours = [9, 11, 14, 16, 18] as const;
  for (let i = 0; i < Math.min(studentRows.length, 3); i++) {
    const s = studentRows[i]!;
    const hour = todayHours[i]!;
    const isPast = hour < new Date().getHours();
    lessonRows.push({
      userId,
      studentId: s.id,
      startsAt: daysAgo(0, hour, 0),
      durationMin: 60,
      status: isPast ? 'due' : 'scheduled',
      notes: null,
    });
  }

  // Upcoming (future) lessons
  for (const [i, s] of studentRows.entries()) {
    if (i >= 3) break;
    lessonRows.push({
      userId,
      studentId: s.id,
      startsAt: daysFromNow(randInt(1, 5), rand([9, 10, 11, 14, 15, 16] as const), 0),
      durationMin: rand([60, 90] as const),
      status: 'scheduled',
      notes: null,
    });
  }

  const insertedLessons = await db.insert(lessons).values(lessonRows).returning();

  // 6. Transactions for paid/partially_paid lessons
  //    occurredAt = payment date (shortly after lesson, never in future) — matches service logic
  console.log('Seeding lesson income transactions…');
  const lessonTxRows: (typeof transactions.$inferInsert)[] = [];

  for (const l of insertedLessons) {
    if (l.status !== 'paid' && l.status !== 'partially_paid') continue;
    const stu = studentById.get(l.studentId)!;
    const amount =
      l.status === 'partially_paid' && l.paidAmount !== null
        ? l.paidAmount
        : Math.round((stu.hourlyRateAmount * l.durationMin) / 60);

    lessonTxRows.push({
      userId,
      type: 'income',
      amount,
      currency: stu.hourlyRateCurrency,
      occurredAt: paymentDate(l.startsAt),
      category: 'lesson',
      studentId: l.studentId,
      lessonId: l.id,
      description: l.notes,
    });
  }

  if (lessonTxRows.length > 0) await db.insert(transactions).values(lessonTxRows);

  // 7. Expenses
  console.log('Seeding expenses…');
  const expenseRows: (typeof transactions.$inferInsert)[] = [];

  for (let i = 0; i < 25; i++) {
    const cat = rand(EXPENSE_CATEGORIES);
    expenseRows.push({
      userId,
      type: 'expense',
      amount: MAJOR(rand(cat.amounts)),
      currency: cat.currency,
      occurredAt: daysAgo(randInt(0, 60), randInt(8, 22)),
      category: cat.name,
      description: chance(0.35) ? cat.name + ' purchase' : null,
    });
  }

  // Fixed monthly subscriptions — same day each month
  for (const sub of [
    { name: 'Notion', amount: 10 },
    { name: 'Adobe CC', amount: 30 },
    { name: 'Zoom Pro', amount: 15 },
  ]) {
    for (const d of [8, 38]) {
      expenseRows.push({
        userId,
        type: 'expense',
        amount: MAJOR(sub.amount),
        currency: 'USD',
        occurredAt: daysAgo(d, 12),
        category: 'subscriptions',
        description: sub.name,
      });
    }
  }

  await db.insert(transactions).values(expenseRows);

  // 8. Recurring expenses
  console.log('Seeding recurring expenses…');
  await db.insert(recurringExpenses).values([
    {
      userId,
      amount: MAJOR(30),
      currency: 'USD',
      category: 'subscriptions',
      description: 'Adobe CC',
      frequency: 'monthly',
      startDate: daysAgo(60),
      nextDueAt: daysFromNow(22),
      isActive: true,
    },
    {
      userId,
      amount: MAJOR(15),
      currency: 'USD',
      category: 'subscriptions',
      description: 'Zoom Pro',
      frequency: 'monthly',
      startDate: daysAgo(60),
      nextDueAt: daysFromNow(18),
      isActive: true,
    },
    {
      userId,
      amount: MAJOR(10),
      currency: 'USD',
      category: 'subscriptions',
      description: 'Notion',
      frequency: 'monthly',
      startDate: daysAgo(60),
      nextDueAt: daysFromNow(15),
      isActive: true,
    },
    {
      userId,
      amount: MAJOR(9),
      currency: 'USD',
      category: 'software',
      description: 'GitHub Copilot',
      frequency: 'monthly',
      startDate: daysAgo(30),
      nextDueAt: daysFromNow(5),
      isActive: true,
    },
    {
      userId,
      amount: MAJOR(25),
      currency: 'USD',
      category: 'marketing',
      description: 'Social media ads',
      frequency: 'weekly',
      startDate: daysAgo(14),
      nextDueAt: daysFromNow(3),
      isActive: false,
    },
  ]);

  const paid = insertedLessons.filter((l) => l.status === 'paid').length;
  const partial = insertedLessons.filter((l) => l.status === 'partially_paid').length;
  const due = insertedLessons.filter((l) => l.status === 'due').length;
  const scheduled = insertedLessons.filter((l) => l.status === 'scheduled').length;

  console.log(`
✓ Seed complete
  user:        ${SEED_EMAIL} / ${SEED_PASSWORD}
  students:    ${studentRows.length}
  lessons:     ${insertedLessons.length} total (${paid} paid, ${partial} partial, ${due} due, ${scheduled} scheduled)
  income tx:   ${lessonTxRows.length}
  expense tx:  ${expenseRows.length}
  recurring:   5
`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
