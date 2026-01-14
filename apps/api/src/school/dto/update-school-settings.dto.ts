import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSchoolSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  contactPhone?: string;
}

