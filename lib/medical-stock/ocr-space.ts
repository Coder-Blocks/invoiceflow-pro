const OCR_SPACE_BASE_URL =
  process.env.OCR_SPACE_BASE_URL?.trim() || "https://api.ocr.space/parse/image";

type OcrSpaceParsedResult = {
  ParsedText?: string;
};

type OcrSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ParsedResults?: OcrSpaceParsedResult[];
};

function getOcrSpaceApiKey() {
  const key = process.env.OCR_SPACE_API_KEY?.trim();

  if (!key) {
    throw new Error("OCR_SPACE_API_KEY is not configured.");
  }

  return key;
}

export async function extractTextWithOcrSpace(file: File): Promise<string> {
  const apiKey = getOcrSpaceApiKey();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("apikey", apiKey);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");
  formData.append("detectOrientation", "true");
  formData.append("isTable", "true");

  const response = await fetch(OCR_SPACE_BASE_URL, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(rawText || "OCR.Space request failed.");
  }

  if (!contentType.includes("application/json")) {
    throw new Error(rawText || "OCR.Space returned non-JSON response.");
  }

  const json = JSON.parse(rawText) as OcrSpaceResponse;

  if (json.IsErroredOnProcessing) {
    const message = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join(", ")
      : json.ErrorMessage || "OCR processing failed.";
    throw new Error(message);
  }

  const parsedText = (json.ParsedResults || [])
    .map((item) => item.ParsedText || "")
    .join("\n")
    .trim();

  return parsedText;
}