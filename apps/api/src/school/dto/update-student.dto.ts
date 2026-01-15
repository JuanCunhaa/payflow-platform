import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type StudentStatusDto = (typeof STUDENT_STATUSES)[number];

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatusDto;
}

