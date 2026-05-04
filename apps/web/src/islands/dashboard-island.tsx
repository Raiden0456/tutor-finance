import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fmtMoney, fmtDate } from '@/lib/format';
import type { Currency } from '@tutor-finance/shared';

interface CurrencyTotal {
  currency: Currency;
  amount: number;
  count: number;
}

interface Summary {
  from: string;
  to: string;
  targetCurrency: Currency;
  incomeInTargetCurrency: number;
  expenseInTargetCurrency: number;
  netInTargetCurrency: number;
  income: CurrencyTotal[];
  expense: CurrencyTotal[];
}

interface RecentLesson {
  id: string;
  startsAt: string;
  durationMin: number;
  status: string;
  studentId: string;
}

interface Props {
  summary: Summary;
  recentLessons: RecentLesson[];
  studentNames: Record<string, string>;
}

export function DashboardIsland({ summary, recentLessons, studentNames }: Props) {
  const data = useMemo(() => {
    const map = new Map<Currency, { currency: Currency; income: number; expense: number }>();
    for (const r of summary.income) {
      const e = map.get(r.currency) ?? { currency: r.currency, income: 0, expense: 0 };
      e.income += r.amount / 100;
      map.set(r.currency, e);
    }
    for (const r of summary.expense) {
      const e = map.get(r.currency) ?? { currency: r.currency, income: 0, expense: 0 };
      e.expense += r.amount / 100;
      map.set(r.currency, e);
    }
    return Array.from(map.values());
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Income</CardDescription>
            <CardTitle className="text-2xl">
              {fmtMoney(summary.incomeInTargetCurrency, summary.targetCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Expense</CardDescription>
            <CardTitle className="text-2xl">
              {fmtMoney(summary.expenseInTargetCurrency, summary.targetCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net</CardDescription>
            <CardTitle className="text-2xl">
              {fmtMoney(summary.netInTargetCurrency, summary.targetCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By currency (this month, native amounts)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="currency" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#10b981" />
              <Bar dataKey="expense" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons yet.</p>
          ) : (
            <ul className="divide-y">
              {recentLessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{studentNames[l.studentId] ?? l.studentId}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(l.startsAt)} · {l.durationMin} min
                    </div>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
