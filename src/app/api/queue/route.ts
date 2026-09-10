import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { processRegistration } from "@/lib/registration-service";

export const dynamic = "force-dynamic";

// Processador FIFO da fila de ingressos/inscrições
async function processQueueFIFO() {
  const adminDb = getAdminDb();

  // Buscar tickets esperando (sem exigir índice composto do Firestore)
  const waitingSnap = await adminDb
    .collection("queue")
    .where("status", "==", "waiting")
    .limit(10)
    .get();

  if (waitingSnap.empty) return;

  // Ordenar em memória pelo ticketNumber (Ordem estrita FIFO)
  const sortedDocs = [...waitingSnap.docs].sort(
    (a, b) => (a.data().ticketNumber || 0) - (b.data().ticketNumber || 0)
  );

  const ticketDoc = sortedDocs[0];
  const ticketData = ticketDoc.data();

  // Marcar como em processamento
  try {
    await ticketDoc.ref.update({
      status: "processing",
      startedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Outro processo concorrente já pode ter assumido
    return;
  }

  try {
    const registrations = await processRegistration({
      studentId: ticketData.studentId,
      lectureIds: ticketData.lectureIds,
    });

    await ticketDoc.ref.update({
      status: "completed",
      result: {
        registrations,
        registration: registrations[0],
      },
      completedAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    console.error("Erro ao processar ticket FIFO:", ticketData.ticketNumber, err);
    await ticketDoc.ref.update({
      status: "failed",
      error: err.message || "Erro ao processar inscrição na fila",
      failedAt: FieldValue.serverTimestamp(),
    });
  }

  // Chamar o próximo da fila recursivamente (FIFO)
  setTimeout(() => {
    processQueueFIFO().catch((e) => console.error("Erro no loop da fila:", e));
  }, 100);
}

// Helper para contar tickets ativos à frente sem exigir índice composto
async function calculateInFront(adminDb: any, targetTicketNumber: number) {
  const waitingSnap = await adminDb.collection("queue").where("status", "==", "waiting").get();
  const procSnap = await adminDb.collection("queue").where("status", "==", "processing").get();

  let count = 0;
  for (const doc of waitingSnap.docs) {
    if ((doc.data().ticketNumber || 0) < targetTicketNumber) count++;
  }
  for (const doc of procSnap.docs) {
    if ((doc.data().ticketNumber || 0) < targetTicketNumber) count++;
  }
  return count;
}

// 1. Entrar na Fila Virtual FIFO (Gerar Ingresso/Senha)
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { studentId, lectureIds } = body;

    if (!studentId || !Array.isArray(lectureIds) || lectureIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Matrícula e palestras são obrigatórias para entrar na fila" },
        { status: 400 }
      );
    }

    // 1. Verificar se estudante já possui inscrições confirmadas (Trava definitiva)
    const existingRegsSnap = await adminDb
      .collection("registrations")
      .where("studentId", "==", studentId)
      .get();

    if (existingRegsSnap.size >= 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Inscrição já confirmada! Conforme as regras do evento, não é permitido alterar salas ou horários após a confirmação.",
        },
        { status: 400 }
      );
    }

    // 2. Verificar se o estudante já possui um ticket ativo na fila
    const activeWaitSnap = await adminDb
      .collection("queue")
      .where("studentId", "==", studentId)
      .where("status", "==", "waiting")
      .limit(1)
      .get();

    const activeProcSnap = activeWaitSnap.empty
      ? await adminDb
          .collection("queue")
          .where("studentId", "==", studentId)
          .where("status", "==", "processing")
          .limit(1)
          .get()
      : null;

    const existingActiveTicket = !activeWaitSnap.empty
      ? activeWaitSnap.docs[0]
      : activeProcSnap && !activeProcSnap.empty
      ? activeProcSnap.docs[0]
      : null;

    if (existingActiveTicket) {
      const activeData = existingActiveTicket.data();
      const inFront = await calculateInFront(adminDb, activeData.ticketNumber);

      // Acionar processador da fila
      processQueueFIFO().catch(console.error);

      return NextResponse.json({
        success: true,
        ticketId: existingActiveTicket.id,
        ticketNumber: activeData.ticketNumber,
        position: inFront + 1,
        inFront,
        status: activeData.status,
      });
    }

    // 3. Gerar número de ticket sequencial atômico (FIFO)
    let assignedTicketNumber = 101;
    const ticketDocRef = adminDb.collection("queue").doc();

    await adminDb.runTransaction(async (transaction) => {
      const counterRef = adminDb.collection("counters").doc("queue");
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists) {
        assignedTicketNumber = 101;
        transaction.set(counterRef, { lastTicketNumber: 101 });
      } else {
        assignedTicketNumber = (counterDoc.data()?.lastTicketNumber || 100) + 1;
        transaction.update(counterRef, { lastTicketNumber: assignedTicketNumber });
      }

      transaction.set(ticketDocRef, {
        ticketNumber: assignedTicketNumber,
        studentId,
        lectureIds,
        status: "waiting",
        createdAt: FieldValue.serverTimestamp(),
        result: null,
        error: null,
      });
    });

    // 4. Calcular pessoas à frente
    const inFront = await calculateInFront(adminDb, assignedTicketNumber);

    // 5. Iniciar atendimento FIFO
    processQueueFIFO().catch(console.error);

    return NextResponse.json({
      success: true,
      ticketId: ticketDocRef.id,
      ticketNumber: assignedTicketNumber,
      position: inFront + 1,
      inFront,
      status: "waiting",
    });
  } catch (error: any) {
    console.error("Erro ao entrar na fila FIFO:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao ingressar na fila virtual" },
      { status: 500 }
    );
  }
}

// 2. Consultar status e posição do ingresso na Fila Virtual
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: "ticketId é obrigatório" },
        { status: 400 }
      );
    }

    // Acionar processamento FIFO para garantir fluidez
    await processQueueFIFO();

    const ticketDoc = await adminDb.collection("queue").doc(ticketId).get();
    if (!ticketDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Ingresso de fila não encontrado" },
        { status: 404 }
      );
    }

    const ticket = ticketDoc.data()!;

    if (ticket.status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        ticketNumber: ticket.ticketNumber,
        data: ticket.result,
      });
    }

    if (ticket.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        ticketNumber: ticket.ticketNumber,
        error: ticket.error,
      });
    }

    // Calcular posição atualizada na fila sem índice composto
    const inFront = await calculateInFront(adminDb, ticket.ticketNumber);

    return NextResponse.json({
      success: true,
      status: ticket.status, // "waiting" ou "processing"
      ticketId,
      ticketNumber: ticket.ticketNumber,
      position: inFront + 1,
      inFront,
    });
  } catch (error: any) {
    console.error("Erro ao consultar status da fila:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar status da fila" },
      { status: 500 }
    );
  }
}
