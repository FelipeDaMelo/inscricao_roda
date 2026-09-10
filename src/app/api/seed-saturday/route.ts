import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();

    // Check if Saturday lectures already exist
    const snap = await adminDb
      .collection("lectures")
      .where("date", "==", "2026-09-19")
      .get();

    if (!snap.empty) {
      const b = adminDb.batch();
      snap.docs.forEach((doc) => b.delete(doc.ref));
      await b.commit();
    }

    const saturdayActivities = [
      {
        title: "Oficina de Design com a Belas Artes",
        timeSlot: "10:00 - 11:30",
        location: "Sala Maker (térreo)",
        roomNumber: "Maker",
        category: "Artes",
        maxCapacity: 20,
        currentEnrollments: 0,
        date: "2026-09-19",
        courses: "Design Gráfico, Design de Produto, Artes Visuais e Comunicação",
        description: "Oficina prática imersiva de Design conduzida pelo Centro Universitário Belas Artes.",
        guests: "Centro Universitário Belas Artes",
        mediator: "Facilitadores Belas Artes",
        speaker: "Belas Artes",
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      {
        title: "Oficina Missão Hacker com a FIAP",
        timeSlot: "10:00 - 11:00",
        location: "Sala 03 (térreo)",
        roomNumber: "03",
        category: "Tecnologia",
        maxCapacity: 35,
        currentEnrollments: 0,
        date: "2026-09-19",
        courses: "Cibersegurança, Engenharia de Software, Inteligência Artificial e Redes",
        description: "Oficina prática com desafios de tecnologia e cibersegurança com a equipe FIAP.",
        guests: "FIAP - Faculdade de Informática e Administração Paulista",
        mediator: "Equipe FIAP",
        speaker: "FIAP",
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      {
        title: "Palestra Geral – “Profissões do futuro e o bom uso da Inteligência Artificial”",
        timeSlot: "10:30 - 11:30",
        location: "Auditório (térreo)",
        roomNumber: "Auditório",
        category: "Tecnologia",
        maxCapacity: 99999,
        isUnlimited: true,
        currentEnrollments: 0,
        date: "2026-09-19",
        courses: "Carreiras do Futuro, Inovação, Tecnologia, Neurociência e Mercado de Trabalho",
        description: "Painel especial sobre o impacto da Inteligência Artificial nas profissões e carreiras. Atividade aberta com participação livre para todos os alunos.",
        guests: "IBMEC, FIAP, ESPM e mãe Marista neurocientista",
        mediator: "Coordenação Pedagógica",
        speaker: "Especialistas Convidados (IBMEC, FIAP, ESPM, Neurocientista)",
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      },
    ];

    const batch = adminDb.batch();
    for (const act of saturdayActivities) {
      const docRef = adminDb.collection("lectures").doc();
      batch.set(docRef, act);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Atividades oficiais de sábado (19/09) cadastradas com sucesso!",
      count: saturdayActivities.length,
    });
  } catch (error: any) {
    console.error("Erro ao cadastrar atividades de sábado:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
