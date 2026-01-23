import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  @IsNotEmpty()
  gradeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
