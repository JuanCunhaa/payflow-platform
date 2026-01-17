import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class MarkInvoicePaidDto {
  @IsDateString()
  @IsNotEmpty()
  paidAt!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateIf((o) => o.receiptUrl !== undefined && o.receiptUrl !== null)
  @IsString()
  receiptUrl?: string | null;
}

