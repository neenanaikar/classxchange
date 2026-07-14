-- AlterTable
ALTER TABLE "Order" ADD COLUMN "requestedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "requestedNote" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "profileImageUrl" TEXT,
    "favoriteStudio" TEXT,
    "favoriteClass" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterWallet" TEXT NOT NULL,
    "addresseeWallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletA" TEXT NOT NULL,
    "walletB" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderWallet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onchainId" INTEGER,
    "sellerWallet" TEXT NOT NULL,
    "studio" TEXT NOT NULL,
    "classType" TEXT,
    "location" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "priceUsdc" INTEGER NOT NULL,
    "bondUsdc" INTEGER NOT NULL DEFAULT 0,
    "proofImageUrl" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Listing" ("bondUsdc", "classType", "createdAt", "expiresAt", "id", "location", "onchainId", "priceUsdc", "proofHash", "proofImageUrl", "sellerWallet", "status", "studio") SELECT "bondUsdc", "classType", "createdAt", "expiresAt", "id", "location", "onchainId", "priceUsdc", "proofHash", "proofImageUrl", "sellerWallet", "status", "studio" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_onchainId_idx" ON "Listing"("onchainId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Friendship_addresseeWallet_idx" ON "Friendship"("addresseeWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterWallet_addresseeWallet_key" ON "Friendship"("requesterWallet", "addresseeWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_walletA_walletB_key" ON "Conversation"("walletA", "walletB");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
