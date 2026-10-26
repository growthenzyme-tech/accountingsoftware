import { NextResponse } from "next/server";
import {
  adminAuth,
  AdminAuthConfigurationError,
} from "@/lib/firebase-admin-auth";


const SESSION_DURATION = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 503 }
      );
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(token, true);

    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: SESSION_DURATION,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION / 1000,
    });

    return response;
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      console.error("Session configuration error:", error.message);
      return NextResponse.json(
        { error: "Authentication service is not configured." },
        { status: 503 }
      );
    }

    const authCode =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    const invalidTokenCodes = [
      "auth/argument-error",
      "auth/id-token-expired",
      "auth/id-token-revoked",
      "auth/invalid-id-token",
      "auth/user-disabled",
      "auth/user-not-found",
    ];

    if (
      typeof authCode === "string" &&
      invalidTokenCodes.includes(authCode)
    ) {
      return NextResponse.json(
        { error: "Invalid or expired Firebase ID token." },
        { status: 401 }
      );
    }

    console.error("Session creation failed:", error);
    return NextResponse.json(
      { error: "Unable to create session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}