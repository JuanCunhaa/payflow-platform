import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type StudentStatusDto = (typeof STUDENT_STATUSES)[number];

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsUUID()
  @IsNotEmpty()
  classId!: string;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatusDto;
}

