import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const adminDb = getAdminDb();

    // 1. Limpar todos os registros da coleção 'registrations'
    const regSnap = await adminDb.collection("registrations").get();
    if (!regSnap.empty) {
      const batchSize = 400;
      for (let i = 0; i < regSnap.docs.length; i += batchSize) {
        const batch = adminDb.batch();
        const chunk = regSnap.docs.slice(i, i + batchSize);
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // 2. Zerar o contador de inscritos em todas as palestras
    const lecSnap = await adminDb.collection("lectures").get();
    if (!lecSnap.empty) {
      const lecBatch = adminDb.batch();
      lecSnap.docs.forEach((doc) => {
        lecBatch.update(doc.ref, { currentEnrollments: 0 });
      });
      await lecBatch.commit();
    }

    // 3. Limpar salas da fila de espera se houver
    const queueSnap = await adminDb.collection("waiting_room").get();
    if (!queueSnap.empty) {
      const qBatch = adminDb.batch();
      queueSnap.docs.forEach((doc) => qBatch.delete(doc.ref));
      await qBatch.commit();
    }

    return NextResponse.json({
      success: true,
      message: "Todas as vagas foram liberadas e as inscrições foram zeradas com sucesso!",
      clearedRegistrations: regSnap.size,
      resetLectures: lecSnap.size,
    });
  } catch (error: any) {
    console.error("Erro ao resetar inscrições e vagas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao zerar vagas" },
      { status: 500 }
    );
  }
}
