export function isValidGSTIN(gstin?: string | null) {
  if (!gstin) return false;

  const cleaned = gstin.trim().toUpperCase();

  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleaned);
}

export function getGstSupplyType(gstin?: string | null) {
  return isValidGSTIN(gstin) ? "B2B" : "B2C";
}

export function splitGST({
  taxAmount,
  gstType,
}: {
  taxAmount: number;
  gstType?: string | null;
}) {
  if (gstType === "INTER") {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
    };
  }

  return {
    cgst: taxAmount / 2,
    sgst: taxAmount / 2,
    igst: 0,
  };
}

export function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}