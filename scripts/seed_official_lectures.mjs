import { createRequire } from "module";
const require = createRequire("/home/giovanna/Documentos/roda-de-profissoes/package.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore(app);

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
    category: "Saúde",
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
    category: "Humanas",
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
    category: "Negócios",
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
    category: "Artes",
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
    category: "Comunicação",
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
    category: "Exatas",
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
    category: "Tecnologia",
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
    category: "Saúde",
  },
];

const timeSlots = ["11:00 - 12:00", "12:00 - 13:00"];

async function seed() {
  console.log("Iniciando limpeza de palestras antigas (se houver)...");
  const existingLectures = await db.collection("lectures").get();
  if (existingLectures.size > 0) {
    const batchDelete = db.batch();
    existingLectures.forEach((doc) => batchDelete.delete(doc.ref));
    await batchDelete.commit();
    console.log(`Removidas ${existingLectures.size} palestras antigas.`);
  }

  console.log("Criando 16 palestras oficiais (8 salas x 2 horários)...");
  const batch = db.batch();
  for (const timeSlot of timeSlots) {
    for (const room of rooms) {
      const docRef = db.collection("lectures").doc();
      batch.set(docRef, {
        ...room,
        timeSlot,
        date: "2026-09-16",
        currentEnrollments: 0,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
  await batch.commit();
  console.log("16 palestras criadas com sucesso!");

  console.log("Configurando evento...");
  await db.collection("settings").doc("event").set({
    eventName: "Roda de Conversas – 16/09",
    eventDate: "2026-09-16",
    registrationOpen: true,
    maxLecturesPerStudent: 2,
  });
  console.log("Configurações do evento salvas com sucesso!");
}

seed()
  .then(() => {
    console.log("Seed concluído com sucesso!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  });
