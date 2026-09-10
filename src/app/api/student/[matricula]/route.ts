import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { matricula: string } }
) {
  const { matricula } = params;

  if (!matricula) {
    return NextResponse.json(
      { success: false, error: "Matrícula é obrigatória" },
      { status: 400 }
    );
  }

  // Bypass livre de banco de dados para a chave mestre configurada em variável de ambiente
  const masterKey = process.env.ADMIN_MASTER_KEY;
  if (masterKey && matricula === masterKey) {
    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: masterKey,
          name: "Coordenação / Acesso Mestre",
          grade: "3ª Série EM",
          isMaster: true,
        },
        registrations: [],
      },
    });
  }

  try {
    const adminDb = getAdminDb();

    // 1. Buscar estudante no Firestore
    const studentDoc = await adminDb.collection("students").doc(matricula).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Matrícula não cadastrada. Verifique com a coordenação." },
        { status: 404 }
      );
    }

    const studentData = {
      id: studentDoc.id,
      ...studentDoc.data(),
    };

    // 2. Buscar inscrições existentes do estudante
    const registrationsSnap = await adminDb
      .collection("registrations")
      .where("studentId", "==", matricula)
      .get();

    const registrations = registrationsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lectureDate: data.lectureDate || "2026-09-16",
        registeredAt: data.registeredAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        student: studentData,
        registrations,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar estudante:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao consultar o banco de dados. Tente novamente mais tarde.",
      },
      { status: 500 }
    );
  }
}
