"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Lock, Mail, Loader2, GraduationCap, ShieldAlert, FileSpreadsheet, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email && !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);

    try {
      // 1. Tentar validação de Chave Mestre de forma segura no servidor
      const candidateKey = password.trim() || email.trim();
      const verifyRes = await fetch("/api/admin/verify-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: candidateKey }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        toast.success("Acesso administrativo liberado via Chave Mestre! Baixando lista de presença...", {
          duration: 5000,
          icon: "👑",
        });

        // Dispara o download da lista de presença oficial em Excel
        const link = document.createElement("a");
        link.href = "/api/admin/export-excel";
        link.setAttribute(
          "download",
          `Lista_de_Presenca_Roda_de_Conversas_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        router.push("/admin/registrations");
        setLoading(false);
        return;
      }
    } catch {
      // Se falhar a verificação mestre, segue para login padrão Firebase
    }

    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login efetuado com sucesso!");
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error("Erro no login admin:", err);
      // Se for ambiente local/dev ou credenciais não configuradas ainda no Firebase
      toast.error(
        err.message?.includes("user-not-found") || err.message?.includes("invalid-credential")
          ? "Credenciais inválidas. Verifique e-mail e senha no Firebase Console."
          : "Erro ao fazer login. Verifique as credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-marista-dark flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-marista-primary/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative z-10 animate-scale-in">
        <div className="text-center mb-8">
          <img
            src="/logo_1.png"
            alt="Colégio Marista Nossa Senhora da Glória"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl font-heading font-bold text-neutral-800">
            Painel Administrativo
          </h1>
          <p className="text-neutral-500 text-xs mt-1">
            Colégio Marista Nossa Senhora da Glória
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@marista.edu.br"
                className="input-field pl-12"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-12"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 bg-marista-primary text-white hover:bg-marista-light"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              "Acessar Painel"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100 flex items-start gap-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-xl">
          <ShieldAlert className="w-4 h-4 text-marista-primary flex-shrink-0 mt-0.5" />
          <p>
            O acesso é restrito à equipe gestora do evento. O usuário admin deve ser cadastrado na aba <b>Authentication</b> do Firebase Console.
          </p>
        </div>
      </div>
    </div>
  );
}
