-- CreateEnum
CREATE TYPE "AdmitDataProvenance" AS ENUM ('VERIFIED', 'CARRIED', 'APPROX');

-- CreateEnum
CREATE TYPE "MajorRateSourceClass" AS ENUM ('UNIVERSITY', 'DERIVED', 'PUBLISHED', 'CONSENSUS', 'ESTIMATE', 'FITTED');

-- CreateEnum
CREATE TYPE "ProgramRankSourceClass" AS ENUM ('VERIFIED', 'LIST_ORDER', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "Archetype" AS ENUM ('HOLISTIC', 'RIGOR_HEAVY', 'GPA_HEAVY', 'RANK_STATE', 'BALANCED');

-- CreateEnum
CREATE TYPE "AthleticsTier" AS ENUM ('D1_FBS_POWER', 'D1_FBS_OTHER', 'D1_FCS', 'D1_NO_FOOTBALL', 'D2', 'D3', 'NAIA_OR_NONE');

-- CreateEnum
CREATE TYPE "Setting" AS ENUM ('URBAN', 'SUBURBAN', 'RURAL');

-- CreateEnum
CREATE TYPE "IncomeBand" AS ENUM ('LT_30K', 'B30_48K', 'B48_75K', 'B75_110K', 'GT_110K');

-- CreateEnum
CREATE TYPE "ReligiousPreference" AS ENUM ('REQUIRE', 'EXCLUDE', 'NO_PREFERENCE');

-- CreateTable
CREATE TABLE "College" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipedsUnitId" INTEGER,
    "scorecardId" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "admitRate" DOUBLE PRECISION,
    "admitRateProvenance" "AdmitDataProvenance",
    "usNewsRank" INTEGER,
    "usNewsRankProvenance" "AdmitDataProvenance",
    "inStateAdmitRate" DOUBLE PRECISION,
    "outOfStateAdmitRate" DOUBLE PRECISION,
    "satP25" INTEGER,
    "satP75" INTEGER,
    "actP25" INTEGER,
    "actP75" INTEGER,
    "testBlind" BOOLEAN,
    "superscores" BOOLEAN,
    "c7Rigor" INTEGER,
    "c7Gpa" INTEGER,
    "c7Test" INTEGER,
    "c7Rank" INTEGER,
    "c7Ec" INTEGER,
    "c7Service" INTEGER,
    "archetype" "Archetype",
    "netPriceAvg" INTEGER,
    "netPriceLt30k" INTEGER,
    "netPrice30to48k" INTEGER,
    "netPrice48to75k" INTEGER,
    "netPrice75to110k" INTEGER,
    "netPriceGt110k" INTEGER,
    "religiousAffiliation" TEXT,
    "enrollmentUndergrad" INTEGER,
    "setting" "Setting",
    "athleticsTier" "AthleticsTier",
    "ncaaDivision" TEXT,
    "conference" TEXT,
    "greekLife" BOOLEAN,
    "coOp" BOOLEAN,
    "classSizeUnder20Pct" DOUBLE PRECISION,
    "housingOnCampusPct" DOUBLE PRECISION,
    "meritAidPct" DOUBLE PRECISION,
    "studyAbroadRate" DOUBLE PRECISION,
    "firstYearRetentionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegeProgram" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "cipCode" TEXT NOT NULL,
    "cipTitle" TEXT,
    "admitRate" DOUBLE PRECISION,
    "admitRateSourceClass" "MajorRateSourceClass",
    "programRank" INTEGER,
    "programRankSourceClass" "ProgramRankSourceClass",
    "directAdmit" BOOLEAN,

    CONSTRAINT "CollegeProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "cipCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gpaUnweighted" DOUBLE PRECISION NOT NULL,
    "gpaGrade10" DOUBLE PRECISION,
    "gpaGrade11" DOUBLE PRECISION,
    "gpaGrade12" DOUBLE PRECISION,
    "apCoursesTaken" INTEGER NOT NULL,
    "apCoursesOffered" INTEGER,
    "satSuperscore" INTEGER,
    "actSuperscore" INTEGER,
    "notSubmittingScores" BOOLEAN NOT NULL DEFAULT false,
    "classRank" INTEGER,
    "classSize" INTEGER,
    "schoolDoesNotRank" BOOLEAN NOT NULL DEFAULT false,
    "volunteerHoursPerYear" INTEGER NOT NULL DEFAULT 0,
    "majorId" TEXT,
    "homeZip" TEXT NOT NULL,
    "homeState" TEXT,
    "budgetMaxNetPrice" INTEGER NOT NULL,
    "incomeBand" "IncomeBand",
    "maxDistanceMiles" INTEGER,
    "inStateOnly" BOOLEAN NOT NULL DEFAULT false,
    "religiousPreference" "ReligiousPreference" NOT NULL DEFAULT 'NO_PREFERENCE',
    "schoolSizeWeight" INTEGER NOT NULL DEFAULT 0,
    "schoolSizeDirection" INTEGER,
    "classSizeWeight" INTEGER NOT NULL DEFAULT 0,
    "classSizeDirection" INTEGER,
    "greekLifeWeight" INTEGER NOT NULL DEFAULT 0,
    "greekLifeDirection" INTEGER,
    "housingWeight" INTEGER NOT NULL DEFAULT 0,
    "housingDirection" INTEGER,
    "athleticsWeight" INTEGER NOT NULL DEFAULT 0,
    "athleticsDirection" INTEGER,
    "partySceneWeight" INTEGER NOT NULL DEFAULT 0,
    "partySceneDirection" INTEGER,
    "settingWeight" INTEGER NOT NULL DEFAULT 0,
    "settingSelections" "Setting"[],
    "academicSupportWeight" INTEGER NOT NULL DEFAULT 0,
    "meritAidWeight" INTEGER NOT NULL DEFAULT 0,
    "studyAbroadWeight" INTEGER NOT NULL DEFAULT 0,
    "coOpWeight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hoursPerWeek" DOUBLE PRECISION,
    "years" DOUBLE PRECISION,
    "tier" INTEGER,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogVersion" TEXT,
    "modelVersion" TEXT,
    "profileSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "College_ipedsUnitId_key" ON "College"("ipedsUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "College_scorecardId_key" ON "College"("scorecardId");

-- CreateIndex
CREATE INDEX "College_state_idx" ON "College"("state");

-- CreateIndex
CREATE INDEX "College_admitRate_idx" ON "College"("admitRate");

-- CreateIndex
CREATE INDEX "CollegeProgram_cipCode_idx" ON "CollegeProgram"("cipCode");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeProgram_collegeId_cipCode_key" ON "CollegeProgram"("collegeId", "cipCode");

-- CreateIndex
CREATE UNIQUE INDEX "Major_cipCode_key" ON "Major"("cipCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_profileId_position_key" ON "Activity"("profileId", "position");

-- CreateIndex
CREATE INDEX "SavedRun_userId_createdAt_idx" ON "SavedRun"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CollegeProgram" ADD CONSTRAINT "CollegeProgram_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRun" ADD CONSTRAINT "SavedRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
