import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const GUARDIAN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type GuardianStatusDto = (typeof GUARDIAN_STATUSES)[number];

export class UpdateGuardianDto {
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

  @IsOptional()
  @IsIn(GUARDIAN_STATUSES)
  status?: GuardianStatusDto;
}

