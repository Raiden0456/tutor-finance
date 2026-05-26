import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PushPlatforms = ['ios', 'android'] as const;
export type PushPlatform = (typeof PushPlatforms)[number];

export class RegisterDeviceTokenDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsOptional()
  @IsIn(PushPlatforms as unknown as string[])
  platform?: PushPlatform;
}

export interface RegisterDeviceTokenResponse {
  ok: boolean;
}
