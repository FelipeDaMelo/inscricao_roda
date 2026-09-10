import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const adminDb = getAdminDb();

    // Salas oficiais do evento Roda de Conversas – 16/09
    const rooms = [
      {
        title: "Saúde – Medicina e Veterinária",
        location: "Sala 305",
        roomNumber: "305",
        maxCapacity: 45,
        courses: "Medicina e Veterinária",
        guests:
          "Medicina: São Camilo – Dr. Emilio Telesi Junior. Anhembi – Dra. Rafaela Roschel e Carlos Eduardo de Sá. | Medicina Veterinária: Anhembi – Isabella Morales. | Presença Marista: Otávio Catalano, ex-aluno.",
        mediator: "Prof. Fachini",
        speaker: "Prof. Fachini",
        description: "Cursos: Medicina e Veterinária",
        category: "Saúde" as const,
      },
      {
        title: "Ciências Humanas",
        location: "Sala 306",
        roomNumber: "306",
        maxCapacity: 45,
        courses: "Direito e Relações Internacionais",
        guests:
          "Direito: FGV – Luciane Neves. IBMEC – Thiago Giovani Romero. | Relações Internacionais: FIA – Bárbara Almeida Ladeia.",
        mediator: "Prof. Longhini",
        speaker: "Prof. Longhini",
        description: "Cursos: Direito e Relações Internacionais",
        category: "Humanas" as const,
      },
      {
        title: "Ciências Sociais",
        location: "Sala 308",
        roomNumber: "308",
        maxCapacity: 35,
        courses: "Economia, Administração e Relações Públicas",
        guests:
          "Economia: FIA – Cesar Akira Yokomizo. FGV – Prof.ª Danyelle Karine Santos Branco. | Administração: FIA – Marcelo Antônio Treff. | Relações Públicas: Thaís Germano (c/ Prof. Raquel). | Presença Marista: Hanna Caetano, ex-aluna.",
        mediator: "Prof. Fernando",
        speaker: "Prof. Fernando",
        description: "Cursos: Economia, Administração e Relações Públicas",
        category: "Negócios" as const,
      },
      {
        title: "Letras, Linguística, Artes, Arquitetura e Jornalismo",
        location: "Sala 309",
        roomNumber: "309",
        maxCapacity: 35,
        courses: "Cinema, Moda, Arquitetura, Jornalismo e Jornalismo esportivo",
        guests:
          "Arquitetura: Roberto Miranda – Prof. Rafael Barcelos Mori. | Jornalismo e Jornalismo esportivo: Presença Marista – Leonardo Haidar, ex-aluno.",
        mediator: "Prof. Renato Bueno",
        speaker: "Prof. Renato Bueno",
        description: "Cursos: Cinema, Moda, Arquitetura, Jornalismo e Jornalismo esportivo",
        category: "Artes" as const,
      },
      {
        title: "Ciências Humanas Aplicadas; Ciências Biológicas",
        location: "Sala 310",
        roomNumber: "310",
        maxCapacity: 35,
        courses: "Publicidade e Propaganda, Marketing e Ciências Biológicas",
        guests:
          "Publicidade e Propaganda: Presença Marista – Bruno Toffoli, ex-aluno. | Marketing: Guilherme Savi, educador Marista. | Ciências Biológicas: LABFAUNA/Centro Zoonozes – Leandra Sayuri Isa Hernandes, mãe Marista.",
        mediator: "Prof. Adriano",
        speaker: "Prof. Adriano",
        description: "Cursos: Publicidade e Propaganda, Marketing e Ciências Biológicas",
        category: "Comunicação" as const,
      },
      {
        title: "Engenharias",
        location: "Sala 311",
        roomNumber: "311",
        maxCapacity: 35,
        courses: "Produção, Mecânica, Civil, Elétrica, Física e Química",
        guests:
          "INSPER – Prof. Vinicius Picanço. | MAUÁ – Prof. Eduardo Nadaleto. | IBMEC – Prof. Carlos de Castro. | Presença Marista: Matheus Gomes, ex-aluno.",
        mediator: "Prof. Nilson",
        speaker: "Prof. Nilson",
        description: "Cursos: Produção, Mecânica, Civil, Elétrica, Física e Química",
        category: "Exatas" as const,
      },
      {
        title: "Computação",
        location: "Sala 312",
        roomNumber: "312",
        maxCapacity: 35,
        courses: "Ciência da Computação, Análise e Desenvolvimento de Sistemas, TI e Engenharia de Software, Design e Animação",
        guests:
          "Inteli confirmada – André Matui. | Presença Marista: Maíra Trindade, ex-aluna.",
        mediator: "Prof. Felipe",
        speaker: "Prof. Felipe",
        description: "Cursos: Ciência da Computação, Análise e Desenvolvimento de Sistemas, TI e Engenharia de Software, Design e Animação",
        category: "Tecnologia" as const,
      },
      {
        title: "Saúde",
        location: "Sala 313",
        roomNumber: "313",
        maxCapacity: 35,
        courses: "Psicologia, Odontologia, Fisioterapia, Farmácia e Biomedicina",
        guests:
          "Psicologia: FAAP – Katia Novais. Santa Casa – Simone Domingues. | Odontologia: Mandic – Dr. Ademir Franco. | Farmácia: Santa Casa – Tatiana Fontes. | Biomedicina: Santa Casa – Natalia Zanta. | Presença Marista: Yolanda Catalano, psicóloga. Vinicius Lopez, odontologia. Ex-alunos.",
        mediator: "Prof. Raquel",
        speaker: "Prof. Raquel",
        description: "Cursos: Psicologia, Odontologia, Fisioterapia, Farmácia e Biomedicina",
        category: "Saúde" as const,
      },
    ];

    const timeSlots = ["11:00 - 12:00", "12:00 - 13:00"];
    const sampleLectures: any[] = [];

    // Gerar palestras para os dois horários (11h às 12h e 12h às 13h)
    timeSlots.forEach((timeSlot) => {
      rooms.forEach((room) => {
        sampleLectures.push({
          ...room,
          timeSlot,
          date: "2026-09-16",
          currentEnrollments: 0,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    });

    const lecturesBatch = adminDb.batch();
    for (const lecture of sampleLectures) {
      const ref = adminDb.collection("lectures").doc();
      lecturesBatch.set(ref, lecture);
    }
    await lecturesBatch.commit();

    // 2. Configurações Iniciais
    await adminDb.collection("settings").doc("event").set({
      eventName: "Roda de Conversas – 16/09",
      eventDate: "2026-09-16",
      registrationOpen: true,
      maxLecturesPerStudent: 2,
    });

    return NextResponse.json({
      success: true,
      message: "Dados oficiais da Roda de Conversas cadastrados com sucesso no Firebase!",
    });
  } catch (error: any) {
    console.error("Erro ao popular banco de dados:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
