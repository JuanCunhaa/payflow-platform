import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  schoolName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  // Reserved for future captcha validation
  @IsString()
  @IsOptional()
  captchaToken?: string;
}
