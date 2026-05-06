import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';

export class MoneyDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency!: Currency;
}

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  hourlyRate!: MoneyDto;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  defaultCurrency!: Currency;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  hourlyRate?: MoneyDto;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  defaultCurrency?: Currency;

  @IsOptional()
  @IsString()
  notes?: string;
}

export interface StudentResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  hourlyRate: { amount: number; currency: Currency };
  defaultCurrency: Currency;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
