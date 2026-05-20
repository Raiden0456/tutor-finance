import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  SUPPORTED_CURRENCIES,
  ThemeEnum,
  LocaleEnum,
  type Currency,
  type Locale,
  type Theme,
  type WeekStartsOn,
} from '@tutor-finance/shared';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: WeekStartsOn;
}

export interface SettingsResponse {
  primaryCurrency: Currency;
  theme: Theme;
  locale: Locale;
  weekStartsOn: WeekStartsOn;
}
