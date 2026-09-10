"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Zap,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Stats {
  totalStudents: number;
  totalLectures: number;
  activeLectures: number;
  totalRegistrations: number;
  availableSpots: number;
  totalCapacity: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        toast.error("Erro ao carregar estatísticas");
      }
    } catch {
      toast.error("Erro de conexão ao buscar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const occupancyRate =
    stats && stats.totalCapacity > 0
      ? Math.round((stats.totalRegistrations / stats.totalCapacity) * 100)
      : 0;

  const handleDownloadExcel = () => {
    const link = document.createElement("a");
    link.href = "/api/admin/export-excel";
    link.setAttribute(
      "download",
      `Lista_de_Presenca_Roda_de_Conversas_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Baixando lista de presença oficial em Excel (17 abas)!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-neutral-800">
            Visão Geral do Evento
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Acompanhe as estatísticas das inscrições da Roda de Profissões em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={handleDownloadExcel}
            className="btn-primary py-2.5 px-4 text-sm flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            Exportar Lista de Presença (.xlsx)
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Alunos */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Alunos Cadastrados
            </p>
            <h3 className="text-3xl font-heading font-bold text-neutral-800">
              {loading ? "..." : stats?.totalStudents || 0}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">Matrículas no banco</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-marista-primary flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Palestras Ativas */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Palestras Ativas
            </p>
            <h3 className="text-3xl font-heading font-bold text-neutral-800">
              {loading ? "..." : stats?.activeLectures || 0}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              de {stats?.totalLectures || 0} cadastradas
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Inscrições Confirmadas */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Inscrições Realizadas
            </p>
            <h3 className="text-3xl font-heading font-bold text-marista-primary">
              {loading ? "..." : stats?.totalRegistrations || 0}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Fila FIFO Ativa
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Vagas Restantes */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Vagas Restantes
            </p>
            <h3 className="text-3xl font-heading font-bold text-neutral-800">
              {loading ? "..." : stats?.availableSpots || 0}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Capacidade total: {stats?.totalCapacity || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Taxa de Ocupação & Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Taxa de Ocupação */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm">
          <h2 className="font-heading font-bold text-lg text-neutral-800 mb-4">
            Taxa Geral de Ocupação do Evento
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-neutral-600">Vagas Preenchidas</span>
              <span className="text-marista-primary font-bold text-lg">
                {occupancyRate}%
              </span>
            </div>

            <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
              <div
                className="h-full bg-marista-gradient rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-sm">
              <div>
                <span className="text-neutral-400 text-xs block uppercase">Inscrições Efetuadas</span>
                <span className="font-bold text-neutral-800 text-base">{stats?.totalRegistrations || 0}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-xs block uppercase">Vagas Livres</span>
                <span className="font-bold text-neutral-800 text-base">{stats?.availableSpots || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-marista-dark text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg mb-2 text-cyan-300">
              Ações Rápidas
            </h2>
            <p className="text-white/70 text-xs mb-6">
              Gerencie a programação e os alunos do evento rapidamente.
            </p>

            <div className="space-y-3">
              <Link
                href="/admin/lectures"
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-between text-sm font-medium text-white"
              >
                <span>Cadastrar Palestra</span>
                <ArrowUpRight className="w-4 h-4 text-cyan-300" />
              </Link>
              <Link
                href="/admin/students"
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-between text-sm font-medium text-white"
              >
                <span>Importar Alunos (JSON)</span>
                <ArrowUpRight className="w-4 h-4 text-cyan-300" />
              </Link>
              <Link
                href="/admin/registrations"
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-between text-sm font-medium text-white"
              >
                <span>Exportar Inscrições</span>
                <ArrowUpRight className="w-4 h-4 text-cyan-300" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/50 flex items-center justify-between">
            <span>Servidor Firebase FIFO</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
