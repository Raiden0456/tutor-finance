import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { SUPPORTED_CURRENCIES, TransactionTypeEnum, type Currency, type TransactionType } from '@tutor-finance/shared';

export class CreateTransactionDto {
  @IsIn(TransactionTypeEnum.options as unknown as string[])
  type!: TransactionType;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency!: Currency;

  @IsDateString()
  occurredAt!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency?: Currency;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TransactionFilterDto {
  @IsOptional()
  @IsIn(TransactionTypeEnum.options as unknown as string[])
  type?: TransactionType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  target?: Currency;
}

export interface TransactionResponse {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  occurredAt: Date;
  category: string;
  studentId: string | null;
  lessonId: string | null;
  description: string | null;
  convertedAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
