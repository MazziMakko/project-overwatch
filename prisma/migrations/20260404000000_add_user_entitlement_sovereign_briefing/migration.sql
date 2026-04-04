-- AlterTable
ALTER TABLE "SovereignLead" ADD COLUMN IF NOT EXISTS "sovereignBriefing" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aegisPayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "overwatchProEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lemonSqueezyCustomerId" TEXT,
    "lastOrderIdentifier" TEXT,
    "lastSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_entitlements_userId_key" ON "user_entitlements"("userId");
