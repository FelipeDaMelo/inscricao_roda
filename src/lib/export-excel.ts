import * as XLSX from "xlsx";
import { Lecture, Registration } from "@/types";

/**
 * Gera e dispara o download da planilha oficial de presença em Excel (.xlsx)
 * com abas separadas por sala e horário (11h e 12h) e aba de Resumo Geral.
 */
export function exportAttendanceExcel(
  lectures: Lecture[],
  registrations: Registration[]
) {
  const wb = XLSX.utils.book_new();

  // 1. ABA RESUMO GERAL CONSOLIDADO POR ALUNO
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      studentGrade: string;
      reg11?: Registration;
      reg12?: Registration;
      registeredAt?: Date;
    }
  >();

  for (const reg of registrations) {
    if (!studentMap.has(reg.studentId)) {
      studentMap.set(reg.studentId, {
        studentId: reg.studentId,
        studentName: reg.studentName,
        studentGrade: reg.studentGrade,
        registeredAt: reg.registeredAt ? new Date(reg.registeredAt) : undefined,
      });
    }

    const studentItem = studentMap.get(reg.studentId)!;
    if (reg.lectureTimeSlot.startsWith("11")) {
      studentItem.reg11 = reg;
    } else if (reg.lectureTimeSlot.startsWith("12")) {
      studentItem.reg12 = reg;
    }
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
      const lec11 = s.reg11
        ? lectures.find((l) => l.id === s.reg11?.lectureId)
        : undefined;
      const lec12 = s.reg12
        ? lectures.find((l) => l.id === s.reg12?.lectureId)
        : undefined;

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

  // 2. ORDENAR AS PALESTRAS POR HORÁRIO E NÚMERO DE SALA
  const sortedLectures = [...lectures].sort((a, b) => {
    // Primeiro por horário (11h antes de 12h)
    const slotCompare = a.timeSlot.localeCompare(b.timeSlot);
    if (slotCompare !== 0) return slotCompare;
    // Depois por número de sala
    return parseInt(a.roomNumber || "0") - parseInt(b.roomNumber || "0");
  });

  // 3. CRIAR UMA ABA PARA CADA SALA E HORÁRIO (ALUNOS EM ORDEM ALFABÉTICA)
  for (const lecture of sortedLectures) {
    // Alunos inscritos nesta palestra específica organizados em ordem alfabética A-Z
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

    // Nome da aba no Excel (limite máximo de 31 caracteres)
    // Ex: "11h - Sala 305" ou "12h - Sala 312"
    const hourPrefix = lecture.timeSlot.startsWith("11") ? "11h" : "12h";
    const roomLabel = lecture.roomNumber
      ? `Sala ${lecture.roomNumber}`
      : lecture.location || "Sala";
    const sheetName = `${hourPrefix} - ${roomLabel}`.slice(0, 31);

    const sheetRows: (string | number)[][] = [
      ["COLÉGIO MARISTA GLÓRIA — LISTA DE PRESENÇA OFICIAL"],
      ["Evento: Roda de Conversas – 16/09/2026"],
      [`Horário: ${lecture.timeSlot} | Local: ${lecture.location || `Sala ${lecture.roomNumber}`}`],
      [`Área: ${lecture.title}`],
      [`Cursos Abordados: ${lecture.courses || lecture.description || "Geral"}`],
      [`Professor(a) Mediador(a): ${lecture.mediator || lecture.speaker}`],
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
      sheetRows.push([
        "-",
        "-",
        "Nenhum estudante inscrito nesta sala até o momento",
        "-",
        "",
        "",
        "-",
      ]);
    } else {
      lectureRegs.forEach((reg, i) => {
        sheetRows.push([
          i + 1,
          reg.studentId,
          reg.studentName,
          reg.studentGrade,
          "", // Espaço em branco largo para assinatura do aluno
          "", // Espaço para marcar P ou F
          reg.registeredAt
            ? new Date(reg.registeredAt).toLocaleString("pt-BR")
            : "-",
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws["!cols"] = [
      { wch: 6 },  // Nº
      { wch: 16 }, // Matrícula
      { wch: 40 }, // Nome do Estudante
      { wch: 15 }, // Série
      { wch: 34 }, // Assinatura
      { wch: 16 }, // Presença
      { wch: 22 }, // Data Inscrição
    ];

    // Se já existir uma aba com o mesmo nome (prevenção), ajusta
    let finalSheetName = sheetName;
    let counter = 2;
    while (wb.SheetNames.includes(finalSheetName)) {
      finalSheetName = `${sheetName.slice(0, 28)} (${counter++})`;
    }

    XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
  }

  // 4. DISPARAR DOWNLOAD NO NAVEGADOR
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Lista_de_Presenca_Roda_de_Conversas_${dateStr}.xlsx`);
}
