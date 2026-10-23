import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class CreateThreadDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ThreadsQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}

export class StreamQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  after?: number;
}

export class ConnectQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnTo?: string;
}

export class ChatgptCallbackDto {
  @IsString()
  @MaxLength(8000)
  callbackUrl!: string;
}

export class ChatgptDisconnectQueryDto {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  forget?: boolean;
}

export class ConfirmAllActionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  ids!: string[];
}
