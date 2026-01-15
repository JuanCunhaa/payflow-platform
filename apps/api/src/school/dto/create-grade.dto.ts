import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

