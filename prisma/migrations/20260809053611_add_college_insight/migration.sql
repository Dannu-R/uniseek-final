-- CreateTable
CREATE TABLE "CollegeInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "band" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollegeInsight_userId_collegeId_key" ON "CollegeInsight"("userId", "collegeId");

-- AddForeignKey
ALTER TABLE "CollegeInsight" ADD CONSTRAINT "CollegeInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
