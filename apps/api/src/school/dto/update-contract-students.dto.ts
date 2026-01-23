import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateContractStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds!: string[];
}
