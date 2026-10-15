-- CreateEnum
CREATE TYPE "AdmissionUnit" AS ENUM ('UNIVERSITY', 'SCHOOL', 'MAJOR');

-- AlterTable
ALTER TABLE "College" ADD COLUMN     "admissionUnit" "AdmissionUnit";
