-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "tradeRef" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "bookingEntityMnemonic" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3) NOT NULL,
    "actualSettlementDate" TIMESTAMP(3),
    "creditCategory" TEXT NOT NULL,
    "behaviorProfile" TEXT NOT NULL,
    "difficultyLevel" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "cutOffBreached" BOOLEAN NOT NULL DEFAULT false,
    "settlementApprovedAt" TIMESTAMP(3),
    "settlementApprovedBy" TEXT,
    "settlementPostedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_tradeRef_key" ON "Trade"("tradeRef");
