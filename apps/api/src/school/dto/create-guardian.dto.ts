import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsIn(GUARDIAN_STATUSES)
  status?: GuardianStatusDto;
}

