import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col gap-2 sm:flex-row',
        month: 'flex flex-col gap-3 relative',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.7rem] font-medium uppercase text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: cn(
          'relative h-9 w-9 p-0 text-center text-sm',
          '[&:has([aria-selected].day-range-start)]:rounded-l-full',
          '[&:has([aria-selected].day-range-end)]:rounded-r-full',
          '[&:has([aria-selected].day-range-middle)]:bg-accent/60',
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 rounded-full p-0 font-normal aria-selected:opacity-100',
        ),
        range_start: 'day-range-start',
        range_middle:
          'day-range-middle aria-selected:rounded-none aria-selected:bg-transparent aria-selected:text-foreground',
        range_end: 'day-range-end',
        selected:
          'rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'font-semibold text-primary',
        outside: 'text-muted-foreground/60',
        disabled: 'text-muted-foreground/40 opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
