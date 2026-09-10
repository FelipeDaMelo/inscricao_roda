"use client";

import { useEffect, useState } from "react";
import { Settings, Power, Calendar, Save, ShieldCheck, Loader2, Clock, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface EventSettingsState {
  eventName: string;
  eventDate: string;
  registrationOpen: boolean;
  maxLecturesPerStudent: number;
  day16Open?: boolean;
  day19Open?: boolean;
  forceOpen?: boolean;
  isReleased?: boolean;
  releaseDate?: string;
  releaseTimestamp?: number;
  serverTime?: string;
  [key: string]: any;
}

export default function SettingsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EventSettingsState>({
    eventName: "Roda de Profissões 2026",
    eventDate: "2026-09-15",
    registrationOpen: true,
    maxLecturesPerStudent: 0,
    day16Open: true,
    day19Open: true,
    forceOpen: true,
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

  const saveSettingsToServer = async (newSettings: typeof settings) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Configurações salvas e aplicadas com sucesso!");
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (patch: Partial<typeof settings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await saveSettingsToServer(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsToServer(settings);
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
          {/* Banner de Ação Rápida: Liberar Todo o Sistema */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-400/30">
            <div>
              <h3 className="font-heading font-black text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                Liberar Todo o Sistema Agora
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5 max-w-xl">
                Abre as inscrições imediatamente e libera <b>Quarta-feira (16/09)</b> e <b>Sábado (19/09)</b> para todos os alunos de uma só vez, sem bloqueios de data.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                handleQuickToggle({
                  registrationOpen: true,
                  day16Open: true,
                  day19Open: true,
                  forceOpen: true,
                })
              }
              className="py-3 px-6 rounded-xl font-extrabold text-sm bg-white text-emerald-900 hover:bg-emerald-50 hover:shadow-2xl transition-all flex items-center gap-2 flex-shrink-0 shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4 text-emerald-600" />}
              Liberar Tudo Agora
            </button>
          </div>

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
                    Status Geral das Inscrições:{" "}
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
                disabled={saving}
                onClick={() =>
                  handleQuickToggle({
                    registrationOpen: !settings.registrationOpen,
                    forceOpen: !settings.registrationOpen,
                  })
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

          {/* Card Abertura Automática Programada (11/09 às 17h) */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <h2 className="font-heading font-bold text-lg text-neutral-800 border-b border-neutral-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-marista-primary" />
                Abertura Automática das Inscrições
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  (settings as any).isReleased
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {(settings as any).isReleased
                  ? "✓ Inscrições Oficialmente Liberadas"
                  : "🔒 Bloqueado até 11/09 às 17h00"}
              </span>
            </h2>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-semibold">Data e Horário Programados:</span>
                <span className="font-bold text-neutral-800">
                  Sexta-feira, 11/09/2026 às 17h00 (Horário de Brasília)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-semibold">Horário Atual do Servidor Vercel:</span>
                <span className="font-mono text-neutral-700">
                  {(settings as any).serverTime
                    ? new Date((settings as any).serverTime).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      }) + " (BRT)"
                    : "Sincronizando..."}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-xs text-amber-950">
                  Liberar Imediatamente para Testes (Override)
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Ative esta opção apenas se desejar antecipar a liberação das inscrições antes das 17h do dia 11/09.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleQuickToggle({
                    forceOpen: !(settings as any).forceOpen,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  (settings as any).forceOpen
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
                }`}
              >
                {(settings as any).forceOpen ? "Override Ativo (Liberado)" : "Manter Bloqueio Automático"}
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
                  disabled={saving}
                  onClick={() =>
                    handleQuickToggle({
                      day16Open: (settings as any).day16Open === false ? true : false,
                    })
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
                  disabled={saving}
                  onClick={() =>
                    handleQuickToggle({
                      day19Open: !(settings as any).day19Open,
                    })
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
