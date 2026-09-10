import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const lecturesSnap = await adminDb
      .collection("lectures")
      .where("isActive", "==", true)
      .get();

    const lectures = lecturesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      data: lectures,
    });
  } catch (error: any) {
    console.error("Erro ao listar palestras:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar palestras" },
      { status: 500 }
    );
  }
}
