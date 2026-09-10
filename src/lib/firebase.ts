import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase Client SDK
// Essas variáveis NEXT_PUBLIC_ são expostas ao navegador (seguro)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA-uaDMNlVwHz6uR3-2z0rHxw5x8_oB-dU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rodadeprofissoes.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rodadeprofissoes",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rodadeprofissoes.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "714200016478",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:714200016478:web:3cb41dfbb18c3680ee76cf",
};

// Inicializa o app apenas uma vez (evita erro em hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exporta instâncias do Firestore e Auth
// Usamos try-catch apenas por precaução, caso ocorra falha de validação da API Key
let db: any;
let auth: any;

try {
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("Erro ao inicializar Firebase Client SDK:", error);
}

export { db, auth };
export default app;
