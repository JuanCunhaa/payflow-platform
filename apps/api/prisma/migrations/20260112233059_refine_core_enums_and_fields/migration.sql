/*
  Warnings:

  - The values [OWNER,ADMIN,MEMBER,VIEWER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The values [INACTIVE] on the enum `TenantStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [INACTIVE,PENDING,BLOCKED] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ADMIN,SCHOOL_ADMIN,TEACHER,PARENT,STUDENT] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `memberships` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tenants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Changed the type of `id` on the `memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `tenants` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- Enable CITEXT extension for case-insensitive email uniqueness
CREATE EXTENSION IF NOT EXISTS citext;
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('PLATFORM_ADMIN', 'SCHOOL_ADMIN', 'GUARDIAN', 'STAFF');
ALTER TABLE "memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "memberships" ALTER COLUMN "role" SET DEFAULT 'GUARDIAN';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TenantStatus_new" AS ENUM ('ACTIVE', 'DRAFT', 'SUSPENDED');
ALTER TABLE "tenants" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "status" TYPE "TenantStatus_new" USING ("status"::text::"TenantStatus_new");
ALTER TYPE "TenantStatus" RENAME TO "TenantStatus_old";
ALTER TYPE "TenantStatus_new" RENAME TO "TenantStatus";
DROP TYPE "TenantStatus_old";
ALTER TABLE "tenants" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('PLATFORM', 'STAFF', 'GUARDIAN');
ALTER TABLE "users" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "type" TYPE "UserType_new" USING ("type"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "UserType_old";
ALTER TABLE "users" ALTER COLUMN "type" SET DEFAULT 'GUARDIAN';
COMMIT;

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_user_id_fkey";

-- AlterTable
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'GUARDIAN',
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "password",
ADD COLUMN     "password_hash" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE CITEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL',
ALTER COLUMN "type" SET DEFAULT 'GUARDIAN',
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_tenant_id_key" ON "memberships"("user_id", "tenant_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
