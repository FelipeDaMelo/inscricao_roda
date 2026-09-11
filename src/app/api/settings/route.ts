import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  OFFICIAL_RELEASE_DATE_ISO,
  OFFICIAL_RELEASE_TIMESTAMP,
  isRegistrationOfficiallyReleased,
} from "@/lib/utils";
import { verifyAdminRequest } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Cache em memória de 10 segundos para evitar avalanche de leituras no Firestore
let cachedSettingsData: any = null;
let lastSettingsCacheTime = 0;
const SETTINGS_CACHE_TTL_MS = 10000; // 10 segundos

export async function GET() {
  try {
    const serverNow = Date.now();

    // Se temos dados em cache válidos nos últimos 10 segundos, devolvemos instantaneamente
    if (cachedSettingsData && (serverNow - lastSettingsCacheTime < SETTINGS_CACHE_TTL_MS)) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...cachedSettingsData,
            serverTime: new Date().toISOString(),
            serverTimestamp: serverNow,
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
          },
        }
      );
    }

    const adminDb = getAdminDb();
    const doc = await adminDb.collection("settings").doc("event").get();
    const rawData = doc.exists ? doc.data() || {} : {};

    // A data e horário oficial de abertura é 20h (OFFICIAL_RELEASE_DATE_ISO)
    // Se no Firestore ainda estiver a antiga 17h, padronizamos para a oficial 20h
    const rawRelease = rawData.releaseDate;
    const releaseDate =
      !rawRelease || rawRelease.includes("17:00:00")
        ? OFFICIAL_RELEASE_DATE_ISO
        : rawRelease;
    const releaseTimestamp = new Date(releaseDate).getTime() || OFFICIAL_RELEASE_TIMESTAMP;
    const autoTimeReached = serverNow >= releaseTimestamp;

    // As inscrições estão liberadas se:
    // 1) O admin configurou forceOpen: true
    // 2) OU se o horário programado de abertura automática foi atingido (e registrationOpen !== false)
    const isReleased =
      rawData.forceOpen === true ||
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

    const computedData = {
      eventName: rawData.eventName || "Roda de Conversas & Oficinas 2026",
      eventDate: rawData.eventDate || "2026-09-16",
      maxLecturesPerStudent: rawData.maxLecturesPerStudent || 2,
      ...rawData,
      releaseDate,
      releaseTimestamp,
      isReleased,
      registrationOpen,
      day16Open,
      day19Open,
    };

    // Atualiza cache em memória
    cachedSettingsData = computedData;
    lastSettingsCacheTime = serverNow;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...computedData,
          serverTime: new Date().toISOString(),
          serverTimestamp: serverNow,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      }
    );
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

    // Invalida cache imediatamente após alteração pelo admin
    cachedSettingsData = null;
    lastSettingsCacheTime = 0;

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
