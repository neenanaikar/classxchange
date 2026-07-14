-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "onchainId" INTEGER,
    "sellerWallet" TEXT NOT NULL,
    "studio" TEXT NOT NULL,
    "classType" TEXT,
    "location" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "priceUsdc" INTEGER NOT NULL,
    "bondUsdc" INTEGER NOT NULL DEFAULT 0,
    "proofImageUrl" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "onchainId" INTEGER,
    "listingId" TEXT NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "amountUsdc" INTEGER NOT NULL,
    "deliveryProofUrl" TEXT,
    "deliveryProofHash" TEXT,
    "requestedAt" TIMESTAMP(3),
    "requestedNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'claimed',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDeadline" TIMESTAMP(3),
    "confirmDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedWinner" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "profileImageUrl" TEXT,
    "favoriteStudio" TEXT,
    "favoriteClass" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterWallet" TEXT NOT NULL,
    "addresseeWallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "walletA" TEXT NOT NULL,
    "walletB" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderWallet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Friendship_addresseeWallet_idx" ON "Friendship"("addresseeWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterWallet_addresseeWallet_key" ON "Friendship"("requesterWallet", "addresseeWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_walletA_walletB_key" ON "Conversation"("walletA", "walletB");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
