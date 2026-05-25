import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
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

export class MoneyDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency!: Currency;
}

export class LessonPackageDto {
  @IsInt()
  @Min(1)
  lessonCount!: number;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  hourlyRate?: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
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
  meetingLink?: string;

  @IsOptional()
  @IsString()
  telegramLink?: string;

  @IsOptional()
  @IsString()
  whatsappLink?: string;

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
  @IsInt()
  @Min(1)
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
  meetingLink?: string;

  @IsOptional()
  @IsString()
  telegramLink?: string;

  @IsOptional()
  @IsString()
  whatsappLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseStudentPackageDto {
  @IsInt()
  @Min(0)
  coveredLessons!: number;
}

export class UpdateStudentPackagePaymentDto {
  @IsInt()
  @Min(0)
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
}
