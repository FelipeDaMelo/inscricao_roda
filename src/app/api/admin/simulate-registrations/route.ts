import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const adminDb = getAdminDb();

    // 1. Carregar alunos do arquivo alunos_2026.json
    const filePath = path.join(process.cwd(), "alunos_2026.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Arquivo alunos_2026.json não encontrado" },
        { status: 404 }
      );
    }

    const studentsRaw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Pegar uma amostra de alunos (ex: 60 alunos para popular bem as salas)
    const sampleStudents = studentsRaw.slice(0, 60);

    // 2. Carregar palestras ativas
    const lecturesSnap = await adminDb
      .collection("lectures")
      .where("isActive", "==", true)
      .get();

    if (lecturesSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Nenhuma palestra cadastrada" },
        { status: 400 }
      );
    }

    const lectures = lecturesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const lectures11h = lectures.filter((l) => l.timeSlot.startsWith("11"));
    const lectures12h = lectures.filter((l) => l.timeSlot.startsWith("12"));

    // Limpar inscrições anteriores
    const existingRegsSnap = await adminDb.collection("registrations").get();
    if (!existingRegsSnap.empty) {
      const deleteBatch = adminDb.batch();
      existingRegsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
    }

    // Resetar contadores de inscritos nas palestras
    const resetBatch = adminDb.batch();
    lectures.forEach((l) => {
      resetBatch.update(adminDb.collection("lectures").doc(l.id), {
        currentEnrollments: 0,
      });
    });
    await resetBatch.commit();

    // Gravar inscrições distribuídas entre as salas
    const regBatch = adminDb.batch();
    let regCount = 0;
    const lectureCounts: Record<string, number> = {};

    sampleStudents.forEach((student: any, i: number) => {
      const lec1 = lectures11h[i % lectures11h.length];
      const lec2 = lectures12h[(i + 1) % lectures12h.length];

      // Registro Rodada 1
      lectureCounts[lec1.id] = (lectureCounts[lec1.id] || 0) + 1;
      const ref1 = adminDb.collection("registrations").doc();
      regBatch.set(ref1, {
        studentId: student.matricula,
        studentName: student.nome,
        studentGrade: student.grade,
        lectureId: lec1.id,
        lectureTitle: lec1.title,
        lectureTimeSlot: lec1.timeSlot,
        position: lectureCounts[lec1.id],
        status: "confirmed",
        registeredAt: FieldValue.serverTimestamp(),
      });
      regCount++;

      // Registro Rodada 2
      lectureCounts[lec2.id] = (lectureCounts[lec2.id] || 0) + 1;
      const ref2 = adminDb.collection("registrations").doc();
      regBatch.set(ref2, {
        studentId: student.matricula,
        studentName: student.nome,
        studentGrade: student.grade,
        lectureId: lec2.id,
        lectureTitle: lec2.title,
        lectureTimeSlot: lec2.timeSlot,
        position: lectureCounts[lec2.id],
        status: "confirmed",
        registeredAt: FieldValue.serverTimestamp(),
      });
      regCount++;
    });

    await regBatch.commit();

    // Atualizar os contadores de cada palestra
    const updateCountsBatch = adminDb.batch();
    for (const [lecId, count] of Object.entries(lectureCounts)) {
      updateCountsBatch.update(adminDb.collection("lectures").doc(lecId), {
        currentEnrollments: count,
      });
    }
    await updateCountsBatch.commit();

    return NextResponse.json({
      success: true,
      message: `${regCount} inscrições gravadas com sucesso para ${sampleStudents.length} alunos!`,
      totalStudents: sampleStudents.length,
      totalRegistrations: regCount,
    });
  } catch (error: any) {
    console.error("Erro ao simular inscrições:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
