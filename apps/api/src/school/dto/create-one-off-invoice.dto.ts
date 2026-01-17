import { IsDateString, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateOneOffInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsUUID()
  @IsNotEmpty()
  guardianId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsDateString()
  dueDate!: string;

  @IsNotEmpty()
  description!: string;
}

