import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGuardianMeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone?: string;
}
