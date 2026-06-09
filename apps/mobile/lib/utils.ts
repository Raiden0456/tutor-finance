import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Static Onest font files: `font-medium|semibold|bold|extrabold` swap the
// fontFamily (see tailwind.config.js) instead of setting font-weight, so they
// CONFLICT with the `font-sans` base on Text. Teach tailwind-merge they're one
// group — the last class wins (e.g. cn('font-sans', 'font-bold') → font-bold).
// Without this, Tailwind's alphabetical CSS order would let font-sans override
// the heavier weights.
const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      'font-family': [{ font: ['sans', 'mono', 'medium', 'semibold', 'bold', 'extrabold'] }],
      'font-weight': [],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
