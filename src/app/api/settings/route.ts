import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection("settings").doc("event").get();
    if (!doc.exists) {
      // Configuração padrão caso não exista ainda
      return NextResponse.json({
        success: true,
        data: {
          eventName: "Roda de Profissões 2026",
          eventDate: "2026-09-15",
          registrationOpen: true,
          maxLecturesPerStudent: 0, // 0 = ilimitado (respeitando conflito de horário)
        },
      });
    }

    const rawData = doc.data() || {};
    return NextResponse.json({
      success: true,
      data: {
        eventName: rawData.eventName || "Roda de Conversas – 16/09",
        eventDate: rawData.eventDate || "2026-09-16",
        registrationOpen: rawData.registrationOpen !== false,
        day16Open: rawData.day16Open !== false,
        day19Open: rawData.day19Open === true,
        maxLecturesPerStudent: rawData.maxLecturesPerStudent || 2,
        ...rawData,
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
