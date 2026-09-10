import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { hasTimeConflict } from "@/lib/utils";

export interface ProcessRegistrationParams {
  studentId: string;
  lectureIds: string[];
  replaceExisting?: boolean;
  isAdmin?: boolean;
}

export async function processRegistration({
  studentId,
  lectureIds,
  replaceExisting = false,
  isAdmin = false,
}: ProcessRegistrationParams) {
  const adminDb = getAdminDb();

  if (!studentId || !lectureIds || lectureIds.length === 0) {
    throw new Error("Matrícula e pelo menos uma palestra são obrigatórias");
  }

  if (lectureIds.length > 2) {
    throw new Error("Você só pode selecionar até 2 palestras.");
  }

  // Executar via Firestore Transaction para garantir ACID, FIFO e integridade de vagas
  const result = await adminDb.runTransaction(async (transaction) => {
    // 1. Verificar se inscrições estão abertas
    const settingsRef = adminDb.collection("settings").doc("event");
    const settingsDoc = await transaction.get(settingsRef);
    if (settingsDoc.exists && settingsDoc.data()?.registrationOpen === false) {
      throw new Error("As inscrições estão temporariamente fechadas pela coordenação.");
    }

    // 2. Verificar se estudante existe
    const studentRef = adminDb.collection("students").doc(studentId);
    const studentDoc = await transaction.get(studentRef);

    if (!studentDoc.exists && studentId !== "19042011") {
      throw new Error("Estudante não encontrado no banco de dados.");
    }

    const studentData = studentDoc.exists
      ? studentDoc.data()!
      : {
          name: "Estudante Mestre",
          grade: "Coordenação",
        };

    // 4. Ler e validar todas as palestras selecionadas
    const lectureDocs: { id: string; ref: any; data: any }[] = [];
    for (const id of lectureIds) {
      const ref = adminDb.collection("lectures").doc(id);
      const doc = await transaction.get(ref);

      if (!doc.exists) {
        throw new Error("Palestra não encontrada.");
      }

      const data = doc.data()!;
      if (!data.isActive) {
        throw new Error(`A palestra "${data.title}" não está mais ativa.`);
      }

      if (data.currentEnrollments >= data.maxCapacity) {
        throw new Error(`Que pena! As vagas para "${data.title}" (${data.timeSlot}) acabaram de esgotar.`);
      }

      lectureDocs.push({ id, ref, data });
    }

    const targetDate = lectureDocs[0]?.data.date || "2026-09-16";

    // 3. Buscar inscrições existentes do estudante para a MESMA data
    const existingRegsRef = adminDb
      .collection("registrations")
      .where("studentId", "==", studentId);
    const existingRegsSnap = await transaction.get(existingRegsRef);

    const sameDayRegs = existingRegsSnap.docs.filter((d) => {
      const r = d.data();
      return (r.lectureDate || "2026-09-16") === targetDate;
    });

    const maxForDay = targetDate === "2026-09-16" ? 2 : 1;

    if (targetDate === "2026-09-19" && lectureIds.length > 1) {
      throw new Error("Para o sábado, você só pode selecionar 1 atividade (oficina ou palestra geral).");
    }

    // REGRA: Não permitir alterar horários/salas uma vez confirmada a inscrição para o dia
    if (!isAdmin && sameDayRegs.length >= maxForDay) {
      throw new Error(
        "Inscrição já confirmada para este dia! Conforme as regras do evento, não é permitido alterar após a confirmação."
      );
    }

    // Se for administrador e replaceExisting for true, permitir substituição
    if (isAdmin && replaceExisting && sameDayRegs.length > 0) {
      for (const doc of sameDayRegs) {
        const reg = doc.data();
        const prevLectureRef = adminDb.collection("lectures").doc(reg.lectureId);
        transaction.update(prevLectureRef, {
          currentEnrollments: FieldValue.increment(-1),
        });
        transaction.delete(doc.ref);
      }
    } else if (!isAdmin && sameDayRegs.length + lectureIds.length > maxForDay) {
      throw new Error("Você já possui inscrições confirmadas para este dia e não pode selecionar outras.");
    }

    // 5. Validar que não há conflito entre as próprias palestras selecionadas
    if (lectureDocs.length === 2) {
      const [l1, l2] = lectureDocs;
      if (l1.data.title === l2.data.title) {
        throw new Error("Você escolheu a mesma área duas vezes. Escolha salas diferentes para conhecer novos cursos!");
      }
      if (hasTimeConflict(l1.data.timeSlot, l2.data.timeSlot)) {
        throw new Error(`Conflito de horário entre as salas selecionadas (${l1.data.timeSlot}).`);
      }
    }

    // Se não for replaceExisting, checar conflito com inscrições existentes não removidas NA MESMA DATA
    if (!replaceExisting && sameDayRegs.length > 0) {
      for (const existingDoc of sameDayRegs) {
        const reg = existingDoc.data();
        for (const l of lectureDocs) {
          if (reg.lectureId === l.id) {
            throw new Error("Você já está inscrito nesta atividade.");
          }
          if (reg.lectureTitle === l.data.title) {
            throw new Error("Você já escolheu esta área. Escolha uma atividade diferente!");
          }
          if (hasTimeConflict(reg.lectureTimeSlot, l.data.timeSlot)) {
            throw new Error(`Conflito de horário com a atividade "${reg.lectureTitle}" (${reg.lectureTimeSlot}).`);
          }
        }
      }
    }

    // 6. Atualização atômica: Incrementa contadores e cria registros
    const createdRegistrations: any[] = [];
    for (const l of lectureDocs) {
      const newEnrollmentCount = (l.data.currentEnrollments || 0) + 1;

      transaction.update(l.ref, {
        currentEnrollments: FieldValue.increment(1),
      });

      const newRegRef = adminDb.collection("registrations").doc();
      const registrationPayload = {
        studentId,
        studentName: studentData.name,
        studentGrade: studentData.grade,
        lectureId: l.id,
        lectureTitle: l.data.title,
        lectureTimeSlot: l.data.timeSlot,
        lectureDate: l.data.date || "2026-09-16",
        position: newEnrollmentCount,
        status: "confirmed",
        registeredAt: FieldValue.serverTimestamp(),
      };

      transaction.set(newRegRef, registrationPayload);

      createdRegistrations.push({
        id: newRegRef.id,
        ...registrationPayload,
        registeredAt: new Date().toISOString(),
        position: newEnrollmentCount,
      });
    }

    return createdRegistrations;
  });

  // Liberar vaga na sala de espera ativa imediatamente
  try {
    const adminDb = getAdminDb();
    await adminDb.collection("active_sessions").doc(studentId).delete();
  } catch {}

  return result;
}
