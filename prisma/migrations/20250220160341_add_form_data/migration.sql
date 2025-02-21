/*
  Warnings:

  - Added the required column `blocks` to the `Form` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Form` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrivacySetting" AS ENUM ('PRIVATE', 'PUBLIC', 'READ_ONLY');

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "blocks" JSONB NOT NULL,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacy" "PrivacySetting" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "subheading" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL;
