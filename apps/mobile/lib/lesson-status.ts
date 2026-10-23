import type { DisplayStatus } from '@tutor-finance/shared';

// Class strings must stay literal here so Tailwind's scanner picks them up.
export const DISPLAY_STATUS_META: Record<
  DisplayStatus,
  { badgeClassName: string; textClassName: string }
> = {
  scheduled: { badgeClassName: 'bg-tf-indigo/15', textClassName: 'text-tf-indigo' },
  awaiting_payment: { badgeClassName: 'bg-tf-pollen/15', textClassName: 'text-tf-pollen' },
  paid: { badgeClassName: 'bg-tf-jade/15', textClassName: 'text-tf-jade' },
  cancelled: { badgeClassName: 'bg-muted', textClassName: 'text-muted-foreground' },
};
