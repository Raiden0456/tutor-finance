const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Static font files: `font-medium|semibold|bold` must swap the fontFamily
    // (see fontFamily below) WITHOUT also emitting font-weight — on Android a
    // custom fontFamily combined with fontWeight falls back to the system font.
    // Emptying fontWeight removes the colliding weight utilities entirely.
    fontWeight: {},
    extend: {
      colors: {
        // CSS vars hold HSL channels (e.g. `142 71% 45%`); the `/ <alpha-value>`
        // slot lets Tailwind opacity modifiers (bg-tf-jade/15, bg-primary/10…)
        // inject alpha instead of being silently dropped.
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        income: 'hsl(var(--income) / <alpha-value>)',
        expense: 'hsl(var(--expense) / <alpha-value>)',
        net: 'hsl(var(--net) / <alpha-value>)',
        tf: {
          coral: 'hsl(var(--tf-coral) / <alpha-value>)',
          pollen: 'hsl(var(--tf-pollen) / <alpha-value>)',
          jade: 'hsl(var(--tf-jade) / <alpha-value>)',
          teal: 'hsl(var(--tf-teal) / <alpha-value>)',
          indigo: 'hsl(var(--tf-indigo) / <alpha-value>)',
        },
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Onest_400Regular'],
        medium: ['Onest_500Medium'],
        semibold: ['Onest_600SemiBold'],
        bold: ['Onest_700Bold'],
        extrabold: ['Onest_700Bold'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
