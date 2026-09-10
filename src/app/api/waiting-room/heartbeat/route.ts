import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: "studentId obrigatório" }, { status: 400 });
    }

    const sessionRef = adminDb.collection("active_sessions").doc(studentId);
    const sessionDoc = await sessionRef.get();

    if (sessionDoc.exists) {
      await sessionRef.update({
        lastHeartbeat: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, renewed: true });
    }

    return NextResponse.json({ success: false, error: "Sessão inativa" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
