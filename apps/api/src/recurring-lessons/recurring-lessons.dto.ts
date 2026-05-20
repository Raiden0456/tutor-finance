import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MoneyDto } from '../students/students.dto.js';
import {
  LessonFrequencyEnum,
  type LessonFrequency,
  type RecurringLesson,
} from '@tutor-finance/shared';

export class CreateRecurringLessonDto {
  @IsUUID()
  studentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (00:00–23:59)' })
  startTime!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsIn(LessonFrequencyEnum.options as unknown as string[])
  frequency!: LessonFrequency;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  priceOverride?: MoneyDto;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecurringLessonDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (00:00–23:59)' })
  startTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsIn(LessonFrequencyEnum.options as unknown as string[])
  frequency?: LessonFrequency;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  priceOverride?: MoneyDto | null;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export type RecurringLessonResponse = RecurringLesson;
