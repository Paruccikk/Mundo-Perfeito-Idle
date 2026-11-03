CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "gold" BIGINT NOT NULL DEFAULT 0,
    "currentStageId" TEXT NOT NULL DEFAULT 'clearing-01',
    "combat" JSONB NOT NULL,
    "lastSimulatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tradeable" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ItemDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EconomyLedger" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EconomyLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE INDEX "Character_accountId_idx" ON "Character"("accountId");
CREATE UNIQUE INDEX "Character_accountId_nameKey_key" ON "Character"("accountId", "nameKey");
CREATE INDEX "InventoryItem_characterId_itemId_idx" ON "InventoryItem"("characterId", "itemId");
CREATE UNIQUE INDEX "EconomyLedger_operationId_key" ON "EconomyLedger"("operationId");
CREATE INDEX "EconomyLedger_characterId_createdAt_idx" ON "EconomyLedger"("characterId", "createdAt");

ALTER TABLE "Character" ADD CONSTRAINT "Character_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EconomyLedger" ADD CONSTRAINT "EconomyLedger_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
