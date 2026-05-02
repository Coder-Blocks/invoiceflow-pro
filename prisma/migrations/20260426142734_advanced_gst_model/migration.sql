-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "placeOfSupply" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "gstType" TEXT NOT NULL DEFAULT 'INTRA',
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "vendorGstin" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "gstType" TEXT NOT NULL DEFAULT 'INTRA',
ADD COLUMN     "hsnCode" TEXT;
