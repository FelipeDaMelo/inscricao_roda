import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  OFFICIAL_RELEASE_DATE_ISO,
  OFFICIAL_RELEASE_TIMESTAMP,
  isRegistrationOfficiallyReleased,
} from "@/lib/utils";
import { verifyAdminRequest } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection("settings").doc("event").get();
    const rawData = doc.exists ? doc.data() || {} : {};

    const releaseDate = rawData.releaseDate || OFFICIAL_RELEASE_DATE_ISO;
    const releaseTimestamp = new Date(releaseDate).getTime() || OFFICIAL_RELEASE_TIMESTAMP;
    const serverNow = Date.now();
    const autoTimeReached = serverNow >= releaseTimestamp;

    // As inscrições estão liberadas se:
    // 1) O admin configurou registrationOpen: true ou forceOpen: true
    // 2) OU se o horário programado de abertura automática foi atingido (e registrationOpen !== false)
    const isReleased =
      rawData.forceOpen === true ||
      rawData.registrationOpen === true ||
      (autoTimeReached && rawData.registrationOpen !== false);

    // Status dos dias respeita a escolha do admin se definida, ou segue isReleased
    const day16Open =
      rawData.day16Open !== undefined
        ? rawData.day16Open === true
        : isReleased;

    const day19Open =
      rawData.day19Open !== undefined
        ? rawData.day19Open === true
        : isReleased;

    const registrationOpen =
      rawData.registrationOpen !== undefined
        ? rawData.registrationOpen === true
        : isReleased;

    return NextResponse.json({
      success: true,
      data: {
        eventName: rawData.eventName || "Roda de Conversas & Oficinas 2026",
        eventDate: rawData.eventDate || "2026-09-16",
        maxLecturesPerStudent: rawData.maxLecturesPerStudent || 2,
        ...rawData,
        releaseDate,
        releaseTimestamp,
        serverTime: new Date().toISOString(),
        serverTimestamp: serverNow,
        isReleased,
        registrationOpen,
        day16Open,
        day19Open,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar configurações" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    await adminDb.collection("settings").doc("event").set(body, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
