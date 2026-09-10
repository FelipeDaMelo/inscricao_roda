"use client";

import { useEffect, useState } from "react";
import { Settings, Power, Calendar, Save, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    eventName: "Roda de Profissões 2026",
    eventDate: "2026-09-15",
    registrationOpen: true,
    maxLecturesPerStudent: 0,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-neutral-800">
          Configurações do Evento
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Controle a abertura das inscrições, limites e dados do evento.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <Loader2 className="w-8 h-8 text-marista-primary animate-spin mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Carregando configurações...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card Status das Inscrições */}
          <div
            className={`p-6 rounded-2xl border-2 transition-all shadow-sm ${
              settings.registrationOpen
                ? "bg-emerald-50/50 border-emerald-300"
                : "bg-amber-50/50 border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    settings.registrationOpen
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  <Power className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-neutral-800">
                    Status das Inscrições:{" "}
                    <span
                      className={
                        settings.registrationOpen ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {settings.registrationOpen ? "ABERTAS" : "FECHADAS"}
                    </span>
                  </h3>
                  <p className="text-neutral-600 text-xs mt-0.5">
                    {settings.registrationOpen
                      ? "Estudantes podem digitar a matrícula e realizar inscrições normalmente."
                      : "O sistema bloqueia novas inscrições e exibe aviso na tela principal."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    registrationOpen: !prev.registrationOpen,
                  }))
                }
                className={`py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-md ${
                  settings.registrationOpen
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {settings.registrationOpen ? "Fechar Inscrições" : "Abrir Inscrições"}
              </button>
            </div>
          </div>

          {/* Card Liberação por Data: 16/09 e 19/09 */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <h2 className="font-heading font-bold text-lg text-neutral-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-marista-primary" />
              Liberação das Inscrições por Data
            </h2>
            <p className="text-xs text-neutral-500">
              Controle individual para abrir ou fechar as inscrições de cada dia de palestras para os alunos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Dia 16/09 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-neutral-800">Quarta-feira (16/09)</p>
                  <p className="text-xs text-neutral-500">Roda de Conversas (8 Salas, 11h e 12h)</p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      (settings as any).day16Open !== false
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {(settings as any).day16Open !== false ? "✓ Liberado para Alunos" : "🔒 Bloqueado"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev: any) => ({
                      ...prev,
                      day16Open: prev.day16Open === false ? true : false,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    (settings as any).day16Open !== false
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {(settings as any).day16Open !== false ? "Bloquear 16/09" : "Liberar 16/09"}
                </button>
              </div>

              {/* Dia 19/09 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-neutral-800">Sábado (19/09)</p>
                  <p className="text-xs text-neutral-500">Oficinas & Palestra Geral</p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      (settings as any).day19Open === true
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {(settings as any).day19Open === true ? "✓ Liberado para Alunos" : "🔒 Em Breve (Bloqueado)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev: any) => ({
                      ...prev,
                      day19Open: !prev.day19Open,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    (settings as any).day19Open === true
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {(settings as any).day19Open === true ? "Bloquear 19/09" : "Liberar 19/09"}
                </button>
              </div>
            </div>
          </div>

          {/* Dados Básicos do Evento */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <h2 className="font-heading font-bold text-lg text-neutral-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-marista-primary" />
              Informações do Evento
            </h2>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Nome Oficial do Evento
              </label>
              <input
                type="text"
                value={settings.eventName}
                onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                className="input-field py-2.5 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Data Prevista para Realização
              </label>
              <input
                type="date"
                value={settings.eventDate}
                onChange={(e) => setSettings({ ...settings, eventDate: e.target.value })}
                className="input-field py-2.5 text-sm max-w-xs"
                required
              />
            </div>
          </div>

          {/* Regras e Parâmetros */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <h2 className="font-heading font-bold text-lg text-neutral-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-marista-primary" />
              Regras e Proteção FIFO
            </h2>

            <div className="bg-neutral-50 p-4 rounded-xl text-xs text-neutral-600 space-y-2 border border-neutral-200">
              <p className="font-bold text-marista-dark text-sm">
                ⚡ Algoritmo FIFO (First-In, First-Out)
              </p>
              <p>
                As inscrições são processadas utilizando <b>Firestore Transactions</b> com contadores atômicos no servidor. Em situações de alta concorrência (ex: 400 alunos tentando ao mesmo tempo), os registros aceitos são ordenados pelo carimbo de data/hora do servidor.
              </p>
              <p>
                O sistema também valida e impede automaticamente inscrições em palestras no mesmo horário.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-3.5 px-8 text-base flex items-center gap-2 shadow-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
