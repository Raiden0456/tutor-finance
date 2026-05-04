import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Currency, Locale, Theme } from '../common/enums.js';
import type { Currency as CurrencyCode, Locale as LocaleCode, Theme as ThemeCode } from '@tutor-finance/shared';

@ObjectType('UserSettings')
export class UserSettingsType {
  @Field(() => Currency)
  primaryCurrency!: CurrencyCode;

  @Field(() => Theme)
  theme!: ThemeCode;

  @Field(() => Locale)
  locale!: LocaleCode;
}

@InputType('UserSettingsPatch')
export class UserSettingsPatch {
  @Field(() => Currency, { nullable: true })
  primaryCurrency?: CurrencyCode;

  @Field(() => Theme, { nullable: true })
  theme?: ThemeCode;

  @Field(() => Locale, { nullable: true })
  locale?: LocaleCode;
}
