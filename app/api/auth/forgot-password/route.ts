import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email required",
        },
        { status: 400 }
      );
    }

    const token = Math.random().toString(36).substring(2);
    const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${encodeURIComponent(
      email
    )}`;

    console.log("RESET TOKEN:", token);
    console.log("EMAIL:", email);
    console.log("RESET LINK:", resetLink);

    return NextResponse.json({
      success: true,
      message: "Reset link generated",
      resetLink,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}