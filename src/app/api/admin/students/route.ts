import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection("students").limit(500).get();
    const students = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, total: students.length, data: students });
  } catch (error: any) {
    console.error("Erro ao listar estudantes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const studentsList = Array.isArray(body) ? body : body.students;
    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return NextResponse.json({ success: false, error: 'Formato inválido. Envie um Array de alunos.' }, { status: 400 });
    }
    const BATCH_SIZE = 500;
    let importedCount = 0;
    for (let i = 0; i < studentsList.length; i += BATCH_SIZE) {
      const chunk = studentsList.slice(i, i + BATCH_SIZE);
      const batch = adminDb.batch();
      for (const item of chunk) {
        const matricula = String(item.id || item.matricula).trim();
        const name = String(item.name || item.nome).trim();
        let rawGrade = String(item.grade || item.serie || item.turma).trim();
        const grade = rawGrade
          .replace(/1º\s*ano/gi, "1ª Série")
          .replace(/2º\s*ano/gi, "2ª Série")
          .replace(/3º\s*ano/gi, "3ª Série")
          .replace(/\bano\b/gi, "Série");
        if (matricula && name) {
          const docRef = adminDb.collection("students").doc(matricula);
          batch.set(docRef, { name, grade: grade || "Ensino Médio", updatedAt: new Date() }, { merge: true });
          importedCount++;
        }
      }
      await batch.commit();
    }
    return NextResponse.json({ success: true, message: `${importedCount} estudantes importados/atualizados com sucesso!`, importedCount });
  } catch (error: any) {
    console.error("Erro na importação JSON de alunos:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const matricula = searchParams.get("id");
    if (!matricula) {
      return NextResponse.json({ success: false, error: "Matrícula é obrigatória" }, { status: 400 });
    }
    await adminDb.collection("students").doc(matricula).delete();
    return NextResponse.json({ success: true, message: "Estudante excluído com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir estudante:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
