import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import * as XLSX from "xlsx";
import { Lecture, Registration } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminDb = getAdminDb();

    const [lecturesSnap, regsSnap] = await Promise.all([
      adminDb.collection("lectures").get(),
      adminDb.collection("registrations").get(),
    ]);

    const lectures: Lecture[] = lecturesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Lecture;
    });

    const registrations: Registration[] = regsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        registeredAt: data.registeredAt?.toDate?.() || new Date(),
      } as Registration;
    });

    const wb = XLSX.utils.book_new();

    // 1. Resumo Geral
    const studentMap = new Map<string, any>();
    for (const reg of registrations) {
      if (!studentMap.has(reg.studentId)) {
        studentMap.set(reg.studentId, {
          studentId: reg.studentId,
          studentName: reg.studentName,
          studentGrade: reg.studentGrade,
          registeredAt: reg.registeredAt ? new Date(reg.registeredAt) : undefined,
        });
      }
      const item = studentMap.get(reg.studentId);
      if (reg.lectureTimeSlot.startsWith("11")) item.reg11 = reg;
      if (reg.lectureTimeSlot.startsWith("12")) item.reg12 = reg;
    }

    const allStudents = Array.from(studentMap.values()).sort((a, b) => {
      const cleanA = (a.studentName || "").trim();
      const cleanB = (b.studentName || "").trim();
      const res = cleanA.localeCompare(cleanB, "pt-BR", {
        sensitivity: "base",
        numeric: true,
      });
      if (res !== 0) return res;
      return (a.studentId || "").localeCompare(b.studentId || "");
    });

    const resumoRows = [
      ["COLÉGIO MARISTA GLÓRIA — RODA DE CONVERSAS (16/09/2026)"],
      ["LISTA DE INSCRIÇÕES OFICIAL — ORDEM ALFABÉTICA (A a Z)"],
      [`Total de Estudantes com Inscrição: ${allStudents.length}`],
      [],
      [
        "Nº",
        "Matrícula",
        "Nome do Estudante (A-Z)",
        "Série",
        "1ª Opção (11h às 12h)",
        "Sala 11h",
        "2ª Opção (12h às 13h)",
        "Sala 12h",
        "Data da Inscrição",
      ],
      ...allStudents.map((s, idx) => {
        const lec11 = s.reg11 ? lectures.find((l) => l.id === s.reg11?.lectureId) : undefined;
        const lec12 = s.reg12 ? lectures.find((l) => l.id === s.reg12?.lectureId) : undefined;
        return [
          idx + 1,
          s.studentId,
          s.studentName,
          s.studentGrade,
          s.reg11?.lectureTitle || "Não selecionado",
          lec11?.location || (lec11?.roomNumber ? `Sala ${lec11.roomNumber}` : "-"),
          s.reg12?.lectureTitle || "Não selecionado",
          lec12?.location || (lec12?.roomNumber ? `Sala ${lec12.roomNumber}` : "-"),
          s.registeredAt ? s.registeredAt.toLocaleString("pt-BR") : "-",
        ];
      }),
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
    wsResumo["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 38 },
      { wch: 14 },
      { wch: 35 },
      { wch: 12 },
      { wch: 35 },
      { wch: 12 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Lista de Inscrições");

    // 2. Abas separadas por Horário e Sala (Estudantes em Ordem Alfabética)
    const sortedLectures = [...lectures].sort((a, b) => {
      const slotCompare = a.timeSlot.localeCompare(b.timeSlot);
      if (slotCompare !== 0) return slotCompare;
      return parseInt(a.roomNumber || "0") - parseInt(b.roomNumber || "0");
    });

    for (const lecture of sortedLectures) {
      const lectureRegs = registrations
        .filter((r) => r.lectureId === lecture.id)
        .sort((a, b) => {
          const cleanA = (a.studentName || "").trim();
          const cleanB = (b.studentName || "").trim();
          const res = cleanA.localeCompare(cleanB, "pt-BR", {
            sensitivity: "base",
            numeric: true,
          });
          if (res !== 0) return res;
          return (a.studentId || "").localeCompare(b.studentId || "");
        });

      const isSaturday = lecture.date === "2026-09-19";
      const hourPrefix = isSaturday
        ? "Sáb"
        : lecture.timeSlot.startsWith("11")
        ? "11h"
        : "12h";
      const roomLabel = lecture.roomNumber ? `Sala ${lecture.roomNumber}` : lecture.location || "Sala";
      const sheetName = `${hourPrefix} - ${roomLabel}`.slice(0, 31);

      const sheetRows: (string | number)[][] = [
        ["COLÉGIO MARISTA GLÓRIA — LISTA DE PRESENÇA OFICIAL"],
        [isSaturday ? "Evento: Oficinas & Palestra Geral – 19/09/2026" : "Evento: Roda de Conversas – 16/09/2026"],
        [`Horário: ${lecture.timeSlot} | Local: ${lecture.location || `Sala ${lecture.roomNumber}`}`],
        [`Atividade: ${lecture.title}`],
        [`Cursos / Temas: ${lecture.courses || lecture.description || "Geral"}`],
        [`Professor(a) / Mediador(a): ${lecture.mediator || lecture.speaker}`],
        [`Total de Estudantes Inscritos: ${lectureRegs.length} (Ordem Alfabética A-Z)`],
        [],
        [
          "Nº",
          "Matrícula",
          "Nome do Estudante (A-Z)",
          "Série",
          "Assinatura do Estudante",
          "Presença (P / F)",
          "Data / Hora Inscrição",
        ],
      ];

      if (lectureRegs.length === 0) {
        sheetRows.push(["-", "-", "Nenhum estudante inscrito nesta sala até o momento", "-", "", "", "-"]);
      } else {
        lectureRegs.forEach((reg, i) => {
          sheetRows.push([
            i + 1,
            reg.studentId,
            reg.studentName,
            reg.studentGrade,
            "",
            "",
            reg.registeredAt ? new Date(reg.registeredAt).toLocaleString("pt-BR") : "-",
          ]);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 40 },
        { wch: 15 },
        { wch: 34 },
        { wch: 16 },
        { wch: 22 },
      ];

      let finalSheetName = sheetName;
      let counter = 2;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName.slice(0, 28)} (${counter++})`;
      }

      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Lista_de_Presenca_Roda_de_Conversas_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar Excel:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
