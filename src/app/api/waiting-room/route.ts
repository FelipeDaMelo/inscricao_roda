import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const MAX_CONCURRENT_STUDENTS = 30;
const SESSION_TTL_MS = 1000 * 60 * 8; // 8 minutos máx por sessão
const HEARTBEAT_TTL_MS = 1000 * 75; // 75 segundos sem heartbeat = sessão abandonada

// Limpar sessões expiradas e retornar quantidade ativa
async function cleanupAndCountActiveSessions(adminDb: FirebaseFirestore.Firestore): Promise<number> {
  const now = Date.now();
  const sessionsSnap = await adminDb.collection("active_sessions").get();

  const batch = adminDb.batch();
  let activeCount = 0;

  for (const doc of sessionsSnap.docs) {
    const data = doc.data();
    const lastHeartbeat = data.lastHeartbeat?.toMillis
      ? data.lastHeartbeat.toMillis()
      : data.lastHeartbeat || 0;
    const enteredAt = data.enteredAt?.toMillis
      ? data.enteredAt.toMillis()
      : data.enteredAt || 0;

    const isHeartbeatExpired = now - lastHeartbeat > HEARTBEAT_TTL_MS;
    const isSessionMaxExpired = now - enteredAt > SESSION_TTL_MS;

    if (isHeartbeatExpired || isSessionMaxExpired) {
      batch.delete(doc.ref);
    } else {
      activeCount++;
    }
  }

  await batch.commit();
  return activeCount;
}

// Promover os próximos tickets em espera se houver vagas
async function promoteWaitingTickets(adminDb: FirebaseFirestore.Firestore, availableSlots: number) {
  if (availableSlots <= 0) return;

  const waitingSnap = await adminDb
    .collection("waiting_room")
    .where("status", "==", "waiting")
    .limit(availableSlots * 2)
    .get();

  if (waitingSnap.empty) return;

  // Ordenar estritamente por ticketNumber (FIFO)
  const sortedTickets = [...waitingSnap.docs].sort(
    (a, b) => (a.data().ticketNumber || 0) - (b.data().ticketNumber || 0)
  );

  const toPromote = sortedTickets.slice(0, availableSlots);
  for (const ticketDoc of toPromote) {
    const tData = ticketDoc.data();
    const studentId = tData.studentId;

    // Criar active_session
    const sessionRef = adminDb.collection("active_sessions").doc(studentId);
    await sessionRef.set({
      studentId,
      ticketId: ticketDoc.id,
      ticketNumber: tData.ticketNumber,
      enteredAt: FieldValue.serverTimestamp(),
      lastHeartbeat: FieldValue.serverTimestamp(),
    });

    // Marcar ticket como admitted
    await ticketDoc.ref.update({
      status: "admitted",
      admittedAt: FieldValue.serverTimestamp(),
    });
  }
}

// GET: Consultar status da fila de espera
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");
    const studentId = searchParams.get("studentId");

    if (!ticketId && !studentId) {
      return NextResponse.json(
        { success: false, error: "ticketId ou studentId é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Limpar sessões inativas e verificar lotação
    const activeCount = await cleanupAndCountActiveSessions(adminDb);
    const availableSlots = Math.max(0, MAX_CONCURRENT_STUDENTS - activeCount);

    // 2. Tentar promover quem estiver aguardando
    if (availableSlots > 0) {
      await promoteWaitingTickets(adminDb, availableSlots);
    }

    // 3. Verificar se o estudante já tem uma sessão ativa
    if (studentId) {
      const activeDoc = await adminDb.collection("active_sessions").doc(studentId).get();
      if (activeDoc.exists) {
        return NextResponse.json({
          success: true,
          admitted: true,
          inFront: 0,
          activeCount,
          maxCapacity: MAX_CONCURRENT_STUDENTS,
        });
      }
    }

    if (!ticketId) {
      return NextResponse.json({
        success: true,
        admitted: false,
        inFront: 0,
        activeCount,
        maxCapacity: MAX_CONCURRENT_STUDENTS,
      });
    }

    // 4. Buscar o ticket do estudante
    const ticketDoc = await adminDb.collection("waiting_room").doc(ticketId).get();
    if (!ticketDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Ticket da fila não encontrado" },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;

    // Se já foi admitido
    if (ticketData.status === "admitted") {
      return NextResponse.json({
        success: true,
        admitted: true,
        ticketNumber: ticketData.ticketNumber,
        inFront: 0,
        activeCount,
        maxCapacity: MAX_CONCURRENT_STUDENTS,
      });
    }

    // Contar quantas pessoas com status "waiting" têm ticketNumber menor
    const allWaitingSnap = await adminDb
      .collection("waiting_room")
      .where("status", "==", "waiting")
      .get();

    let inFrontCount = 0;
    allWaitingSnap.docs.forEach((d) => {
      const otherNumber = d.data().ticketNumber || 0;
      if (otherNumber < ticketData.ticketNumber) {
        inFrontCount++;
      }
    });

    return NextResponse.json({
      success: true,
      admitted: false,
      ticketNumber: ticketData.ticketNumber,
      inFront: inFrontCount,
      activeCount,
      maxCapacity: MAX_CONCURRENT_STUDENTS,
    });
  } catch (error: any) {
    console.error("Erro ao consultar fila de espera:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro na consulta da fila" },
      { status: 500 }
    );
  }
}

// POST: Entrar na fila ou obter acesso direto se houver vaga
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "studentId é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Chave mestre (19042011) ou admin sempre tem acesso direto
    if (studentId === "19042011" || body.isAdmin) {
      return NextResponse.json({
        success: true,
        admitted: true,
        inFront: 0,
      });
    }

    // 2. Verificar se o estudante já possui sessão ativa válida
    const existingSession = await adminDb.collection("active_sessions").doc(studentId).get();
    if (existingSession.exists) {
      // Renovar heartbeat
      await existingSession.ref.update({
        lastHeartbeat: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        admitted: true,
        inFront: 0,
      });
    }

    // 3. Limpar inativos e contar ativos
    const activeCount = await cleanupAndCountActiveSessions(adminDb);

    // 4. Verificar se há pessoas na fila de espera
    const waitingSnap = await adminDb
      .collection("waiting_room")
      .where("status", "==", "waiting")
      .get();

    // Se o estudante já tem um ticket esperando na fila, reutilizá-lo
    const myExistingTicket = waitingSnap.docs.find(
      (d) => d.data().studentId === studentId
    );

    if (myExistingTicket) {
      const myTicketData = myExistingTicket.data();
      let inFrontCount = 0;
      waitingSnap.docs.forEach((d) => {
        if ((d.data().ticketNumber || 0) < myTicketData.ticketNumber) {
          inFrontCount++;
        }
      });

      return NextResponse.json({
        success: true,
        admitted: false,
        ticketId: myExistingTicket.id,
        ticketNumber: myTicketData.ticketNumber,
        inFront: inFrontCount,
        activeCount,
        maxCapacity: MAX_CONCURRENT_STUDENTS,
      });
    }

    // 5. Se houver vagas (< 30) e NINGUÉM na fila: admitir imediatamente!
    if (activeCount < MAX_CONCURRENT_STUDENTS && waitingSnap.empty) {
      const sessionRef = adminDb.collection("active_sessions").doc(studentId);
      await sessionRef.set({
        studentId,
        enteredAt: FieldValue.serverTimestamp(),
        lastHeartbeat: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        admitted: true,
        inFront: 0,
        activeCount: activeCount + 1,
        maxCapacity: MAX_CONCURRENT_STUDENTS,
      });
    }

    // 6. Caso contrário: colocar na fila de espera com ticket sequencial
    let assignedTicketNumber = 101;
    const ticketDocRef = adminDb.collection("waiting_room").doc();

    await adminDb.runTransaction(async (transaction) => {
      const counterRef = adminDb.collection("counters").doc("waiting_room");
      const counterDoc = await transaction.get(counterRef);

      if (counterDoc.exists) {
        assignedTicketNumber = (counterDoc.data()?.lastTicketNumber || 100) + 1;
        transaction.update(counterRef, {
          lastTicketNumber: assignedTicketNumber,
        });
      } else {
        transaction.set(counterRef, {
          lastTicketNumber: assignedTicketNumber,
        });
      }

      transaction.set(ticketDocRef, {
        studentId,
        ticketNumber: assignedTicketNumber,
        status: "waiting",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    const inFrontCount = waitingSnap.size;

    return NextResponse.json({
      success: true,
      admitted: false,
      ticketId: ticketDocRef.id,
      ticketNumber: assignedTicketNumber,
      inFront: inFrontCount,
      activeCount,
      maxCapacity: MAX_CONCURRENT_STUDENTS,
    });
  } catch (error: any) {
    console.error("Erro ao entrar na fila de espera:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao entrar na fila" },
      { status: 500 }
    );
  }
}

// DELETE: Sair da sessão ativa ou da fila de espera (libera vaga imediatamente)
export async function DELETE(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const ticketId = searchParams.get("ticketId");

    if (studentId) {
      await adminDb.collection("active_sessions").doc(studentId).delete();
    }

    if (ticketId) {
      await adminDb.collection("waiting_room").doc(ticketId).delete();
    }

    // Promover o próximo da fila imediatamente
    const activeCount = await cleanupAndCountActiveSessions(adminDb);
    const availableSlots = Math.max(0, MAX_CONCURRENT_STUDENTS - activeCount);
    if (availableSlots > 0) {
      await promoteWaitingTickets(adminDb, availableSlots);
    }

    return NextResponse.json({ success: true, message: "Vaga liberada com sucesso" });
  } catch (error: any) {
    console.error("Erro ao liberar vaga:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao liberar vaga" },
      { status: 500 }
    );
  }
}
