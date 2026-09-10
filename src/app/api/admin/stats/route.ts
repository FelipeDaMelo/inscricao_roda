import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isLectureUnlimited } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const [studentsSnap, lecturesSnap, registrationsSnap] = await Promise.all([
      adminDb.collection("students").get(),
      adminDb.collection("lectures").get(),
      adminDb.collection("registrations").get(),
    ]);
    const totalStudents = studentsSnap.size;
    const totalLectures = lecturesSnap.size;
    const totalRegistrations = registrationsSnap.size;
    let activeLectures = 0;
    let totalCapacity = 0;
    let totalEnrollments = 0;
    lecturesSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isActive) activeLectures++;
      if (!isLectureUnlimited(data as any)) {
        totalCapacity += data.maxCapacity || 0;
        totalEnrollments += data.currentEnrollments || 0;
      }
    });
    const availableSpots = Math.max(0, totalCapacity - totalEnrollments);
    return NextResponse.json({
      success: true,
      data: { totalStudents, totalLectures, activeLectures, totalRegistrations, availableSpots, totalCapacity },
    });
  } catch (error: any) {
    console.error("Erro ao calcular estatísticas:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
