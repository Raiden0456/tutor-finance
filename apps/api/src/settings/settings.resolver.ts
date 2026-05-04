import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserSettingsType, UserSettingsPatch } from './settings.types.js';
import { SettingsService } from './settings.service.js';
import { CurrentUser, CurrentUserData } from '../auth/current-user.decorator.js';
import type { UserSettingsDocument } from './settings.schema.js';

function toGql(doc: UserSettingsDocument | Record<string, unknown>): UserSettingsType {
  const obj = (doc as { toObject?: () => Record<string, unknown> }).toObject
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : (doc as Record<string, unknown>);
  return {
    primaryCurrency: obj.primaryCurrency as UserSettingsType['primaryCurrency'],
    theme: obj.theme as UserSettingsType['theme'],
    locale: obj.locale as UserSettingsType['locale'],
  };
}

@Resolver(() => UserSettingsType)
export class SettingsResolver {
  constructor(private readonly service: SettingsService) {}

  @Query(() => UserSettingsType)
  async mySettings(@CurrentUser() user: CurrentUserData): Promise<UserSettingsType> {
    const doc = await this.service.getOrCreate(user.id);
    return toGql(doc);
  }

  @Mutation(() => UserSettingsType)
  async updateMySettings(
    @CurrentUser() user: CurrentUserData,
    @Args('patch') patch: UserSettingsPatch,
  ): Promise<UserSettingsType> {
    const doc = await this.service.update(user.id, patch);
    return toGql(doc);
  }
}
