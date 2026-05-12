import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MoneyDto } from '../students/students.dto.js';
import type { Currency, LessonStatus } from '@tutor-finance/shared';

export const LESSON_STATUSES = [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'due',
  'paid',
  'partially_paid',
] as const;

export class CreateLessonDto {
  @IsUUID()
  studentId!: string;

  @IsDateString()
  startsAt!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsIn(LESSON_STATUSES as unknown as string[])
  status!: LessonStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  priceOverride?: MoneyDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsIn(LESSON_STATUSES as unknown as string[])
  status?: LessonStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  paidAmount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  priceOverride?: MoneyDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LessonFilterDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsIn(LESSON_STATUSES as unknown as string[])
  status?: LessonStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc';
}

export interface LessonResponse {
  id: string;
  studentId: string;
  startsAt: Date;
  durationMin: number;
  status: LessonStatus;
  priceOverride: { amount: number; currency: Currency } | null;
  paidAmount: number | null;
  effectivePrice: { amount: number; currency: Currency } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
