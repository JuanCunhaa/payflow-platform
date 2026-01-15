import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

