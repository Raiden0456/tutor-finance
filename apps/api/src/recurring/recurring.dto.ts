import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { SUPPORTED_CURRENCIES, FrequencyEnum, type Currency, type Frequency } from '@tutor-finance/shared';

export class CreateRecurringDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency!: Currency;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(FrequencyEnum.options as unknown as string[])
  frequency!: Frequency;

  @IsOptional()
  @IsString()
  startDate?: string;
}

export class UpdateRecurringDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency?: Currency;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(FrequencyEnum.options as unknown as string[])
  frequency?: Frequency;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface RecurringResponse {
  id: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string | null;
  frequency: Frequency;
  startDate: Date;
  nextDueAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
