import { IsIn, IsOptional } from 'class-validator';
import { SUPPORTED_CURRENCIES, ThemeEnum, LocaleEnum, type Currency, type Locale, type Theme } from '@tutor-finance/shared';

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  primaryCurrency?: Currency;

  @IsOptional()
  @IsIn(ThemeEnum.options as unknown as string[])
  theme?: Theme;

  @IsOptional()
  @IsIn(LocaleEnum.options as unknown as string[])
  locale?: Locale;
}

export interface SettingsResponse {
  primaryCurrency: Currency;
  theme: Theme;
  locale: Locale;
}
