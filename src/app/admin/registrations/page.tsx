"use client";

import { useEffect, useState, useMemo } from "react";
import { Registration, Lecture, Student } from "@/types";
import {
  ClipboardList,
  Download,
  Filter,
  Search,
  Clock,
  User,
  GraduationCap,
  Loader2,
  Calendar,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { exportAttendanceExcel } from "@/lib/export-excel";

export default function RegistrationsAdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtros
  const [selectedLectureId, setSelectedLectureId] = useState<string>("ALL");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "lecture">("name");

  // Modal Gravar Inscrição Manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualLecture11, setManualLecture11] = useState("");
  const [manualLecture12, setManualLecture12] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regsRes, lecturesRes, studentsRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/lectures"),
        fetch("/api/admin/students"),
      ]);

      const regsData = await regsRes.json();
      const lecturesData = await lecturesRes.json();
      const studentsData = await studentsRes.json();

      if (regsData.success) setRegistrations(regsData.data);
      if (lecturesData.success) setLectures(lecturesData.data);
      if (studentsData.success) setStudents(studentsData.data);
    } catch {
      toast.error("Erro ao carregar dados de inscrições");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Exportar Excel Oficial com abas separadas por sala e horário
  const handleExportExcel = () => {
    if (registrations.length === 0) {
      toast.error("Nenhuma inscrição encontrada para exportar.");
      return;
    }

    try {
      exportAttendanceExcel(lectures, registrations);
      toast.success("Planilha Excel com todas as abas gerada com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      toast.error("Erro ao gerar arquivo Excel.");
    }
  };

  // Exportar CSV simples para contingência
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Nenhuma inscrição para exportar");
      return;
    }

    const headers = [
      "Posição FIFO",
      "Matrícula",
      "Nome do Aluno",
      "Série",
      "Palestra",
      "Sala",
      "Horário",
      "Data Inscrição",
    ];

    const rows = filteredRegistrations.map((r) => {
      const lec = lectures.find((l) => l.id === r.lectureId);
      return [
        r.position || "-",
        r.studentId,
        `"${r.studentName}"`,
        `"${r.studentGrade}"`,
        `"${r.lectureTitle}"`,
        `"${lec?.location || (lec?.roomNumber ? `Sala ${lec.roomNumber}` : "-")}"`,
        `"${r.lectureTimeSlot}"`,
        r.registeredAt ? new Date(r.registeredAt).toLocaleString("pt-BR") : "-",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `inscricoes-marista-gloria-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Relatório CSV baixado com sucesso!");
  };

  // Gravar Inscrição Manual pelo Administrador
  const handleSaveManualRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      toast.error("Selecione um estudante.");
      return;
    }
    if (!manualLecture11 && !manualLecture12) {
      toast.error("Selecione pelo menos uma palestra.");
      return;
    }

    const lectureIds = [manualLecture11, manualLecture12].filter(Boolean);

    setActionLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: manualStudentId,
          lectureIds,
          replaceExisting: true,
          isAdmin: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Inscrição gravada com sucesso!");
        setShowManualModal(false);
        setManualStudentId("");
        setManualLecture11("");
        setManualLecture12("");
        fetchData();
      } else {
        toast.error(data.error || "Erro ao gravar inscrição");
      }
    } catch {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Gravar Inscrições de Demonstração / Teste
  const handleSimulateRegistrations = async () => {
    if (
      !confirm(
        "Deseja gravar inscrições de teste para uma amostra de alunos reais? Isso preencherá as salas para você testar e validar o Excel com as abas."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulate-registrations", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Inscrições gravadas com sucesso!");
        fetchData();
      } else {
        toast.error(data.error || "Erro ao simular inscrições");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Limpar todas as inscrições do banco
  const handleClearAllRegistrations = async () => {
    if (
      !confirm(
        "ATENÇÃO: Deseja realmente excluir TODAS as inscrições cadastradas? Esta ação é irreversível."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const deletePromises = registrations.map((r) =>
        fetch("/api/register", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationId: r.id,
            studentId: r.studentId,
            lectureId: r.lectureId,
            isAdmin: true,
          }),
        })
      );

      await Promise.all(deletePromises);
      toast.success("Todas as inscrições foram limpas!");
      fetchData();
    } catch {
      toast.error("Erro ao limpar inscrições.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtragem e ordenação da lista exibida na tabela (Ordem Alfabética por padrão)
  const filteredRegistrations = useMemo(() => {
    const list = registrations.filter((r) => {
      const matchesLecture =
        selectedLectureId === "ALL" || r.lectureId === selectedLectureId;
      const matchesTimeSlot =
        selectedTimeSlot === "ALL" || r.lectureTimeSlot.startsWith(selectedTimeSlot);
      const matchesSearch =
        (r.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.studentId || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.lectureTitle || "").toLowerCase().includes(search.toLowerCase());

      return matchesLecture && matchesTimeSlot && matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === "name") {
        const cleanA = (a.studentName || "").trim();
        const cleanB = (b.studentName || "").trim();
        const res = cleanA.localeCompare(cleanB, "pt-BR", {
          sensitivity: "base",
          numeric: true,
        });
        if (res !== 0) return res;
        return (a.studentId || "").localeCompare(b.studentId || "");
      }
      if (sortBy === "date") {
        const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        return dateB - dateA;
      }
      // Por Palestra / Sala
      return (a.lectureTitle || "").localeCompare(b.lectureTitle || "");
    });
  }, [registrations, selectedLectureId, selectedTimeSlot, search, sortBy]);

  const lectures11h = lectures.filter((l) => l.timeSlot.startsWith("11"));
  const lectures12h = lectures.filter((l) => l.timeSlot.startsWith("12"));

  return (
    <div className="space-y-6">
      {/* Header com Ações de Gravar e Exportar Excel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-neutral-800">
            Relatório de Inscrições e Presença
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Grave inscrições e exporte a lista oficial de chamada em Excel com abas separadas por sala e horário.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão Exportar Excel (.xlsx) com Abas */}
          <button
            onClick={handleExportExcel}
            disabled={registrations.length === 0 || loading || actionLoading}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Baixar planilha oficial com 1 aba para cada sala e horário"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            <span>Exportar Lista de Presença (.xlsx)</span>
          </button>

          {/* Botão Gravar Inscrição Manual */}
          <button
            onClick={() => setShowManualModal(true)}
            disabled={loading || actionLoading}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-marista-primary hover:bg-marista-dark text-white shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Gravar Inscrição</span>
          </button>

          {/* Botão Simular Inscrições de Demonstração */}
          <button
            onClick={handleSimulateRegistrations}
            disabled={loading || actionLoading}
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all flex items-center gap-1.5"
            title="Preencher com alunos de teste para validar o Excel"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Simular Inscrições</span>
          </button>

          {/* Botão Exportar CSV Rápido */}
          <button
            onClick={handleExportCSV}
            disabled={filteredRegistrations.length === 0 || loading || actionLoading}
            className="px-3 py-2.5 rounded-xl font-semibold text-xs border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 transition-all flex items-center gap-1.5"
            title="Exportar CSV simples"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>CSV</span>
          </button>

          {/* Botão Limpar Inscrições */}
          {registrations.length > 0 && (
            <button
              onClick={handleClearAllRegistrations}
              disabled={loading || actionLoading}
              className="p-2.5 rounded-xl text-danger-600 hover:bg-danger-50 border border-danger-200 transition-all"
              title="Excluir todas as inscrições"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-neutral-800">
              {registrations.length}
            </div>
            <div className="text-xs text-neutral-500 font-medium">
              Total de Inscrições Realizadas
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-neutral-800">
              {new Set(registrations.map((r) => r.studentId)).size}
            </div>
            <div className="text-xs text-neutral-500 font-medium">
              Alunos com Inscrição Confirmada
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-neutral-800">
              {lectures.length + 1} Abas no Excel
            </div>
            <div className="text-xs text-neutral-500 font-medium">
              1 Geral + {lectures.length} por Sala/Horário
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Ordenação */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Busca por texto */}
        <div className="relative md:col-span-5">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do aluno, matrícula ou sala..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-marista-cyan focus:bg-white"
          />
        </div>

        {/* Filtro por Horário */}
        <div className="relative md:col-span-2">
          <Clock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-marista-cyan"
          >
            <option value="ALL">Todos Horários</option>
            <option value="11">11h às 12h</option>
            <option value="12">12h às 13h</option>
          </select>
        </div>

        {/* Filtro por Palestra Específica */}
        <div className="relative md:col-span-3">
          <Filter className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedLectureId}
            onChange={(e) => setSelectedLectureId(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-marista-cyan"
          >
            <option value="ALL">Todas as Salas ({registrations.length})</option>
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>
                {l.location || `Sala ${l.roomNumber}`} ({l.timeSlot.slice(0, 5)}) - {l.title.slice(0, 20)}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Ordenação */}
        <div className="relative md:col-span-2">
          <ArrowUpDown className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-marista-cyan font-bold text-neutral-700"
          >
            <option value="name">Ordem A-Z</option>
            <option value="date">Mais Recentes</option>
            <option value="lecture">Por Sala</option>
          </select>
        </div>
      </div>

      {/* Tabela de Inscrições */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <Loader2 className="w-8 h-8 text-marista-primary animate-spin mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Carregando inscrições...</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <ClipboardList className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-bold mb-1">Nenhuma inscrição encontrada</p>
          <p className="text-neutral-400 text-xs mb-4">
            Ajuste o filtro acima ou grave novas inscrições para gerar a lista de presença.
          </p>
          <button
            onClick={() => setShowManualModal(true)}
            className="btn-primary py-2 px-4 text-xs font-bold"
          >
            Gravar Inscrição Manual
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Exibindo <b>{filteredRegistrations.length}</b> de <b>{registrations.length}</b> inscrições
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Pronto para Exportação em Excel
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nº / Fila</th>
                  <th className="p-4">Estudante</th>
                  <th className="p-4">Matrícula / Série</th>
                  <th className="p-4">Sala & Palestra</th>
                  <th className="p-4">Horário</th>
                  <th className="p-4">Data Inscrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRegistrations.map((reg, idx) => {
                  const lec = lectures.find((l) => l.id === reg.lectureId);
                  return (
                    <tr key={reg.id} className="hover:bg-neutral-50/80 transition-all">
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-marista-50 text-marista-primary font-bold text-xs">
                          #{reg.position || idx + 1}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-neutral-800">{reg.studentName}</p>
                      </td>
                      <td className="p-4 text-xs text-neutral-600 space-y-0.5">
                        <p className="font-mono font-semibold text-marista-primary">
                          {reg.studentId}
                        </p>
                        <p className="text-neutral-400">{reg.studentGrade}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="badge bg-neutral-900 text-white font-extrabold text-[11px] px-2 py-0.5">
                            {lec?.location || `Sala ${lec?.roomNumber}`}
                          </span>
                          <span className="font-semibold text-neutral-800 text-sm">
                            {reg.lectureTitle}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-marista-cyan" />
                          {reg.lectureTimeSlot}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-neutral-500">
                        {reg.registeredAt
                          ? new Date(reg.registeredAt).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODAL DE GRAVAR INSCRIÇÃO MANUAL ===== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowManualModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-scale-in max-h-[90vh] overflow-y-auto border border-neutral-100">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-xl text-neutral-900">
                  Gravar Inscrição Manual
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  Cadastrar as duas palestras de um aluno diretamente
                </p>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualRegistration} className="space-y-4">
              {/* Seleção do Aluno */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Selecione o Estudante
                </label>
                <select
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-marista-cyan"
                  required
                >
                  <option value="">Escolha um aluno...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) - {s.grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* 1ª Rodada (11h) */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  1ª Rodada: 11:00 às 12:00
                </label>
                <select
                  value={manualLecture11}
                  onChange={(e) => setManualLecture11(e.target.value)}
                  className="w-full p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 text-sm focus:outline-none focus:border-emerald-600"
                  required
                >
                  <option value="">Escolha a sala para as 11h...</option>
                  {lectures11h.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.location || `Sala ${l.roomNumber}`} - {l.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2ª Rodada (12h) */}
              <div>
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  2ª Rodada: 12:00 às 13:00
                </label>
                <select
                  value={manualLecture12}
                  onChange={(e) => setManualLecture12(e.target.value)}
                  className="w-full p-3 rounded-xl border border-indigo-300 bg-indigo-50/50 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  <option value="">Escolha a sala para as 12h...</option>
                  {lectures12h.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.location || `Sala ${l.roomNumber}`} - {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="btn-secondary flex-1 py-3 text-sm font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-md"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Gravar Inscrição
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
