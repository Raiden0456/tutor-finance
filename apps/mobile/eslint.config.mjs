import root from '../../eslint.config.mjs';

export default [
  ...root,
  {
    // Expo tooling configs must be CommonJS; don't lint them with TS/ESM rules.
    ignores: [
      'babel.config.js',
      'metro.config.js',
      'tailwind.config.js',
      'nativewind-env.d.ts',
      'expo-env.d.ts',
      '.expo/**',
    ],
  },
];
