import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, Max, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MoneyDto } from '../students/students.dto.js';
import { LessonStatusEnum, type Currency, type LessonStatus } from '@tutor-finance/shared';

export class CreateLessonDto {
  @IsUUID()
  studentId!: string;

  @IsDateString()
  startsAt!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsIn(LessonStatusEnum.options as unknown as string[])
  status!: LessonStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  priceOverride?: MoneyDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;
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
  @IsIn(LessonStatusEnum.options as unknown as string[])
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

  @IsOptional()
  @IsString()
  meetingLink?: string;
}

export class LessonFilterDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsIn(LessonStatusEnum.options as unknown as string[])
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

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  showArchived?: boolean;
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
  meetingLink: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
