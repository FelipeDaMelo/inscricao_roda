import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
function getEnv(key) {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return "";
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.replace(/\\n/g, "\n");
}

const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID");
const clientEmail = getEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
const privateKey = getEnv("FIREBASE_ADMIN_PRIVATE_KEY");

const app = getApps().length === 0
  ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  : getApps()[0];

const db = getFirestore(app);

async function main() {
  console.log("Liberando sistema no Firestore...");
  const settingsRef = db.collection("settings").doc("event");
  const updateData = {
    registrationOpen: true,
    day16Open: true,
    day19Open: true,
    forceOpen: true,
    updatedAt: new Date().toISOString(),
  };

  await settingsRef.set(updateData, { merge: true });
  console.log("Configurações atualizadas no Firestore:", updateData);

  const doc = await settingsRef.get();
  console.log("Documento atual no Firestore:", JSON.stringify(doc.data(), null, 2));
}

main().catch(console.error);
