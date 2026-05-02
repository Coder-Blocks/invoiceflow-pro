import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileUrl = String(body.fileUrl || "");

    if (!fileUrl.startsWith("/uploads/")) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "public", fileUrl);

    const PDFParser = (await import("pdf2json")).default;
    const pdfParser = new PDFParser(null, true);

    const text = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(errData.parserError || errData);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const pages = pdfData?.Pages || [];

        const fullText = pages
          .flatMap((page: any) => page.Texts || [])
          .map((textItem: any) => {
            const raw = textItem.R?.[0]?.T || "";
            return safeDecode(String(raw));
          })
          .join(" ");

        resolve(fullText);
      });

      pdfParser.loadPDF(filePath);
    });

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error) {
    console.error("PDF2JSON_EXTRACT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to read PDF text",
      },
      { status: 500 }
    );
  }
}