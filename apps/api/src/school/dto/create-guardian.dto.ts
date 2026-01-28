import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const GUARDIAN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type GuardianStatusDto = (typeof GUARDIAN_STATUSES)[number];

export class CreateGuardianDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsIn(GUARDIAN_STATUSES)
  status?: GuardianStatusDto;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGuardianStudentDto)
  students?: CreateGuardianStudentDto[];
}

export class CreateGuardianStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  birthDate?: string;
}
