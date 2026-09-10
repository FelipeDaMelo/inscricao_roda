import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "admin_session";

// Gera a assinatura esperada para o cookie de sessão baseado na chave mestre
export function getExpectedSessionSignature(): string {
  const secret = process.env.ADMIN_MASTER_KEY || "marista_admin_secret_key_2026";
  return crypto.createHmac("sha256", secret).update("marista_admin_authenticated").digest("hex");
}

export interface AdminAuthResult {
  authorized: boolean;
  userType?: "master" | "firebase";
  email?: string;
  error?: string;
}

/**
 * Valida se a requisição possui credenciais administrativas válidas:
 * 1. Cookie 'admin_session' assinado criptograficamente
 * 2. OU Token JWT do Firebase no header 'Authorization: Bearer <token>'
 * 3. OU Chave mestre enviada no header 'x-admin-key'
 */
export async function verifyAdminRequest(request: NextRequest): Promise<AdminAuthResult> {
  const masterKey = process.env.ADMIN_MASTER_KEY;
  const expectedSig = getExpectedSessionSignature();

  // 1. Validar via Cookie de Sessão
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie && sessionCookie === expectedSig) {
    return { authorized: true, userType: "master" };
  }

  // 2. Validar via Header x-admin-key
  const headerKey = request.headers.get("x-admin-key");
  if (headerKey && masterKey && headerKey.trim() === masterKey) {
    return { authorized: true, userType: "master" };
  }

  // 3. Validar via Token JWT do Firebase Auth (Header Authorization)
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1]?.trim();
    if (token) {
      try {
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(token);
        return {
          authorized: true,
          userType: "firebase",
          email: decoded.email,
        };
      } catch (err: any) {
        console.error("Token Firebase inválido:", err.message);
      }
    }
  }

  return {
    authorized: false,
    error: "Acesso não autorizado. É necessário efetuar login administrativo.",
  };
}

export { SESSION_COOKIE_NAME };
