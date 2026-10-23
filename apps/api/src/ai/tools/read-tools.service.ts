import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import {
  convertMoney,
  displayStatus,
  findLessonConflicts,
  zonedParts,
  zonedTimeToUtc,
  type Currency,
  type DisplayStatus,
  type LessonStatus,
} from '@tutor-finance/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { lessons, students } from '../../db/schema.js';
import { FxService } from '../../fx/fx.service.js';
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service.js';
import type { LessonFilterDto, LessonResponse } from '../../lessons/lessons.dto.js';
import { LessonsService } from '../../lessons/lessons.service.js';
import { RecurringLessonsService } from '../../recurring-lessons/recurring-lessons.service.js';
import { RecurringService } from '../../recurring/recurring.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import type { StudentResponse } from '../../students/students.dto.js';
import { StudentsService } from '../../students/students.service.js';
import type { TransactionFilterDto } from '../../transactions/transactions.dto.js';
import { TransactionsService } from '../../transactions/transactions.service.js';
import type { ReadToolName } from './tool-definitions.js';
import {
  localDayRange,
  money,
  parseRange,
  truncate,
  weeklySlots,
  when,
  type MoneyOut,
  type Slot,
  type ToolContext,
} from './tool-format.js';

type Args = Record<string, unknown>;
type Names = Map<string, string>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UNPAID_STATUSES: LessonStatus[] = ['due', 'partially_paid', 'completed'];

function optionalString(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredString(args: Args, key: string): string {
  const value = optionalString(args, key);
  if (!value) throw new BadRequestException(`"${key}" is required`);
  return value;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class ReadToolsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly students: StudentsService,
    private readonly lessons: LessonsService,
    private readonly transactions: TransactionsService,
    private readonly recurringLessons: RecurringLessonsService,
    private readonly recurring: RecurringService,
    private readonly fx: FxService,
    private readonly settings: SettingsService,
    private readonly calendar: GoogleCalendarService,
  ) {}

  run(name: ReadToolName, args: Args, ctx: ToolContext): Promise<unknown> {
    switch (name) {
      case 'get_today_overview':
        return this.todayOverview(ctx);
      case 'list_lessons':
        return this.listLessons(args, ctx);
      case 'get_lesson':
        return this.getLesson(requiredString(args, 'lessonId'), ctx);
      case 'list_students':
        return this.listStudents(args.includeArchived === true, ctx);
      case 'get_student':
        return this.getStudent(requiredString(args, 'studentId'), ctx);
      case 'find_schedule_conflicts':
        return this.findConflicts(args, ctx);
      case 'get_unpaid_lessons':
        return this.unpaid(ctx, optionalString(args, 'studentId'));
      case 'finance_summary': {
        const range = parseRange(ctx, requiredString(args, 'from'), requiredString(args, 'to'));
        const target = (optionalString(args, 'currency') as Currency) ?? ctx.primaryCurrency;
        return this.financeSummary(range.from, range.to, target, ctx);
      }
      case 'list_transactions':
        return this.listTransactions(args, ctx);
      case 'list_recurring_schedules':
        return this.recurringSchedules(ctx);
      case 'search_notes':
        return this.searchNotes(requiredString(args, 'query'), ctx);
      case 'get_settings':
        return this.settingsOut(ctx);
    }
  }

  private async names(ctx: ToolContext): Promise<Names> {
    const all = await this.students.list(ctx.userId, true);
    return new Map(all.map((s) => [s.id, s.name]));
  }

  private lessonOut(ctx: ToolContext, l: LessonResponse, names: Names) {
    const price = l.effectivePrice;
    return {
      id: l.id,
      student: { id: l.studentId, name: names.get(l.studentId) ?? null },
      startsAt: when(ctx, l.startsAt),
      durationMin: l.durationMin,
      status: l.status,
      displayStatus: displayStatus(l),
      price: price ? money(ctx, price.amount, price.currency) : null,
      paid: price && l.paidAmount !== null ? money(ctx, l.paidAmount, price.currency) : null,
      packageCovered: l.isPackageCovered,
      notes: truncate(l.notes, 500),
      homework: truncate(l.homework, 500),
      meetingLink: l.meetingLink,
      recurring: !!l.recurringLessonId,
    };
  }

  private studentOut(ctx: ToolContext, s: StudentResponse, notesMax = 280) {
    const pkg = s.activePackage;
    return {
      id: s.id,
      name: s.name,
      archived: !!s.archivedAt,
      pricingMode: s.pricingMode,
      rate:
        s.pricingMode === 'hourly'
          ? {
              ...money(ctx, s.hourlyRate.amount, s.hourlyRate.currency),
              perMinutes: s.ratePeriodMin,
            }
          : null,
      defaultCurrency: s.defaultCurrency,
      package: pkg
        ? {
            lessonCount: pkg.lessonCount,
            completedLessons: pkg.completedLessons,
            remainingLessons: pkg.remainingLessons,
            overageLessons: pkg.overageLessons,
            price: money(ctx, pkg.price.amount, pkg.price.currency),
            paid: money(ctx, pkg.paidAmount, pkg.price.currency),
            paymentStatus: pkg.paymentStatus,
            startedAt: when(ctx, pkg.createdAt),
          }
        : null,
      contacts: {
        email: s.email,
        phone: s.phone,
        telegram: s.telegramLink,
        whatsapp: s.whatsappLink,
        meetingLink: s.meetingLink,
      },
      notes: truncate(s.notes, notesMax),
      ...(s.dueLessonsCount !== undefined ? { lessonsAwaitingPayment: s.dueLessonsCount } : {}),
    };
  }

  private fetchLessons(ctx: ToolContext, filter: Partial<LessonFilterDto>) {
    return this.lessons.list(ctx.userId, {
      limit: 500,
      orderDir: 'asc',
      ...filter,
    } as LessonFilterDto);
  }

  private async listLessons(args: Args, ctx: ToolContext) {
    const range = parseRange(ctx, requiredString(args, 'from'), requiredString(args, 'to'));
    const status = optionalString(args, 'status') as DisplayStatus | undefined;
    const [rows, names] = await Promise.all([
      this.fetchLessons(ctx, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        studentId: optionalString(args, 'studentId'),
      }),
      this.names(ctx),
    ]);
    const filtered = status ? rows.filter((l) => displayStatus(l) === status) : rows;
    return { count: filtered.length, lessons: filtered.map((l) => this.lessonOut(ctx, l, names)) };
  }

  private async getLesson(id: string, ctx: ToolContext) {
    const [lesson, names] = await Promise.all([
      this.lessons.findById(ctx.userId, id),
      this.names(ctx),
    ]);
    return {
      ...this.lessonOut(ctx, lesson, names),
      notes: lesson.notes,
      homework: lesson.homework,
    };
  }

  private async listStudents(includeArchived: boolean, ctx: ToolContext) {
    const rows = await this.students.list(ctx.userId, includeArchived);
    return { count: rows.length, students: rows.map((s) => this.studentOut(ctx, s, 160)) };
  }

  async getStudent(id: string, ctx: ToolContext) {
    const now = new Date().toISOString();
    const [student, upcoming, recent, payments, unpaid] = await Promise.all([
      this.students.findById(ctx.userId, id),
      this.fetchLessons(ctx, { studentId: id, from: now, limit: 5 }),
      this.fetchLessons(ctx, { studentId: id, to: now, limit: 10, orderDir: 'desc' }),
      this.transactions.list(ctx.userId, { studentId: id, limit: 10 } as TransactionFilterDto),
      this.unpaid(ctx, id),
    ]);
    const names: Names = new Map([[student.id, student.name]]);
    return {
      ...this.studentOut(ctx, student, 4000),
      upcomingLessons: upcoming.map((l) => this.lessonOut(ctx, l, names)),
      recentLessons: recent.map((l) => this.lessonOut(ctx, l, names)),
      recentPayments: payments.map((t) => ({
        id: t.id,
        type: t.type,
        amount: money(ctx, t.amount, t.currency),
        occurredAt: when(ctx, t.occurredAt),
        category: t.category,
        description: truncate(t.description, 160),
      })),
      unpaid: unpaid.byStudent[0] ?? null,
    };
  }

  private async conflicts(from: Date, to: Date, ctx: ToolContext) {
    const [rows, names] = await Promise.all([
      this.fetchLessons(ctx, { from: from.toISOString(), to: to.toISOString(), limit: 1000 }),
      this.names(ctx),
    ]);
    const candidates = rows.map((l) => ({ ...l, startsAt: new Date(l.startsAt).toISOString() }));
    const pairs = findLessonConflicts(candidates).map(([a, b]) => {
      const aEnd = new Date(a.startsAt).getTime() + a.durationMin * 60_000;
      const bEnd = new Date(b.startsAt).getTime() + b.durationMin * 60_000;
      const overlap = Math.min(aEnd, bEnd) - new Date(b.startsAt).getTime();
      return {
        overlapMin: Math.round(overlap / 60_000),
        lessons: [a, b].map((l) => ({
          id: l.id,
          student: names.get(l.studentId) ?? null,
          startsAt: when(ctx, l.startsAt),
          durationMin: l.durationMin,
        })),
      };
    });
    return { from: when(ctx, from), to: when(ctx, to), count: pairs.length, conflicts: pairs };
  }

  private async findConflicts(args: Args, ctx: ToolContext) {
    const range = parseRange(ctx, requiredString(args, 'from'), requiredString(args, 'to'));
    const existing = await this.conflicts(range.from, range.to, ctx);
    if (!Array.isArray(args.daysOfWeek)) return existing;
    const slots = weeklySlots(
      ctx,
      {
        daysOfWeek: args.daysOfWeek as number[],
        startTime: requiredString(args, 'startTime'),
        durationMin: typeof args.durationMin === 'number' ? args.durationMin : 60,
        biweekly: args.frequency === 'biweekly',
      },
      range.from,
      range.to,
    );
    return { ...existing, proposedSlotConflicts: await this.overlaps(ctx, slots) };
  }

  async overlaps(ctx: ToolContext, slots: Slot[], exclude: { lessonId?: string } = {}) {
    if (slots.length === 0) return [];
    const ends = slots.map((s) => s.start.getTime() + s.durationMin * 60_000);
    const from = new Date(Math.min(...slots.map((s) => s.start.getTime())) - 86_400_000);
    const to = new Date(Math.max(...ends));
    const [rows, names] = await Promise.all([
      this.fetchLessons(ctx, { from: from.toISOString(), to: to.toISOString(), limit: 1000 }),
      this.names(ctx),
    ]);
    const active = rows.filter(
      (l) => l.status !== 'cancelled' && l.status !== 'no_show' && l.id !== exclude.lessonId,
    );
    const found = slots.flatMap((slot, i) =>
      active
        .filter((l) => {
          const start = new Date(l.startsAt).getTime();
          return start < ends[i]! && slot.start.getTime() < start + l.durationMin * 60_000;
        })
        .map((l) => ({
          proposedAt: when(ctx, slot.start),
          existingLesson: {
            id: l.id,
            student: names.get(l.studentId) ?? null,
            startsAt: when(ctx, l.startsAt),
            durationMin: l.durationMin,
          },
        })),
    );
    return found.slice(0, 20);
  }

  private async settingsOut(ctx: ToolContext) {
    const [s, calendar] = await Promise.all([
      this.settings.getOrCreate(ctx.userId),
      this.calendar.getStatus(ctx.userId),
    ]);
    return {
      primaryCurrency: s.primaryCurrency,
      interfaceLanguage: s.locale,
      assistantLanguage: s.aiLanguage,
      weekStartsOn: DAY_NAMES[s.weekStartsOn],
      lessonReminderMinutes: s.lessonReminderMinutes,
      timezone: s.timezone,
      googleCalendar: {
        connected: calendar.calendarEnabled,
        lastSynced: calendar.lastSyncedAt ? when(ctx, calendar.lastSyncedAt) : null,
        pendingSyncJobs: calendar.pendingJobs,
      },
    };
  }

  private async unpaid(ctx: ToolContext, studentId?: string) {
    const [groups, names] = await Promise.all([
      Promise.all(
        UNPAID_STATUSES.map((status) =>
          this.fetchLessons(ctx, { status, studentId, limit: 1000, orderDir: 'desc' }),
        ),
      ),
      this.names(ctx),
    ]);
    const now = Date.now();
    const rows = groups
      .flat()
      .filter(
        (l) => displayStatus(l) === 'awaiting_payment' && new Date(l.startsAt).getTime() <= now,
      );

    const byStudent = new Map<string, { lessons: unknown[]; totals: Map<Currency, number> }>();
    for (const l of rows) {
      if (!l.effectivePrice) continue;
      const { amount, currency } = l.effectivePrice;
      const outstanding = Math.max(
        amount - (l.status === 'partially_paid' ? (l.paidAmount ?? 0) : 0),
        0,
      );
      const entry = byStudent.get(l.studentId) ?? {
        lessons: [] as unknown[],
        totals: new Map<Currency, number>(),
      };
      entry.lessons.push({
        ...this.lessonOut(ctx, l, names),
        outstanding: money(ctx, outstanding, currency),
      });
      entry.totals.set(currency, (entry.totals.get(currency) ?? 0) + outstanding);
      byStudent.set(l.studentId, entry);
    }

    const grandTotals = new Map<Currency, number>();
    const result = [...byStudent.entries()].map(([id, entry]) => {
      for (const [c, a] of entry.totals) grandTotals.set(c, (grandTotals.get(c) ?? 0) + a);
      return {
        student: { id, name: names.get(id) ?? null },
        lessonCount: entry.lessons.length,
        owed: [...entry.totals].map(([c, a]) => money(ctx, a, c)),
        lessons: entry.lessons,
      };
    });
    return {
      lessonCount: rows.length,
      totalOwed: [...grandTotals].map(([c, a]) => money(ctx, a, c)),
      byStudent: result,
    };
  }

  private async financeSummary(from: Date, to: Date, target: Currency, ctx: ToolContext) {
    const [rows, planned] = await Promise.all([
      this.transactions.monthSummary(ctx.userId, from, to),
      this.lessons.plannedIncomeRaw(ctx.userId, from, to),
    ]);
    let rates: Record<string, number> = {};
    try {
      rates = await this.fx.getRatesMap();
    } catch {
      rates = {};
    }
    const missing = new Set<string>();
    const convert = (amount: number, currency: Currency) => {
      try {
        return convertMoney({ amount, currency }, target, rates).amount;
      } catch {
        missing.add(currency);
        return 0;
      }
    };

    const income: MoneyOut[] = [];
    const expense: MoneyOut[] = [];
    let incomeT = 0;
    let expenseT = 0;
    for (const r of rows) {
      const currency = r.currency as Currency;
      const entry = { ...money(ctx, r.total, currency), count: r.count };
      if (r.type === 'income') {
        income.push(entry);
        incomeT += convert(r.total, currency);
      } else {
        expense.push(entry);
        expenseT += convert(r.total, currency);
      }
    }
    const plannedT = planned.reduce((acc, p) => acc + convert(p.amount, p.currency), 0);

    return {
      from: when(ctx, from),
      to: when(ctx, to),
      income,
      expense,
      totals: {
        income: money(ctx, incomeT, target),
        expense: money(ctx, expenseT, target),
        net: money(ctx, incomeT - expenseT, target),
        plannedLessonIncome: money(ctx, plannedT, target),
      },
      ...(missing.size > 0 ? { missingFxRatesFor: [...missing] } : {}),
    };
  }

  private async listTransactions(args: Args, ctx: ToolContext) {
    const range = parseRange(ctx, requiredString(args, 'from'), requiredString(args, 'to'));
    const [rows, names] = await Promise.all([
      this.transactions.list(ctx.userId, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        type: optionalString(args, 'type'),
        studentId: optionalString(args, 'studentId'),
        limit: 100,
      } as TransactionFilterDto),
      this.names(ctx),
    ]);
    return {
      count: rows.length,
      transactions: rows.map((t) => ({
        id: t.id,
        type: t.type,
        amount: money(ctx, t.amount, t.currency),
        occurredAt: when(ctx, t.occurredAt),
        category: t.category,
        student: t.studentId ? (names.get(t.studentId) ?? null) : null,
        lessonId: t.lessonId,
        description: truncate(t.description, 160),
      })),
    };
  }

  private async recurringSchedules(ctx: ToolContext) {
    const [schedules, expenses, names] = await Promise.all([
      this.recurringLessons.list(ctx.userId),
      this.recurring.list(ctx.userId),
      this.names(ctx),
    ]);
    return {
      lessonSchedules: schedules.map((s) => ({
        id: s.id,
        student: { id: s.studentId, name: names.get(s.studentId) ?? null },
        days: s.daysOfWeek.map((d) => DAY_NAMES[d]),
        startTime: s.startTime,
        durationMin: s.durationMin,
        frequency: s.frequency,
        active: s.isActive,
        startDate: s.startDate.slice(0, 10),
        endDate: s.endDate?.slice(0, 10) ?? null,
        nextLesson: when(ctx, s.nextScheduledAt),
        price: s.priceOverride
          ? money(ctx, s.priceOverride.amount, s.priceOverride.currency)
          : null,
      })),
      recurringExpenses: expenses.map((e) => ({
        id: e.id,
        amount: money(ctx, e.amount, e.currency),
        category: e.category,
        description: e.description,
        frequency: e.frequency,
        active: e.isActive,
        nextDue: when(ctx, e.nextDueAt),
      })),
    };
  }

  private async searchNotes(query: string, ctx: ToolContext) {
    if (query.length < 2) throw new BadRequestException('query must have at least 2 characters');
    const pattern = `%${escapeLike(query)}%`;
    const [lessonRows, studentRows, names] = await Promise.all([
      this.db
        .select({
          id: lessons.id,
          studentId: lessons.studentId,
          startsAt: lessons.startsAt,
          notes: lessons.notes,
          homework: lessons.homework,
        })
        .from(lessons)
        .where(
          and(
            eq(lessons.userId, ctx.userId),
            isNull(lessons.archivedAt),
            or(ilike(lessons.notes, pattern), ilike(lessons.homework, pattern)),
          ),
        )
        .orderBy(desc(lessons.startsAt))
        .limit(30),
      this.db
        .select({ id: students.id, name: students.name, notes: students.notes })
        .from(students)
        .where(and(eq(students.userId, ctx.userId), ilike(students.notes, pattern)))
        .limit(20),
      this.names(ctx),
    ]);
    return {
      lessons: lessonRows.map((l) => ({
        id: l.id,
        student: { id: l.studentId, name: names.get(l.studentId) ?? null },
        startsAt: when(ctx, l.startsAt),
        notes: truncate(l.notes, 500),
        homework: truncate(l.homework, 500),
      })),
      students: studentRows.map((s) => ({ id: s.id, name: s.name, notes: truncate(s.notes, 800) })),
    };
  }

  private async todayOverview(ctx: ToolContext) {
    const today = localDayRange(ctx);
    const week = localDayRange(ctx, 0, 7);
    const p = zonedParts(new Date(), ctx.timeZone);
    const monthStart = zonedTimeToUtc({ year: p.year, month: p.month, day: 1 }, ctx.timeZone);

    const [todayLessons, names, unpaid, conflicts, month] = await Promise.all([
      this.fetchLessons(ctx, { from: today.from.toISOString(), to: today.to.toISOString() }),
      this.names(ctx),
      this.unpaid(ctx),
      this.conflicts(week.from, week.to, ctx),
      this.financeSummary(monthStart, new Date(), ctx.primaryCurrency, ctx),
    ]);

    return {
      now: when(ctx, new Date()),
      todayLessons: todayLessons.map((l) => this.lessonOut(ctx, l, names)),
      awaitingPayment: {
        lessonCount: unpaid.lessonCount,
        totalOwed: unpaid.totalOwed,
        byStudent: unpaid.byStudent.map((s) => ({
          student: s.student,
          lessonCount: s.lessonCount,
          owed: s.owed,
        })),
      },
      conflictsNext7Days: conflicts.conflicts,
      monthToDate: month.totals,
    };
  }
}
