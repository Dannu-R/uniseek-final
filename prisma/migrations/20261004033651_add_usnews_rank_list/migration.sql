-- CreateEnum
CREATE TYPE "UsNewsRankList" AS ENUM ('NATIONAL_UNIVERSITIES', 'NATIONAL_LIBERAL_ARTS');

-- AlterTable
ALTER TABLE "College" ADD COLUMN     "usNewsRankList" "UsNewsRankList";
