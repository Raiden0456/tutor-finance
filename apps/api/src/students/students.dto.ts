import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import {
  PricingModeEnum,
  SUPPORTED_CURRENCIES,
  type Currency,
  type PricingMode,
  type StudentLessonPackage,
} from '@tutor-finance/shared';

export const MAX_MINOR_AMOUNT = 1_000_000_000_000;

export class MoneyDto {
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR_AMOUNT)
  amount!: number;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency!: Currency;
}

export class LessonPackageDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  lessonCount!: number;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;
}

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  hourlyRate?: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  ratePeriodMin?: number;

  @IsOptional()
  @IsIn(PricingModeEnum.options as unknown as string[])
  pricingMode?: PricingMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonPackageDto)
  @Expose({ name: 'package' })
  lessonPackage?: LessonPackageDto;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  defaultCurrency!: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  telegramLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whatsappLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  hourlyRate?: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  ratePeriodMin?: number;

  @IsOptional()
  @IsIn(PricingModeEnum.options as unknown as string[])
  pricingMode?: PricingMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonPackageDto)
  @Expose({ name: 'package' })
  lessonPackage?: LessonPackageDto;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  defaultCurrency?: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  telegramLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whatsappLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CloseStudentPackageDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  coveredLessons!: number;
}

export class UpdateStudentPackagePaymentDto {
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR_AMOUNT)
  paidAmount!: number;
}

export interface StudentResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  hourlyRate: { amount: number; currency: Currency };
  ratePeriodMin: number;
  pricingMode: PricingMode;
  activePackage: StudentLessonPackage | null;
  defaultCurrency: Currency;
  meetingLink: string | null;
  telegramLink: string | null;
  whatsappLink: string | null;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Lessons awaiting payment (due / partially paid); merged fresh on list responses. */
  dueLessonsCount?: number;
}
