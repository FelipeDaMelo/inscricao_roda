import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { hasTimeConflict } from "@/lib/utils";
import { processRegistration } from "@/lib/registration-service";
import { verifyAdminRequest } from "@/lib/auth-guard";

// Prevenir pre-rendering no build
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { studentId, lectureId, lectureIds, replaceExisting } = body;

    // Apenas requisições com autenticação válida de admin recebem privilégios de administrador
    const authCheck = await verifyAdminRequest(request);
    const isAdmin = authCheck.authorized;

    const targetLectureIds: string[] = Array.isArray(lectureIds)
      ? lectureIds
      : lectureId
      ? [lectureId]
      : [];

    if (!studentId || targetLectureIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Matrícula e pelo menos uma palestra são obrigatórias" },
        { status: 400 }
      );
    }

    if (targetLectureIds.length > 2) {
      return NextResponse.json(
        { success: false, error: "Você só pode selecionar até 2 palestras." },
        { status: 400 }
      );
    }

    const result = await processRegistration({
      studentId,
      lectureIds: targetLectureIds,
      replaceExisting,
      isAdmin,
    });

    return NextResponse.json({
      success: true,
      data: {
        registrations: result,
        registration: result[0],
      },
    });
  } catch (error: any) {
    console.error("Erro na inscrição (Transaction):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar inscrição" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { registrationId, studentId, lectureId, clearAll } = body;

    const authCheck = await verifyAdminRequest(request);
    const isAdmin = authCheck.authorized;

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Inscrições confirmadas são definitivas e não podem ser canceladas pelos estudantes.",
        },
        { status: 403 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Matrícula é obrigatória" },
        { status: 400 }
      );
    }

    await adminDb.runTransaction(async (transaction) => {
      if (clearAll) {
        const existingRegsRef = adminDb
          .collection("registrations")
          .where("studentId", "==", studentId);
        const existingRegsSnap = await transaction.get(existingRegsRef);

        for (const doc of existingRegsSnap.docs) {
          const reg = doc.data();
          const lectureRef = adminDb.collection("lectures").doc(reg.lectureId);
          transaction.update(lectureRef, {
            currentEnrollments: FieldValue.increment(-1),
          });
          transaction.delete(doc.ref);
        }
      } else {
        if (!registrationId || !lectureId) {
          throw new Error("Dados incompletos para cancelamento individual");
        }

        const regRef = adminDb.collection("registrations").doc(registrationId);
        const regDoc = await transaction.get(regRef);

        if (!regDoc.exists) {
          throw new Error("Inscrição não encontrada.");
        }

        const regData = regDoc.data()!;
        if (regData.studentId !== studentId) {
          throw new Error("Não autorizado a cancelar esta inscrição.");
        }

        const lectureRef = adminDb.collection("lectures").doc(lectureId);
        transaction.update(lectureRef, {
          currentEnrollments: FieldValue.increment(-1),
        });

        transaction.delete(regRef);
      }
    });

    return NextResponse.json({
      success: true,
      message: clearAll
        ? "Todas as inscrições foram canceladas com sucesso"
        : "Inscrição cancelada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao cancelar inscrição:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cancelar inscrição" },
      { status: 400 }
    );
  }
}
