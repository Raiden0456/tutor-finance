import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
}

export function BrandMark({ className, iconClassName }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-colors duration-200 ease-in-out dark:bg-white/15 dark:text-white',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-1/2 w-1/2', iconClassName)}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </span>
  );
}

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
}

export function BrandLogo({ className, markClassName, titleClassName }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark className={cn('h-9 w-9 rounded-lg', markClassName)} />
      <span className={cn('text-2xl font-bold tracking-tight', titleClassName)}>Uchetka</span>
    </span>
  );
}
