import { IsIn, IsOptional } from 'class-validator';
import { SUPPORTED_CURRENCIES, type Currency, type Locale, type Theme } from '@tutor-finance/shared';

export const THEMES = ['light', 'dark', 'system'] as const;
export const LOCALES = ['en', 'ru'] as const;

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  primaryCurrency?: Currency;

  @IsOptional()
  @IsIn(THEMES as unknown as string[])
  theme?: Theme;

  @IsOptional()
  @IsIn(LOCALES as unknown as string[])
  locale?: Locale;
}

export interface SettingsResponse {
  primaryCurrency: Currency;
  theme: Theme;
  locale: Locale;
}
