import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { stripLocale } from '@/lib/i18n';

type SkeletonKind =
  | 'dashboard'
  | 'students'
  | 'student-detail'
  | 'lessons'
  | 'lesson-detail'
  | 'transactions'
  | 'settings'
  | 'generic';

function kindForPath(pathname: string): SkeletonKind {
  const clean = stripLocale(pathname);
  if (clean === '/' || clean === '') return 'dashboard';
  if (clean === '/students') return 'students';
  if (clean.startsWith('/students/')) return 'student-detail';
  if (clean === '/lessons') return 'lessons';
  if (clean.startsWith('/lessons/')) return 'lesson-detail';
  if (clean === '/transactions') return 'transactions';
  if (clean === '/settings') return 'settings';
  return 'generic';
}

function isNativeShell(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-native-shell') === 'true'
  );
}

export function PageSkeleton() {
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState<SkeletonKind>(() =>
    typeof window === 'undefined' ? 'generic' : kindForPath(window.location.pathname),
  );

  useEffect(() => {
    if (isNativeShell()) {
      setVisible(false);
      return;
    }

    function handleStart(event: Event) {
      const detail = event as Event & { to?: URL };
      const toUrl = detail.to;
      const pathname = toUrl instanceof URL ? toUrl.pathname : window.location.pathname;
      setKind(kindForPath(pathname));
      setVisible(true);
    }
    function handleEnd() {
      setVisible(false);
    }

    document.addEventListener('astro:before-preparation', handleStart);
    document.addEventListener('astro:after-swap', handleEnd);
    document.addEventListener('astro:page-load', handleEnd);

    return () => {
      document.removeEventListener('astro:before-preparation', handleStart);
      document.removeEventListener('astro:after-swap', handleEnd);
      document.removeEventListener('astro:page-load', handleEnd);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={
        'pointer-events-none fixed inset-0 z-40 overflow-hidden bg-background transition-opacity duration-150 md:left-56 ' +
        (visible ? 'opacity-100' : 'opacity-0')
      }
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
    >
      {/* Mobile: minimal spinner */}
      <div className="flex h-full w-full items-center justify-center md:hidden">
        <Spinner className="size-8 text-primary" />
      </div>
      {/* Desktop: layout-shaped skeleton */}
      <div className="hidden md:block">
        <div className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-8">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-8 pt-6">
          <SkeletonBody kind={kind} />
        </div>
      </div>
    </div>
  );
}

function SkeletonBody({ kind }: { kind: SkeletonKind }) {
  switch (kind) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'students':
      return <StudentsSkeleton />;
    case 'student-detail':
      return <StudentDetailSkeleton />;
    case 'lessons':
      return <LessonsSkeleton />;
    case 'lesson-detail':
      return <LessonDetailSkeleton />;
    case 'transactions':
      return <TransactionsSkeleton />;
    case 'settings':
      return <SettingsSkeleton />;
    default:
      return <GenericSkeleton />;
  }
}

function CardBlock({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardBlock key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </CardBlock>
        ))}
      </div>
      <CardBlock>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </CardBlock>
      <div className="grid gap-4 md:grid-cols-2">
        <CardBlock>
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardBlock>
        <CardBlock>
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardBlock>
      </div>
    </div>
  );
}

function StudentsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <CardBlock>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40 w-full" />
      </CardBlock>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardBlock key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4" />
          </CardBlock>
        ))}
      </div>
    </div>
  );
}

function StudentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-7 w-40" />
      </div>
      <CardBlock>
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardBlock>
      <CardBlock>
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </CardBlock>
    </div>
  );
}

function LessonsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <CardBlock>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md md:h-10" />
          ))}
        </div>
      </CardBlock>
      <CardBlock>
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardBlock>
    </div>
  );
}

function LessonDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-7 w-48" />
      </div>
      <CardBlock>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </div>
      </CardBlock>
      <CardBlock>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-20 w-full" />
      </CardBlock>
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <CardBlock>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full" />
      </CardBlock>
      <CardBlock>
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1">
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </CardBlock>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: 3 }).map((_, section) => (
        <CardBlock key={section}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex flex-col gap-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </CardBlock>
      ))}
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-7 w-40" />
      <CardBlock>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full" />
      </CardBlock>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardBlock key={i}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </CardBlock>
        ))}
      </div>
    </div>
  );
}
