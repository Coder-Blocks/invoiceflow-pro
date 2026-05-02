-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "AccountLedger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "AccountType" NOT NULL,
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountLedger_organizationId_idx" ON "AccountLedger"("organizationId");

-- CreateIndex
CREATE INDEX "AccountLedger_type_idx" ON "AccountLedger"("type");

-- CreateIndex
CREATE INDEX "AccountLedger_parentId_idx" ON "AccountLedger"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLedger_organizationId_name_key" ON "AccountLedger"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "AccountLedger" ADD CONSTRAINT "AccountLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountLedger" ADD CONSTRAINT "AccountLedger_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
