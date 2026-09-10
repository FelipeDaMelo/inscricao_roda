import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Query } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get("lectureId");
    let query: Query = adminDb.collection("registrations");
    if (lectureId) {
      query = query.where("lectureId", "==", lectureId);
    }
    const snap = await query.get();
    const registrations = snap.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data, registeredAt: data.registeredAt?.toDate?.() || new Date() };
    });
    registrations.sort((a: any, b: any) => {
      const cleanA = (a.studentName || "").trim();
      const cleanB = (b.studentName || "").trim();
      const nameCompare = cleanA.localeCompare(cleanB, "pt-BR", {
        sensitivity: "base",
        numeric: true,
        ignorePunctuation: true,
      });
      if (nameCompare !== 0) return nameCompare;
      return (a.lectureTimeSlot || "").localeCompare(b.lectureTimeSlot || "");
    });
    return NextResponse.json({ success: true, total: registrations.length, data: registrations });
  } catch (error: any) {
    console.error("Erro ao listar inscrições:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
