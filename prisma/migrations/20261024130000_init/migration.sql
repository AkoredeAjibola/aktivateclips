-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'CLIPPER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');
CREATE TYPE "ClipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'VERIFIED');
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "companyName" TEXT,
    "niche" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "earningsTotal" DECIMAL(12,2) DEFAULT 0,
    "campaignsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "niche" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "cpmRate" DECIMAL(12,2) NOT NULL,
    "viewTarget" INTEGER NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "platformFeePct" DECIMAL(5,2) NOT NULL,
    "depositPaid" DECIMAL(12,2) NOT NULL,
    "balanceDue" DECIMAL(12,2) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "slotsLimit" INTEGER NOT NULL DEFAULT 5,
    "claimedSlots" INTEGER NOT NULL DEFAULT 0,
    "adminNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clipperId" TEXT NOT NULL,
    "pageHandle" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "postUrl" TEXT NOT NULL,
    "postDate" TIMESTAMP(3) NOT NULL,
    "verificationWindowEnds" TIMESTAMP(3) NOT NULL,
    "verifiedViews" INTEGER NOT NULL DEFAULT 0,
    "status" "ClipStatus" NOT NULL DEFAULT 'PENDING',
    "payoutAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "SocialPage_userId_idx" ON "SocialPage"("userId");
CREATE INDEX "Campaign_clientId_idx" ON "Campaign"("clientId");
CREATE INDEX "Clip_campaignId_idx" ON "Clip"("campaignId");
CREATE INDEX "Clip_clipperId_idx" ON "Clip"("clipperId");
CREATE INDEX "Payment_campaignId_idx" ON "Payment"("campaignId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

ALTER TABLE "SocialPage" ADD CONSTRAINT "SocialPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_clipperId_fkey" FOREIGN KEY ("clipperId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
