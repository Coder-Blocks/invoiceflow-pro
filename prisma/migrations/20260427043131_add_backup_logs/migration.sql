-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupLog_organizationId_idx" ON "BackupLog"("organizationId");

-- CreateIndex
CREATE INDEX "BackupLog_type_idx" ON "BackupLog"("type");

-- AddForeignKey
ALTER TABLE "BackupLog" ADD CONSTRAINT "BackupLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
