import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  OFFICIAL_RELEASE_DATE_ISO,
  OFFICIAL_RELEASE_TIMESTAMP,
  isRegistrationOfficiallyReleased,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection("settings").doc("event").get();
    const rawData = doc.exists ? doc.data() || {} : {};

    const releaseDate = rawData.releaseDate || OFFICIAL_RELEASE_DATE_ISO;
    const releaseTimestamp = new Date(releaseDate).getTime() || OFFICIAL_RELEASE_TIMESTAMP;
    const serverNow = Date.now();
    const isReleased = isRegistrationOfficiallyReleased({
      releaseDate,
      forceOpen: rawData.forceOpen,
      registrationOpen: rawData.registrationOpen,
    });

    // A partir das 17h do dia 11/09, as inscrições de AMBOS os dias ficam liberadas
    // Antes das 17h, as inscrições ficam bloqueadas
    const day16Open = isReleased && rawData.day16Open !== false;
    const day19Open = isReleased && rawData.day19Open !== false;

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
        registrationOpen: isReleased && rawData.registrationOpen !== false,
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
