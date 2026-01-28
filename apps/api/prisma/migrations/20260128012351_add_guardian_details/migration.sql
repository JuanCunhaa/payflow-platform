-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "address" JSONB,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "rg" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "birth_date" TIMESTAMP(3);
