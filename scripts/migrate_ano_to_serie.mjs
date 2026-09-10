import { createRequire } from "module";
const require = createRequire("/home/giovanna/Documentos/roda-de-profissoes/package.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore(app);

function transformGrade(grade) {
  if (!grade || typeof grade !== "string") return grade;
  return grade
    .replace(/1º\s*ano/gi, "1ª Série")
    .replace(/2º\s*ano/gi, "2ª Série")
    .replace(/3º\s*ano/gi, "3ª Série")
    .replace(/1º\s*Ano/g, "1ª Série")
    .replace(/2º\s*Ano/g, "2ª Série")
    .replace(/3º\s*Ano/g, "3ª Série")
    .replace(/\bAno\b/g, "Série")
    .replace(/\bano\b/g, "série");
}

async function migrate() {
  console.log("=== Iniciando Migração: 'Ano' -> 'Série' no Banco de Dados ===");

  // 1. Coleção students
  const studentsSnap = await db.collection("students").get();
  console.log(`Total de estudantes encontrados: ${studentsSnap.size}`);

  let studentsUpdated = 0;
  let batch = db.batch();
  let countInBatch = 0;

  for (const doc of studentsSnap.docs) {
    const data = doc.data();
    const oldGrade = data.grade || "";
    const newGrade = transformGrade(oldGrade);

    if (oldGrade !== newGrade) {
      batch.update(doc.ref, {
        grade: newGrade,
        updatedAt: new Date(),
      });
      studentsUpdated++;
      countInBatch++;

      if (countInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        countInBatch = 0;
      }
    }
  }

  if (countInBatch > 0) {
    await batch.commit();
  }

  console.log(`✓ Estudantes atualizados com sucesso: ${studentsUpdated}`);

  // 2. Coleção registrations
  const regSnap = await db.collection("registrations").get();
  console.log(`Total de inscrições encontradas: ${regSnap.size}`);

  let regsUpdated = 0;
  batch = db.batch();
  countInBatch = 0;

  for (const doc of regSnap.docs) {
    const data = doc.data();
    const oldGrade = data.studentGrade || "";
    const newGrade = transformGrade(oldGrade);

    if (oldGrade !== newGrade) {
      batch.update(doc.ref, {
        studentGrade: newGrade,
      });
      regsUpdated++;
      countInBatch++;

      if (countInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        countInBatch = 0;
      }
    }
  }

  if (countInBatch > 0) {
    await batch.commit();
  }

  console.log(`✓ Inscrições atualizadas com sucesso: ${regsUpdated}`);

  // 3. Verificação final
  const verifyStudentsSnap = await db.collection("students").get();
  const remainingGrades = new Set();
  verifyStudentsSnap.docs.forEach((d) => remainingGrades.add(d.data().grade));
  console.log("Séries únicas nos estudantes após migração:", [...remainingGrades]);

  console.log("=== Migração concluída com sucesso! ===");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro durante migração:", err);
    process.exit(1);
  });
