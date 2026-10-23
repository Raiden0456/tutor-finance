import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { formatMoney, type Currency } from '@tutor-finance/shared';
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service.js';
import {
  CreateLessonDto,
  UpdateLessonDto,
  type LessonResponse,
} from '../../lessons/lessons.dto.js';
import { LessonsService } from '../../lessons/lessons.service.js';
import {
  CreateRecurringLessonDto,
  UpdateRecurringLessonDto,
} from '../../recurring-lessons/recurring-lessons.dto.js';
import { RecurringLessonsService } from '../../recurring-lessons/recurring-lessons.service.js';
import { CreateRecurringDto, UpdateRecurringDto } from '../../recurring/recurring.dto.js';
import { RecurringService } from '../../recurring/recurring.service.js';
import { UpdateSettingsDto } from '../../settings/settings.dto.js';
import { SettingsService } from '../../settings/settings.service.js';
import {
  CloseStudentPackageDto,
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentPackagePaymentDto,
} from '../../students/students.dto.js';
import { StudentsService } from '../../students/students.service.js';
import { CreateTransactionDto, UpdateTransactionDto } from '../../transactions/transactions.dto.js';
import { TransactionsService } from '../../transactions/transactions.service.js';
import { ActionRefsService } from './action-refs.service.js';
import { ReadToolsService } from './read-tools.service.js';
import type { WriteToolName } from './tool-definitions.js';
import {
  dateLabel,
  localDateKey,
  parseDateTime,
  toMinor,
  tr,
  validated,
  weekdays,
  weeklySlots,
  when,
  type Slot,
  type ToolContext,
} from './tool-format.js';

type Args = Record<string, unknown>;

export interface Proposal {
  args: Args;
  summary: string;
  details?: Record<string, unknown>;
}

interface Target {
  id: string;
  ref?: string;
}

interface StudentTarget extends Target {
  name: string;
  currency: Currency;
  packagePrice: { amount: number; currency: Currency } | null;
}

interface LessonTarget extends Target {
  label: string;
  lesson?: LessonResponse;
}

type LessonAction = 'complete' | 'mark_paid' | 'partial' | 'cancel' | 'no_show' | 'reopen';

const LESSON_TEXT_FIELDS = ['notes', 'homework', 'meetingLink'] as const;
const STUDENT_TEXT_FIELDS = [
  'name',
  'notes',
  'email',
  'phone',
  'telegramLink',
  'whatsappLink',
  'meetingLink',
] as const;
const STATUS_LABELS: Record<LessonAction, [string, string]> = {
  complete: ['mark as completed', 'отметить проведённым'],
  mark_paid: ['mark as paid', 'отметить оплаченным'],
  partial: ['mark as partially paid', 'отметить частично оплаченным'],
  cancel: ['cancel', 'отменить'],
  no_show: ['mark as no-show', 'отметить неявку'],
  reopen: ['set back to scheduled', 'вернуть в запланированные'],
};
const FREQUENCY_LABELS: Record<string, [string, string]> = {
  daily: ['daily', 'ежедневно'],
  weekly: ['weekly', 'еженедельно'],
  biweekly: ['every 2 weeks', 'раз в 2 недели'],
  monthly: ['monthly', 'ежемесячно'],
  yearly: ['yearly', 'ежегодно'],
};
const FIELD_LABELS: Record<string, [string, string]> = {
  name: ['name', 'имя'],
  notes: ['notes', 'заметки'],
  email: ['email', 'email'],
  phone: ['phone', 'телефон'],
  telegramLink: ['Telegram', 'Telegram'],
  whatsappLink: ['WhatsApp', 'WhatsApp'],
  meetingLink: ['meeting link', 'ссылка на встречу'],
  homework: ['homework', 'домашнее задание'],
  startsAt: ['time', 'время'],
  durationMin: ['duration', 'длительность'],
  hourlyRate: ['rate', 'ставка'],
  ratePeriodMin: ['rate period', 'период ставки'],
  pricingMode: ['pricing', 'тариф'],
  package: ['package', 'пакет'],
  defaultCurrency: ['currency', 'валюта'],
  priceOverride: ['price', 'цена'],
  daysOfWeek: ['days', 'дни'],
  startTime: ['start time', 'время начала'],
  frequency: ['frequency', 'частота'],
  endDate: ['end date', 'дата окончания'],
  isActive: ['active', 'активность'],
  amount: ['amount', 'сумма'],
  currency: ['currency', 'валюта'],
  category: ['category', 'категория'],
  description: ['description', 'описание'],
  occurredAt: ['date', 'дата'],
  studentId: ['student', 'ученик'],
};

function pick(args: Args, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    if (typeof args[key] === 'string') out[key] = (args[key] as string).trim();
  }
  return out;
}

function optStr(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function str(args: Args, key: string): string {
  const value = optStr(args, key);
  if (!value) throw new BadRequestException(`"${key}" is required`);
  return value;
}

function num(args: Args, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' ? value : undefined;
}

function defined(entries: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined));
}

function nonEmpty(dto: Record<string, unknown>): void {
  if (Object.keys(dto).length === 0) throw new BadRequestException('Nothing to change');
}

function withRefs(args: Args, ...targets: (Target | undefined)[]): Args {
  const refs = targets.flatMap((t) => (t?.ref ? [t.ref] : []));
  return refs.length > 0 ? { ...args, refs } : args;
}

function ruLessons(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} урок`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} урока`;
  return `${n} уроков`;
}

@Injectable()
export class WriteToolsService {
  constructor(
    private readonly students: StudentsService,
    private readonly lessons: LessonsService,
    private readonly transactions: TransactionsService,
    private readonly recurringLessons: RecurringLessonsService,
    private readonly recurring: RecurringService,
    private readonly settings: SettingsService,
    private readonly calendar: GoogleCalendarService,
    private readonly refs: ActionRefsService,
    private readonly readTools: ReadToolsService,
  ) {}

  propose(name: WriteToolName, args: Args, ctx: ToolContext): Promise<Proposal> {
    switch (name) {
      case 'create_student':
        return this.proposeCreateStudent(args, ctx);
      case 'update_student':
        return this.proposeUpdateStudent(args, ctx);
      case 'set_package_payment':
        return this.proposePackagePayment(args, ctx);
      case 'close_package':
        return this.proposeClosePackage(args, ctx);
      case 'set_student_archived':
        return this.proposeStudentArchived(args, ctx);
      case 'create_lesson':
        return this.proposeCreateLesson(args, ctx);
      case 'update_lesson':
        return this.proposeUpdateLesson(args, ctx);
      case 'set_lesson_status':
        return this.proposeLessonStatus(args, ctx);
      case 'archive_lesson':
      case 'delete_lesson':
        return this.proposeLessonRemoval(name, args, ctx);
      case 'delete_archived_lessons':
        return Promise.resolve({
          args: {},
          summary: tr(
            ctx,
            'Permanently delete all archived lessons',
            'Удалить все архивные уроки навсегда',
          ),
        });
      case 'create_recurring_schedule':
        return this.proposeCreateSchedule(args, ctx);
      case 'update_recurring_schedule':
        return this.proposeUpdateSchedule(args, ctx);
      case 'delete_recurring_schedule':
        return this.proposeDeleteSchedule(args, ctx);
      case 'create_recurring_expense':
        return this.proposeCreateExpense(args, ctx);
      case 'update_recurring_expense':
        return this.proposeUpdateExpense(args, ctx);
      case 'delete_recurring_expense':
        return this.proposeDeleteExpense(args, ctx);
      case 'create_transaction':
        return this.proposeCreateTransaction(args, ctx);
      case 'update_transaction':
        return this.proposeUpdateTransaction(args, ctx);
      case 'delete_transaction':
        return this.proposeDeleteTransaction(args, ctx);
      case 'update_settings':
        return this.proposeSettings(args, ctx);
      case 'sync_google_calendar':
        return this.proposeCalendarSync(ctx);
    }
  }

  async execute(name: WriteToolName, args: Args, userId: string): Promise<Record<string, unknown>> {
    const dto = (args.dto ?? {}) as object;
    const id = String(args.id ?? '');
    switch (name) {
      case 'create_student': {
        const student = await this.students.create(userId, await validated(CreateStudentDto, dto));
        await this.payPackage(userId, student.id, args.paidAmount);
        return { studentId: student.id };
      }
      case 'update_student': {
        const student = await this.students.update(
          userId,
          id,
          await validated(UpdateStudentDto, dto),
        );
        await this.payPackage(userId, student.id, args.paidAmount);
        return { studentId: student.id };
      }
      case 'set_package_payment':
        await this.payPackage(userId, id, (dto as { paidAmount?: number }).paidAmount);
        return { studentId: id };
      case 'close_package':
        await this.students.closePackage(userId, id, await validated(CloseStudentPackageDto, dto));
        return { studentId: id };
      case 'set_student_archived':
        await (args.archived
          ? this.students.archive(userId, id)
          : this.students.unarchive(userId, id));
        return { studentId: id };
      case 'create_lesson': {
        const lesson = await this.lessons.create(userId, await validated(CreateLessonDto, dto));
        return { lessonId: lesson.id };
      }
      case 'update_lesson': {
        const lesson = await this.lessons.update(userId, id, await validated(UpdateLessonDto, dto));
        return { lessonId: lesson.id };
      }
      case 'set_lesson_status': {
        const current = await this.lessons.findById(userId, id);
        const patch = this.statusPatch(
          current,
          args.action as LessonAction,
          num(args, 'paidAmount'),
        );
        const lesson = await this.lessons.update(
          userId,
          id,
          await validated(UpdateLessonDto, patch),
        );
        return { lessonId: lesson.id, status: lesson.status };
      }
      case 'archive_lesson':
        await this.lessons.archive(userId, id);
        return { lessonId: id };
      case 'delete_lesson':
        await this.lessons.remove(userId, id);
        return { lessonId: id, deleted: true };
      case 'delete_archived_lessons':
        return { deleted: await this.lessons.deleteArchive(userId) };
      case 'create_recurring_schedule': {
        const schedule = await this.recurringLessons.create(
          userId,
          await validated(CreateRecurringLessonDto, dto),
        );
        return { recurringLessonId: schedule.id };
      }
      case 'update_recurring_schedule':
        await this.recurringLessons.update(
          userId,
          id,
          await validated(UpdateRecurringLessonDto, dto),
        );
        return { recurringLessonId: id };
      case 'delete_recurring_schedule':
        await this.recurringLessons.remove(userId, id);
        return { recurringLessonId: id, deleted: true };
      case 'create_recurring_expense': {
        const expense = await this.recurring.create(
          userId,
          await validated(CreateRecurringDto, dto),
        );
        return { recurringExpenseId: expense.id };
      }
      case 'update_recurring_expense':
        await this.recurring.update(userId, id, await validated(UpdateRecurringDto, dto));
        return { recurringExpenseId: id };
      case 'delete_recurring_expense':
        await this.recurring.remove(userId, id);
        return { recurringExpenseId: id, deleted: true };
      case 'create_transaction': {
        const tx = await this.transactions.create(
          userId,
          await validated(CreateTransactionDto, dto),
        );
        return { transactionId: tx.id };
      }
      case 'update_transaction':
        await this.transactions.update(userId, id, await validated(UpdateTransactionDto, dto));
        return { transactionId: id };
      case 'delete_transaction':
        await this.transactions.remove(userId, id);
        return { transactionId: id, deleted: true };
      case 'update_settings':
        await this.settings.update(userId, await validated(UpdateSettingsDto, dto));
        return { ok: true };
      case 'sync_google_calendar':
        return { queued: (await this.calendar.syncNow(userId)).queued };
    }
  }

  private async payPackage(userId: string, studentId: string, paidAmount: unknown): Promise<void> {
    if (typeof paidAmount !== 'number') return;
    await this.students.updatePackagePayment(
      userId,
      studentId,
      await validated(UpdateStudentPackagePaymentDto, { paidAmount }),
    );
  }

  private fmt(ctx: ToolContext, amount: number, currency: Currency): string {
    return formatMoney({ amount, currency }, ctx.locale === 'ru' ? 'ru-RU' : 'en-US');
  }

  private fields(ctx: ToolContext, dto: Record<string, unknown>): string {
    return Object.keys(dto)
      .map((key) => {
        const [en, ru] = FIELD_LABELS[key] ?? [key, key];
        return tr(ctx, en, ru);
      })
      .join(', ');
  }

  private freq(ctx: ToolContext, frequency: string): string {
    const [en, ru] = FREQUENCY_LABELS[frequency] ?? [frequency, frequency];
    return tr(ctx, en, ru);
  }

  private async student(args: Args, ctx: ToolContext): Promise<StudentTarget> {
    const ref = optStr(args, 'studentRef');
    const studentId = optStr(args, 'studentId');
    if (!ref && !studentId)
      throw new BadRequestException('"studentId" or "studentRef" is required');
    if (!ref) {
      try {
        const s = await this.students.findById(ctx.userId, studentId!);
        return {
          id: s.id,
          name: s.name,
          currency: s.defaultCurrency,
          packagePrice: s.activePackage?.price ?? null,
        };
      } catch (err) {
        if (!(err instanceof NotFoundException) || !ctx.threadId) throw err;
        return this.student({ studentRef: studentId }, ctx).catch(() => {
          throw err;
        });
      }
    }
    const parent = await this.refs.find(ctx, 'create_student', ref);
    if (parent.id) return this.student({ studentId: parent.id }, ctx);
    const parentArgs = parent.row.args as {
      dto: {
        name: string;
        defaultCurrency: Currency;
        package?: { price: { amount: number; currency: Currency } };
      };
    };
    return {
      id: parent.row.id,
      ref: parent.row.id,
      name: parentArgs.dto.name,
      currency: parentArgs.dto.defaultCurrency,
      packagePrice: parentArgs.dto.package?.price ?? null,
    };
  }

  private async studentName(ctx: ToolContext, id: string): Promise<string> {
    try {
      return (await this.student({ studentId: id }, ctx)).name;
    } catch {
      return '?';
    }
  }

  private async lesson(args: Args, ctx: ToolContext): Promise<LessonTarget> {
    const ref = optStr(args, 'lessonRef');
    if (!ref) {
      const lesson = await this.lessons.findById(ctx.userId, str(args, 'lessonId'));
      const name = await this.studentName(ctx, lesson.studentId);
      return { id: lesson.id, lesson, label: `${name}, ${when(ctx, lesson.startsAt).local}` };
    }
    const parent = await this.refs.find(ctx, 'create_lesson', ref);
    if (parent.id) return this.lesson({ lessonId: parent.id }, ctx);
    const dto = (parent.row.args as { dto: { studentId: string; startsAt: string } }).dto;
    const name = await this.studentName(ctx, dto.studentId);
    return {
      id: parent.row.id,
      ref: parent.row.id,
      label: `${name}, ${when(ctx, dto.startsAt).local}`,
    };
  }

  private pricing(ctx: ToolContext, args: Args, currency: Currency) {
    const dto: Record<string, unknown> = {};
    const text: string[] = [];
    const mode = optStr(args, 'pricingMode');
    if (mode) dto.pricingMode = mode;

    const rate = num(args, 'hourlyRate');
    if (rate !== undefined) {
      dto.hourlyRate = { amount: toMinor(rate, currency), currency };
      const period = num(args, 'ratePeriodMin') ?? 60;
      text.push(
        `${this.fmt(ctx, toMinor(rate, currency), currency)} / ${period} ${tr(ctx, 'min', 'мин')}`,
      );
    }

    const lessons = num(args, 'packageLessons');
    const price = num(args, 'packagePrice');
    let paidAmount: number | undefined;
    if (lessons !== undefined || price !== undefined) {
      if (lessons === undefined || price === undefined) {
        throw new BadRequestException('packageLessons and packagePrice must be passed together');
      }
      const priceMinor = toMinor(price, currency);
      dto.package = { lessonCount: lessons, price: { amount: priceMinor, currency } };
      if (!mode) dto.pricingMode = 'package';
      const paid = num(args, 'packagePaidAmount');
      paidAmount = paid === undefined ? undefined : paid > 0 ? toMinor(paid, currency) : 0;
      if (paidAmount !== undefined && paidAmount > priceMinor) {
        throw new BadRequestException('packagePaidAmount cannot exceed packagePrice');
      }
      const priceText = this.fmt(ctx, priceMinor, currency);
      const paidText = this.paidText(ctx, paidAmount ?? 0, priceMinor, currency);
      text.push(
        tr(
          ctx,
          `package ${lessons} lessons for ${priceText}, ${paidText}`,
          `пакет ${ruLessons(lessons)} за ${priceText}, ${paidText}`,
        ),
      );
    } else if (num(args, 'packagePaidAmount') !== undefined) {
      throw new BadRequestException('Use set_package_payment to change the payment of a package');
    }
    if (dto.pricingMode === 'package' && !dto.package && args.requirePackage) {
      throw new BadRequestException('packageLessons and packagePrice are required for a package');
    }
    return { dto, text, paidAmount };
  }

  private paidText(ctx: ToolContext, paid: number, price: number, currency: Currency): string {
    if (paid >= price) return tr(ctx, 'paid', 'оплачен');
    if (paid <= 0) return tr(ctx, 'not paid yet', 'не оплачен');
    return tr(
      ctx,
      `paid ${this.fmt(ctx, paid, currency)}`,
      `оплачено ${this.fmt(ctx, paid, currency)}`,
    );
  }

  private async proposeCreateStudent(args: Args, ctx: ToolContext): Promise<Proposal> {
    const currency = (optStr(args, 'defaultCurrency') ?? ctx.primaryCurrency) as Currency;
    const pricing = this.pricing(ctx, { ...args, requirePackage: true }, currency);
    if (!pricing.dto.hourlyRate && !pricing.dto.package) {
      throw new BadRequestException(
        'Pass hourlyRate for hourly pricing or packageLessons + packagePrice for a package',
      );
    }
    const dto = {
      name: str(args, 'name'),
      defaultCurrency: currency,
      ...pricing.dto,
      ...defined({ ratePeriodMin: num(args, 'ratePeriodMin') }),
      ...pick(args, STUDENT_TEXT_FIELDS),
    };
    await validated(CreateStudentDto, dto);
    return {
      args: defined({ dto, paidAmount: pricing.paidAmount || undefined }),
      summary: [
        tr(ctx, `New student ${dto.name}`, `Новый ученик ${dto.name}`),
        ...pricing.text,
      ].join(' · '),
    };
  }

  private async proposeUpdateStudent(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.student(args, ctx);
    const currency = (optStr(args, 'currency') ?? student.currency) as Currency;
    const pricing = this.pricing(ctx, args, currency);
    const dto = {
      ...pick(args, STUDENT_TEXT_FIELDS),
      ...pricing.dto,
      ...defined({
        ratePeriodMin: num(args, 'ratePeriodMin'),
        defaultCurrency: optStr(args, 'defaultCurrency'),
      }),
    };
    nonEmpty(dto);
    await validated(UpdateStudentDto, dto);
    const details = pricing.text.length > 0 ? ` · ${pricing.text.join(', ')}` : '';
    return {
      args: withRefs(defined({ id: student.id, dto, paidAmount: pricing.paidAmount }), student),
      summary: tr(
        ctx,
        `Update ${student.name}: ${this.fields(ctx, dto)}${details}`,
        `Изменить ученика ${student.name}: ${this.fields(ctx, dto)}${details}`,
      ),
    };
  }

  private async proposePackagePayment(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.student(args, ctx);
    if (!student.packagePrice)
      throw new BadRequestException(`${student.name} has no active package`);
    const { amount: price, currency } = student.packagePrice;
    const paid = num(args, 'paidAmount');
    if (paid === undefined) throw new BadRequestException('"paidAmount" is required');
    const paidAmount = paid > 0 ? toMinor(paid, currency) : 0;
    if (paidAmount > price)
      throw new BadRequestException('paidAmount cannot exceed the package price');
    const dto = { paidAmount };
    await validated(UpdateStudentPackagePaymentDto, dto);
    const amounts = `${this.fmt(ctx, paidAmount, currency)} / ${this.fmt(ctx, price, currency)}`;
    return {
      args: withRefs({ id: student.id, dto }, student),
      summary: tr(
        ctx,
        `Package payment for ${student.name}: ${amounts} (${this.paidText(ctx, paidAmount, price, currency)})`,
        `Оплата пакета ${student.name}: ${amounts} (${this.paidText(ctx, paidAmount, price, currency)})`,
      ),
    };
  }

  private async proposeClosePackage(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.students.findById(ctx.userId, str(args, 'studentId'));
    const pkg = student.activePackage;
    if (!pkg) throw new BadRequestException(`${student.name} has no active package`);
    const dto = { coveredLessons: num(args, 'coveredLessons') ?? pkg.completedLessons };
    await validated(CloseStudentPackageDto, dto);
    return {
      args: { id: student.id, dto },
      summary: tr(
        ctx,
        `Close package of ${student.name}: ${dto.coveredLessons} of ${pkg.lessonCount} lessons used`,
        `Закрыть пакет ${student.name}: использовано ${dto.coveredLessons} из ${pkg.lessonCount}`,
      ),
    };
  }

  private async proposeStudentArchived(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.students.findById(ctx.userId, str(args, 'studentId'));
    const archived = args.archived !== false;
    return {
      args: { id: student.id, archived },
      summary: archived
        ? tr(ctx, `Archive student ${student.name}`, `Архивировать ученика ${student.name}`)
        : tr(
            ctx,
            `Restore student ${student.name} from archive`,
            `Вернуть ученика ${student.name} из архива`,
          ),
    };
  }

  private priceOverride(args: Args, fallback: Currency) {
    const price = num(args, 'price');
    if (price === undefined) return undefined;
    const currency = (optStr(args, 'currency') ?? fallback) as Currency;
    return { amount: toMinor(price, currency), currency };
  }

  private async conflictsFor(ctx: ToolContext, slots: Slot[], lessonId?: string) {
    const conflicts = await this.readTools.overlaps(ctx, slots, { lessonId });
    return conflicts.length > 0 ? { conflicts } : undefined;
  }

  private async proposeCreateLesson(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.student(args, ctx);
    const startsAt = parseDateTime(ctx, str(args, 'startsAt'));
    const priceOverride = this.priceOverride(args, student.currency);
    const dto = {
      studentId: student.id,
      startsAt: startsAt.toISOString(),
      durationMin: num(args, 'durationMin') ?? 60,
      status: 'scheduled',
      ...pick(args, LESSON_TEXT_FIELDS),
      ...defined({ priceOverride }),
    };
    await validated(CreateLessonDto, dto);
    const priceText = priceOverride
      ? ` · ${this.fmt(ctx, priceOverride.amount, priceOverride.currency)}`
      : '';
    return {
      args: withRefs({ dto }, student),
      summary: tr(
        ctx,
        `Lesson with ${student.name} · ${when(ctx, startsAt).local}, ${dto.durationMin} min${priceText}`,
        `Урок: ${student.name} · ${when(ctx, startsAt).local}, ${dto.durationMin} мин${priceText}`,
      ),
      details: await this.conflictsFor(ctx, [{ start: startsAt, durationMin: dto.durationMin }]),
    };
  }

  private async proposeUpdateLesson(args: Args, ctx: ToolContext): Promise<Proposal> {
    const target = await this.lesson(args, ctx);
    const startsAt = optStr(args, 'startsAt')
      ? parseDateTime(ctx, str(args, 'startsAt'))
      : undefined;
    const currency = target.lesson?.effectivePrice?.currency ?? ctx.primaryCurrency;
    const dto = {
      ...defined({
        startsAt: startsAt?.toISOString(),
        durationMin: num(args, 'durationMin'),
        priceOverride: this.priceOverride(args, currency),
      }),
      ...pick(args, LESSON_TEXT_FIELDS),
    };
    nonEmpty(dto);
    await validated(UpdateLessonDto, dto);
    const timeText = startsAt ? ` → ${when(ctx, startsAt).local}` : '';
    const slotStart = startsAt ?? (target.lesson ? new Date(target.lesson.startsAt) : undefined);
    const duration = num(args, 'durationMin') ?? target.lesson?.durationMin ?? 60;
    return {
      args: withRefs({ id: target.id, dto }, target),
      summary: tr(
        ctx,
        `Change lesson (${target.label}): ${this.fields(ctx, dto)}${timeText}`,
        `Изменить урок (${target.label}): ${this.fields(ctx, dto)}${timeText}`,
      ),
      details:
        slotStart && (startsAt || dto.durationMin)
          ? await this.conflictsFor(
              ctx,
              [{ start: slotStart, durationMin: duration }],
              target.lesson?.id,
            )
          : undefined,
    };
  }

  private statusPatch(lesson: LessonResponse, action: LessonAction, paidMajor?: number) {
    switch (action) {
      case 'complete':
        return { status: lesson.isPackageCovered ? 'completed' : 'due' };
      case 'mark_paid':
        return { status: 'paid' };
      case 'cancel':
        return { status: 'cancelled' };
      case 'no_show':
        return { status: 'no_show' };
      case 'reopen':
        return { status: 'scheduled' };
      case 'partial': {
        if (paidMajor === undefined)
          throw new BadRequestException('paidAmount is required for partial');
        if (!lesson.effectivePrice) throw new BadRequestException('Lesson has no price');
        const paidAmount = toMinor(paidMajor, lesson.effectivePrice.currency);
        if (paidAmount >= lesson.effectivePrice.amount) {
          throw new BadRequestException('paidAmount must be below the price; use mark_paid');
        }
        return { status: 'partially_paid', paidAmount };
      }
    }
  }

  private async proposeLessonStatus(args: Args, ctx: ToolContext): Promise<Proposal> {
    const action = str(args, 'action') as LessonAction;
    if (!(action in STATUS_LABELS)) throw new BadRequestException(`Unknown action: ${action}`);
    const target = await this.lesson(args, ctx);
    const paidAmount = num(args, 'paidAmount');
    let extra = '';
    if (target.lesson) {
      const patch = await validated(
        UpdateLessonDto,
        this.statusPatch(target.lesson, action, paidAmount),
      );
      const price = target.lesson.effectivePrice;
      if (price && action === 'partial') {
        extra = ` · ${this.fmt(ctx, patch.paidAmount!, price.currency)} / ${this.fmt(ctx, price.amount, price.currency)}`;
      } else if (price && action === 'mark_paid') {
        extra = ` · ${this.fmt(ctx, price.amount, price.currency)}`;
      }
    } else if (action === 'partial') {
      throw new BadRequestException('Confirm the lesson first, then record a partial payment');
    }
    const [en, ru] = STATUS_LABELS[action];
    return {
      args: withRefs(defined({ id: target.id, action, paidAmount }), target),
      summary: tr(
        ctx,
        `Lesson (${target.label}): ${en}${extra}`,
        `Урок (${target.label}): ${ru}${extra}`,
      ),
    };
  }

  private async proposeLessonRemoval(
    name: 'archive_lesson' | 'delete_lesson',
    args: Args,
    ctx: ToolContext,
  ): Promise<Proposal> {
    const target = await this.lesson({ lessonId: args.lessonId }, ctx);
    return {
      args: { id: target.id },
      summary:
        name === 'archive_lesson'
          ? tr(ctx, `Archive lesson (${target.label})`, `Архивировать урок (${target.label})`)
          : tr(ctx, `Delete lesson (${target.label})`, `Удалить урок (${target.label})`),
    };
  }

  private async schedule(ctx: ToolContext, id: string) {
    const schedule = (await this.recurringLessons.list(ctx.userId)).find((s) => s.id === id);
    if (!schedule) throw new NotFoundException('Recurring lesson schedule not found');
    const name = await this.studentName(ctx, schedule.studentId);
    return {
      schedule,
      label: `${name}, ${weekdays(ctx, schedule.daysOfWeek)} ${schedule.startTime}`,
    };
  }

  private async proposeCreateSchedule(args: Args, ctx: ToolContext): Promise<Proposal> {
    const student = await this.student(args, ctx);
    const dto = {
      studentId: student.id,
      daysOfWeek: args.daysOfWeek,
      startTime: str(args, 'startTime'),
      durationMin: num(args, 'durationMin') ?? 60,
      frequency: optStr(args, 'frequency') ?? 'weekly',
      startDate: optStr(args, 'startDate'),
      endDate: optStr(args, 'endDate'),
      ...pick(args, ['notes', 'meetingLink']),
      ...defined({ priceOverride: this.priceOverride(args, student.currency) }),
    };
    await validated(CreateRecurringLessonDto, dto);
    const days = dto.daysOfWeek as number[];
    const from = dto.startDate ? parseDateTime(ctx, dto.startDate) : new Date();
    const slots = weeklySlots(
      ctx,
      {
        daysOfWeek: days,
        startTime: dto.startTime,
        durationMin: dto.durationMin,
        biweekly: dto.frequency === 'biweekly',
      },
      from,
      new Date(from.getTime() + 28 * 86_400_000),
    );
    const firstDay = dateLabel(ctx, localDateKey(ctx, slots[0]?.start ?? from));
    const parts = [
      `${weekdays(ctx, days)} ${dto.startTime}`,
      `${dto.durationMin} ${tr(ctx, 'min', 'мин')}`,
      ...(dto.frequency === 'weekly' ? [] : [this.freq(ctx, dto.frequency)]),
      `${tr(ctx, 'from', 'с')} ${firstDay}`,
      ...(dto.endDate ? [`${tr(ctx, 'until', 'до')} ${dateLabel(ctx, dto.endDate)}`] : []),
    ].join(', ');
    return {
      args: withRefs({ dto }, student),
      summary: tr(
        ctx,
        `Schedule for ${student.name} · ${parts}`,
        `Расписание ${student.name} · ${parts}`,
      ),
      details: await this.conflictsFor(ctx, slots),
    };
  }

  private async proposeUpdateSchedule(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { schedule, label } = await this.schedule(ctx, str(args, 'scheduleId'));
    const endDate = typeof args.endDate === 'string' ? args.endDate.trim() || null : undefined;
    const dto = {
      ...defined({
        daysOfWeek: Array.isArray(args.daysOfWeek) ? args.daysOfWeek : undefined,
        startTime: optStr(args, 'startTime'),
        durationMin: num(args, 'durationMin'),
        frequency: optStr(args, 'frequency'),
        endDate,
        isActive: typeof args.active === 'boolean' ? args.active : undefined,
        priceOverride: this.priceOverride(
          args,
          schedule.priceOverride?.currency ?? ctx.primaryCurrency,
        ),
      }),
      ...pick(args, ['notes', 'meetingLink']),
    };
    nonEmpty(dto);
    await validated(UpdateRecurringLessonDto, dto);
    const verb =
      dto.isActive === false
        ? tr(ctx, 'Pause schedule', 'Приостановить расписание')
        : dto.isActive === true
          ? tr(ctx, 'Resume schedule', 'Возобновить расписание')
          : tr(ctx, 'Change schedule', 'Изменить расписание');
    const { isActive: _isActive, ...changes } = dto;
    const fields = Object.keys(changes).length > 0 ? `: ${this.fields(ctx, changes)}` : '';
    const next =
      dto.daysOfWeek || dto.startTime
        ? ` → ${weekdays(ctx, (dto.daysOfWeek as number[] | undefined) ?? schedule.daysOfWeek)} ${dto.startTime ?? schedule.startTime}`
        : '';
    return { args: { id: schedule.id, dto }, summary: `${verb} (${label})${fields}${next}` };
  }

  private async proposeDeleteSchedule(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { schedule, label } = await this.schedule(ctx, str(args, 'scheduleId'));
    return {
      args: { id: schedule.id },
      summary: tr(
        ctx,
        `Delete schedule (${label}); lessons already created stay`,
        `Удалить расписание (${label}); уже созданные уроки останутся`,
      ),
    };
  }

  private async expense(ctx: ToolContext, id: string) {
    const expense = (await this.recurring.list(ctx.userId)).find((e) => e.id === id);
    if (!expense) throw new NotFoundException('Recurring expense not found');
    return {
      expense,
      label: `${expense.category}, ${this.fmt(ctx, expense.amount, expense.currency)}, ${this.freq(ctx, expense.frequency)}`,
    };
  }

  private async proposeCreateExpense(args: Args, ctx: ToolContext): Promise<Proposal> {
    const currency = (optStr(args, 'currency') ?? ctx.primaryCurrency) as Currency;
    const amount = num(args, 'amount');
    if (amount === undefined) throw new BadRequestException('"amount" is required');
    const dto = {
      amount: toMinor(amount, currency),
      currency,
      category: str(args, 'category'),
      frequency: str(args, 'frequency'),
      startDate: optStr(args, 'startDate'),
      ...pick(args, ['description']),
    };
    await validated(CreateRecurringDto, dto);
    const from = dto.startDate ? `, ${tr(ctx, 'from', 'с')} ${dateLabel(ctx, dto.startDate)}` : '';
    const what = `${this.fmt(ctx, dto.amount, currency)}, ${dto.category}, ${this.freq(ctx, dto.frequency)}${from}`;
    return {
      args: { dto },
      summary: tr(ctx, `Recurring expense · ${what}`, `Регулярный расход · ${what}`),
    };
  }

  private async proposeUpdateExpense(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { expense, label } = await this.expense(ctx, str(args, 'expenseId'));
    const currency = (optStr(args, 'currency') ?? expense.currency) as Currency;
    const amount = num(args, 'amount');
    const dto = {
      ...defined({
        amount: amount !== undefined ? toMinor(amount, currency) : undefined,
        currency: optStr(args, 'currency'),
        category: optStr(args, 'category'),
        frequency: optStr(args, 'frequency'),
        isActive: typeof args.active === 'boolean' ? args.active : undefined,
      }),
      ...pick(args, ['description']),
    };
    nonEmpty(dto);
    await validated(UpdateRecurringDto, dto);
    return {
      args: { id: expense.id, dto },
      summary: tr(
        ctx,
        `Change recurring expense (${label}): ${this.fields(ctx, dto)}`,
        `Изменить регулярный расход (${label}): ${this.fields(ctx, dto)}`,
      ),
    };
  }

  private async proposeDeleteExpense(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { expense, label } = await this.expense(ctx, str(args, 'expenseId'));
    return {
      args: { id: expense.id },
      summary: tr(
        ctx,
        `Delete recurring expense (${label})`,
        `Удалить регулярный расход (${label})`,
      ),
    };
  }

  private async proposeCreateTransaction(args: Args, ctx: ToolContext): Promise<Proposal> {
    const currency = (optStr(args, 'currency') ?? ctx.primaryCurrency) as Currency;
    const amount = num(args, 'amount');
    if (amount === undefined) throw new BadRequestException('"amount" is required');
    const student =
      optStr(args, 'studentId') || optStr(args, 'studentRef')
        ? await this.student(args, ctx)
        : undefined;
    const occurredAt = optStr(args, 'occurredAt')
      ? parseDateTime(ctx, str(args, 'occurredAt'))
      : new Date();
    const dto = {
      type: str(args, 'type'),
      amount: toMinor(amount, currency),
      currency,
      category: str(args, 'category'),
      occurredAt: occurredAt.toISOString(),
      ...defined({ studentId: student?.id }),
      ...pick(args, ['description']),
    };
    await validated(CreateTransactionDto, dto);
    const isIncome = dto.type === 'income';
    const what = `${this.fmt(ctx, dto.amount, currency)}, ${dto.category}, ${when(ctx, occurredAt).local}`;
    const who = student ? ` (${student.name})` : '';
    return {
      args: withRefs({ dto }, student),
      summary: tr(
        ctx,
        `${isIncome ? 'Income' : 'Expense'} · ${what}${who}`,
        `${isIncome ? 'Доход' : 'Расход'} · ${what}${who}`,
      ),
    };
  }

  private async transaction(ctx: ToolContext, id: string) {
    const tx = await this.transactions.findById(ctx.userId, id);
    return {
      tx,
      label: `${this.fmt(ctx, tx.amount, tx.currency)}, ${tx.category}, ${when(ctx, tx.occurredAt).local}`,
    };
  }

  private async proposeUpdateTransaction(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { tx, label } = await this.transaction(ctx, str(args, 'transactionId'));
    const currency = (optStr(args, 'currency') ?? tx.currency) as Currency;
    const amount = num(args, 'amount');
    const student = optStr(args, 'studentId') ? await this.student(args, ctx) : undefined;
    const dto = {
      ...defined({
        amount: amount !== undefined ? toMinor(amount, currency) : undefined,
        currency: optStr(args, 'currency'),
        category: optStr(args, 'category'),
        occurredAt: optStr(args, 'occurredAt')
          ? parseDateTime(ctx, str(args, 'occurredAt')).toISOString()
          : undefined,
        studentId: student?.id,
      }),
      ...pick(args, ['description']),
    };
    nonEmpty(dto);
    await validated(UpdateTransactionDto, dto);
    return {
      args: { id: tx.id, dto },
      summary: tr(
        ctx,
        `Change transaction (${label}): ${this.fields(ctx, dto)}`,
        `Изменить операцию (${label}): ${this.fields(ctx, dto)}`,
      ),
    };
  }

  private async proposeDeleteTransaction(args: Args, ctx: ToolContext): Promise<Proposal> {
    const { tx, label } = await this.transaction(ctx, str(args, 'transactionId'));
    return {
      args: { id: tx.id },
      summary: tr(ctx, `Delete transaction (${label})`, `Удалить операцию (${label})`),
    };
  }

  private async proposeSettings(args: Args, ctx: ToolContext): Promise<Proposal> {
    const dto = defined({
      primaryCurrency: optStr(args, 'primaryCurrency'),
      weekStartsOn: num(args, 'weekStartsOn'),
      lessonReminderMinutes: num(args, 'lessonReminderMinutes'),
      aiLanguage: optStr(args, 'assistantLanguage'),
    });
    nonEmpty(dto);
    await validated(UpdateSettingsDto, dto);
    const parts = [
      ...(dto.primaryCurrency
        ? [
            tr(
              ctx,
              `primary currency ${dto.primaryCurrency}`,
              `основная валюта ${dto.primaryCurrency}`,
            ),
          ]
        : []),
      ...(dto.weekStartsOn !== undefined
        ? [
            tr(
              ctx,
              `week starts on ${weekdays(ctx, [dto.weekStartsOn as number])}`,
              `неделя с ${weekdays(ctx, [dto.weekStartsOn as number])}`,
            ),
          ]
        : []),
      ...(dto.lessonReminderMinutes !== undefined
        ? [
            tr(
              ctx,
              `reminder ${dto.lessonReminderMinutes} min before`,
              `напоминание за ${dto.lessonReminderMinutes} мин`,
            ),
          ]
        : []),
      ...(dto.aiLanguage
        ? [tr(ctx, `assistant language ${dto.aiLanguage}`, `язык ассистента ${dto.aiLanguage}`)]
        : []),
    ];
    return { args: { dto }, summary: `${tr(ctx, 'Settings', 'Настройки')}: ${parts.join(', ')}` };
  }

  private async proposeCalendarSync(ctx: ToolContext): Promise<Proposal> {
    const status = await this.calendar.getStatus(ctx.userId);
    if (!status.calendarEnabled) {
      throw new BadRequestException(
        'Google Calendar is not connected; it can only be connected in Settings',
      );
    }
    return {
      args: {},
      summary: tr(
        ctx,
        'Sync lessons to Google Calendar now',
        'Синхронизировать уроки с Google Календарём',
      ),
    };
  }
}
