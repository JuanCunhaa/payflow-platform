import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CONTRACT_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELED'] as const;

export type ContractStatusDto = (typeof CONTRACT_STATUSES)[number];

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsInt()
  @Min(1)
  @Max(28)
  dueDay!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: ContractStatusDto;
}

