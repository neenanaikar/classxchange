-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onchainId" INTEGER,
    "sellerWallet" TEXT NOT NULL,
    "studio" TEXT NOT NULL,
    "classType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "priceUsdc" INTEGER NOT NULL,
    "bondUsdc" INTEGER NOT NULL DEFAULT 0,
    "proofImageUrl" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onchainId" INTEGER,
    "listingId" TEXT NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "amountUsdc" INTEGER NOT NULL,
    "deliveryProofUrl" TEXT,
    "deliveryProofHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'claimed',
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDeadline" DATETIME,
    "confirmDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedWinner" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Listing_onchainId_idx" ON "Listing"("onchainId");

-- CreateIndex
CREATE INDEX "Order_onchainId_idx" ON "Order"("onchainId");

-- CreateIndex
CREATE INDEX "Order_buyerWallet_idx" ON "Order"("buyerWallet");

-- CreateIndex
CREATE INDEX "Order_sellerWallet_idx" ON "Order"("sellerWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");
