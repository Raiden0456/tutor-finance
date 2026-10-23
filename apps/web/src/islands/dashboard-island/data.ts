import { displayStatus, type LessonStatus } from '@tutor-finance/shared';
import type { Lesson, Summary } from '@/lib/types';

type Getter = <T>(
  path: string,
  init?: { query?: Record<string, string | number | boolean | undefined> },
) => Promise<T>;

export interface DashboardData {
  upcoming: Lesson[];
  awaitingPayment: Lesson[];
  monthSummary: Summary;
}

const UNPAID_STATUSES: LessonStatus[] = ['due', 'partially_paid', 'completed'];
const LOOKAHEAD_DAYS = 7;

export async function fetchDashboardData(get: Getter): Promise<DashboardData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd = new Date(todayStart.getTime() + (LOOKAHEAD_DAYS + 1) * 86_400_000 - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [upcoming, monthSummary, ...unpaid] = await Promise.all([
    get<Lesson[]>('/lessons', {
      query: {
        from: todayStart.toISOString(),
        to: windowEnd.toISOString(),
        orderDir: 'asc',
        limit: 200,
      },
    }),
    get<Summary>('/dashboard/summary', {
      query: { from: monthStart.toISOString(), to: monthEnd.toISOString() },
    }),
    ...UNPAID_STATUSES.map((status) =>
      get<Lesson[]>('/lessons', { query: { status, orderDir: 'desc', limit: 100 } }),
    ),
  ]);

  const awaitingPayment = unpaid
    .flat()
    .filter((lesson) => displayStatus(lesson) === 'awaiting_payment')
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return { upcoming, awaitingPayment, monthSummary };
}
