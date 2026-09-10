import { NextRequest, NextResponse } from "next/server";
import { getExpectedSessionSignature, SESSION_COOKIE_NAME } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    const masterKey = process.env.ADMIN_MASTER_KEY;

    if (!masterKey) {
      return NextResponse.json(
        { success: false, error: "Chave mestre não configurada no servidor." },
        { status: 500 }
      );
    }

    const trimmedInput = String(key || "").trim();

    if (trimmedInput === masterKey) {
      const response = NextResponse.json({
        success: true,
        message: "Chave mestre validada com sucesso!",
      });

      // Configura o cookie de sessão seguro
      const signature = getExpectedSessionSignature();
      response.cookies.set(SESSION_COOKIE_NAME, signature, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 horas
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Chave inválida." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Sessão encerrada" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
