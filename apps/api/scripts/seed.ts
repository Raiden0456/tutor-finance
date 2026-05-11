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
function daysAgo(d: number, hour = 9, minute = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}
const MAJOR = (n: number) => Math.round(n * 100);
const MAJOR_RUB = (n: number) => Math.round(n * 100); // RUB minor units = 100 kop

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
    rate: { amount: MAJOR_RUB(2500), currency: 'RUB' as const },
    notes: 'Twice a week, 90 min',
  },
  {
    name: 'Eva Gold',
    email: 'eva@example.com',
    phone: '+44 20 7946 0958',
    rate: { amount: MAJOR(28), currency: 'GBP' as const },
    notes: 'IELTS preparation',
  },
  {
    name: 'Felix Love',
    email: 'felix@example.com',
    phone: '+1 555 0106',
    rate: { amount: MAJOR(20), currency: 'USD' as const },
    notes: 'Casual, evenings only',
  },
];

const STATUSES = ['completed', 'completed', 'completed', 'completed', 'scheduled', 'cancelled', 'no_show'] as const;

const EXPENSE_CATEGORIES = [
  { name: 'subscriptions', amounts: [10, 12, 15, 25, 30], currency: 'USD' as const },
  { name: 'software', amounts: [9, 19, 29, 49], currency: 'USD' as const },
  { name: 'supplies', amounts: [4, 8, 12, 18, 25], currency: 'USD' as const },
  { name: 'marketing', amounts: [50, 75, 120, 180], currency: 'USD' as const },
  { name: 'transport', amounts: [8, 15, 22, 35], currency: 'USD' as const },
  { name: 'equipment', amounts: [50, 90, 150, 280], currency: 'USD' as const },
  { name: 'food', amounts: [12, 18, 25, 35], currency: 'EUR' as const },
];

const STANDALONE_INCOME = [
  { category: 'refund', amount: 25, currency: 'USD' as const },
  { category: 'gift', amount: 50, currency: 'USD' as const },
  { category: 'tip', amount: 15, currency: 'USD' as const },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  // 1. user
  let existing = (
    await db.select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1)
  )[0];

  if (!existing) {
    console.log(`creating user ${SEED_EMAIL} via better-auth …`);
    await auth.api.signUpEmail({
      body: { email: SEED_EMAIL, password: SEED_PASSWORD, name: SEED_NAME },
      asResponse: false,
    });
    existing = (
      await db.select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1)
    )[0];
    if (!existing) throw new Error('user creation failed');
  } else {
    console.log(`reusing existing user ${SEED_EMAIL}`);
  }

  const userId = existing.id;

  // 2. wipe prior domain data for this user (auth tables left alone)
  console.log('wiping domain data …');
  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(lessons).where(eq(lessons.userId, userId));
  await db.delete(students).where(eq(students.userId, userId));

  // 3. settings
  await db
    .insert(userSettings)
    .values({ userId, primaryCurrency: 'USD', theme: 'system', locale: 'en' })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { primaryCurrency: 'USD' },
    });

  // 4. students
  console.log('seeding students …');
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

  // 5. lessons (~ past 60 days, 2-4 per week per student)
  console.log('seeding lessons …');
  const lessonRows: (typeof lessons.$inferInsert)[] = [];
  for (const s of studentRows) {
    for (let d = 60; d >= 0; d -= randInt(2, 5)) {
      const status = rand(STATUSES);
      const duration = chance(0.7) ? 60 : chance(0.5) ? 90 : 30;
      lessonRows.push({
        userId,
        studentId: s.id,
        startsAt: daysAgo(d, randInt(9, 19), rand([0, 30])),
        durationMin: duration,
        status,
        notes: chance(0.3) ? 'Reviewed homework, focus on tenses' : null,
      });
    }
  }
  const insertedLessons = await db.insert(lessons).values(lessonRows).returning();

  // 6. lesson-derived income transactions (replicate service logic)
  console.log('seeding lesson income transactions …');
  const studentById = new Map(studentRows.map((s) => [s.id, s]));
  const lessonTxRows: (typeof transactions.$inferInsert)[] = [];
  for (const l of insertedLessons) {
    if (l.status !== 'completed') continue;
    const stu = studentById.get(l.studentId)!;
    const amount = Math.round((stu.hourlyRateAmount * l.durationMin) / 60);
    lessonTxRows.push({
      userId,
      type: 'income',
      amount,
      currency: stu.hourlyRateCurrency,
      occurredAt: l.startsAt,
      category: 'lesson',
      studentId: l.studentId,
      lessonId: l.id,
      description: l.notes,
    });
  }
  if (lessonTxRows.length > 0) {
    await db.insert(transactions).values(lessonTxRows);
  }

  // 7. standalone income (refunds, gifts, tips)
  console.log('seeding standalone income …');
  const standaloneIncome: (typeof transactions.$inferInsert)[] = [];
  for (let i = 0; i < 4; i++) {
    const e = rand(STANDALONE_INCOME);
    standaloneIncome.push({
      userId,
      type: 'income',
      amount: MAJOR(e.amount),
      currency: e.currency,
      occurredAt: daysAgo(randInt(0, 60), randInt(10, 18)),
      category: e.category,
    });
  }
  await db.insert(transactions).values(standaloneIncome);

  // 8. expenses
  console.log('seeding expenses …');
  const expenseRows: (typeof transactions.$inferInsert)[] = [];
  for (let i = 0; i < 28; i++) {
    const cat = rand(EXPENSE_CATEGORIES);
    const amount = rand(cat.amounts);
    expenseRows.push({
      userId,
      type: 'expense',
      amount: MAJOR(amount),
      currency: cat.currency,
      occurredAt: daysAgo(randInt(0, 60), randInt(8, 22)),
      category: cat.name,
      description: chance(0.4) ? cat.name + ' purchase' : null,
    });
  }
  // recurring "subscriptions" — same date both months
  for (const sub of [
    { name: 'Notion', amount: 10 },
    { name: 'Adobe CC', amount: 30 },
    { name: 'Zoom Pro', amount: 15 },
  ]) {
    for (const d of [5, 35]) {
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

  console.log(
    `\n✓ seed complete\n  user:   ${SEED_EMAIL} / ${SEED_PASSWORD}\n  students: ${studentRows.length}\n  lessons:  ${insertedLessons.length}\n  income tx: ${lessonTxRows.length + standaloneIncome.length}\n  expense tx: ${expenseRows.length}\n`,
  );
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
