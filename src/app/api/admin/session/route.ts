import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getExpectedSessionSignature, SESSION_COOKIE_NAME } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Checa se o usuário atual possui sessão de admin válida
export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  return NextResponse.json({
    authenticated: authCheck.authorized,
    userType: authCheck.userType || null,
    email: authCheck.email || null,
  });
}

// Permite sincronizar um token JWT do Firebase Auth com o cookie de sessão
export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, userType: authCheck.userType });
  const signature = getExpectedSessionSignature();
  response.cookies.set(SESSION_COOKIE_NAME, signature, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
