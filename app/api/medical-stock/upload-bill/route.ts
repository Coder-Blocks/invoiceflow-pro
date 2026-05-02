import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Upload bill API working",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return NextResponse.json({
    success: true,
    message: "POST API working",
    received: body,
  });
}
