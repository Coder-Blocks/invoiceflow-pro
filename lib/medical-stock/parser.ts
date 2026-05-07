import type { MedicalStockRowInput } from "@/types/medical-stock";

type ParseBillResult = {
  rows: MedicalStockRowInput[];
  parseStatus: "SUCCESS" | "FAILED" | "UNSUPPORTED";
  parseMessage: string;
};

export async function parseUploadedMedicalBill(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ParseBillResult> {
  const { mimeType } = params;

  if (mimeType === "application/pdf") {
    return {
      rows: [],
      parseStatus: "UNSUPPORTED",
      parseMessage: "PDF uploaded successfully. Please enter medicine rows manually.",
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      rows: [],
      parseStatus: "FAILED",
      parseMessage: "Image uploaded successfully. Please enter medicine rows manually.",
    };
  }

  return {
    rows: [],
    parseStatus: "UNSUPPORTED",
    parseMessage: "File uploaded successfully. Please enter medicine rows manually.",
  };
}