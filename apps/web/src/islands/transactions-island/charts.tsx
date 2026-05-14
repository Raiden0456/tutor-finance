import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { Currency } from '@tutor-finance/shared';

const ieBarConfig = {
  income: { label: 'Income', color: 'var(--tf-jade)' },
  expense: { label: 'Expenses', color: 'var(--tf-coral)' },
} satisfies ChartConfig;

const pieCfg: ChartConfig = {
  amount: { label: 'Expenses' },
};

export function IncomeExpenseBarChart({
  data,
  currency,
}: {
  data: { date: string; income: number; expense: number }[];
  currency: Currency;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
        <CardDescription className="text-xs">Daily totals ({currency})</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ieBarConfig} className="aspect-auto h-56 w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent indicator="dashed" formatter={(v) => Number(v).toFixed(2)} />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryPieChart({
  data,
  currency,
}: {
  data: { name: string; amount: number; fill: string }[];
  currency: Currency;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Expenses by category</CardTitle>
        <CardDescription className="text-xs">
          Top {data.length} categories ({currency})
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={pieCfg}
          className="mx-auto aspect-square max-h-[220px] [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="name"
                  hideLabel
                  formatter={(v) => Number(v).toFixed(2)}
                />
              }
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              label={({ percent }) =>
                (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: item.fill }}
              />
              <span className="capitalize text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
