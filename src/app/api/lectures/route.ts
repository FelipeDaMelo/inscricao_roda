import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

let cachedLectures: any = null;
let lastLecturesCacheTime = 0;
const LECTURES_CACHE_TTL_MS = 10000; // 10 segundos

export async function GET() {
  try {
    const now = Date.now();
    if (cachedLectures && now - lastLecturesCacheTime < LECTURES_CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          data: cachedLectures,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
          },
        }
      );
    }

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

    cachedLectures = lectures;
    lastLecturesCacheTime = now;

    return NextResponse.json(
      {
        success: true,
        data: lectures,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao listar palestras:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar palestras" },
      { status: 500 }
    );
  }
}
