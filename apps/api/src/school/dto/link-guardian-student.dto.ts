import { IsNotEmpty, IsUUID } from 'class-validator';

export class LinkGuardianStudentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

