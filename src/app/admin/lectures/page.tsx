"use client";

import { useEffect, useState } from "react";
import { Lecture, LectureCategory } from "@/types";
import { LECTURE_CATEGORIES, getCategoryBadgeClasses, isLectureUnlimited } from "@/lib/utils";
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

export default function LecturesAdminPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    speaker: "",
    description: "",
    location: "Auditório Principal",
    timeSlot: "08:00 - 09:00",
    date: "2026-09-15",
    maxCapacity: 30,
    category: "Outros" as LectureCategory,
    isActive: true,
  });

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lectures");
      const data = await res.json();
      if (data.success) {
        setLectures(data.data);
      }
    } catch {
      toast.error("Erro ao carregar palestras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  const handleOpenCreate = () => {
    setEditingLecture(null);
    setFormData({
      title: "",
      speaker: "",
      description: "",
      location: "Auditório Principal",
      timeSlot: "08:00 - 09:00",
      date: "2026-09-15",
      maxCapacity: 30,
      category: "Outros",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      speaker: lecture.speaker,
      description: lecture.description || "",
      location: lecture.location,
      timeSlot: lecture.timeSlot,
      date: lecture.date || "2026-09-15",
      maxCapacity: lecture.maxCapacity,
      category: lecture.category,
      isActive: lecture.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingLecture ? "PUT" : "POST";
      const payload = editingLecture ? { id: editingLecture.id, ...formData } : formData;

      const res = await fetch("/api/admin/lectures", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingLecture ? "Palestra atualizada!" : "Palestra criada!");
        setShowModal(false);
        fetchLectures();
      } else {
        toast.error(data.error || "Erro ao salvar palestra");
      }
    } catch {
      toast.error("Erro de conexão ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir a palestra "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/lectures?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Palestra excluída com sucesso");
        setLectures((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error(data.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir palestra");
    }
  };

  const [resetting, setResetting] = useState(false);

  const handleResetAllEnrollments = async () => {
    const confirmed = window.confirm(
      "Atenção: Tem certeza que deseja zerar os inscritos de todas as palestras e liberar 100% das vagas para novas inscrições?"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-enrollments", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Todas as vagas foram liberadas com sucesso!");
        await fetchLectures();
      } else {
        toast.error(data.error || "Erro ao zerar vagas");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor");
    } finally {
      setResetting(false);
    }
  };

  const filteredLectures = lectures.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.speaker.toLowerCase().includes(search.toLowerCase()) ||
      l.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-neutral-800">
            Gerenciamento de Palestras
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Cadastre os horários, palestrantes, salas e limites de vagas das palestras.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleResetAllEnrollments}
            disabled={resetting}
            className="py-3 px-5 text-sm font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Zera o contador de todas as palestras e libera 100% das vagas"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <RotateCcw className="w-4 h-4 text-rose-600" />
            )}
            Liberar Todas as Vagas (Zerar)
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-primary py-3 px-5 text-sm flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nova Palestra
          </button>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palestra por título, palestrante ou área..."
            className="input-field pl-12 py-2.5 text-sm"
          />
        </div>
        <span className="text-xs text-neutral-400 font-medium">
          {filteredLectures.length} palestra(s)
        </span>
      </div>

      {/* Table / Grid */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <Loader2 className="w-8 h-8 text-marista-primary animate-spin mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Carregando palestras...</p>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <p className="text-neutral-500 font-medium mb-3">Nenhuma palestra encontrada</p>
          <button onClick={handleOpenCreate} className="btn-secondary py-2 px-4 text-xs">
            Cadastrar Primeira Palestra
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Palestra / Palestrante</th>
                  <th className="p-4">Área</th>
                  <th className="p-4">Horário & Local</th>
                  <th className="p-4">Vagas / Inscritos</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLectures.map((lecture) => (
                  <tr key={lecture.id} className="hover:bg-neutral-50/80 transition-all">
                    <td className="p-4">
                      <p className="font-bold text-neutral-800 text-base">{lecture.title}</p>
                      {lecture.courses && (
                        <p className="text-xs text-sky-700 font-medium mt-0.5">🎓 {lecture.courses}</p>
                      )}
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Mediador: {lecture.mediator || lecture.speaker}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${getCategoryBadgeClasses(lecture.category)}`}>
                        {lecture.category}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-600 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-medium text-marista-dark">
                        <Clock className="w-3.5 h-3.5 text-marista-primary" />
                        {lecture.timeSlot}
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400">
                        <MapPin className="w-3.5 h-3.5" />
                        {lecture.location}
                      </div>
                    </td>
                    <td className="p-4">
                      {isLectureUnlimited(lecture) ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-purple-700 text-xs">
                            <Users className="w-4 h-4 text-purple-600" />
                            <span>{lecture.currentEnrollments} inscritos</span>
                          </div>
                          <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-800 rounded-md">
                            Sem limite de alunos
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                            <Users className="w-4 h-4 text-neutral-400" />
                            <span>{lecture.currentEnrollments} / {lecture.maxCapacity}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full ${lecture.currentEnrollments >= lecture.maxCapacity
                                  ? "bg-red-500"
                                  : "bg-emerald-500"
                                }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (lecture.currentEnrollments / lecture.maxCapacity) * 100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </td>
                    <td className="p-4">
                      {lecture.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500">
                          <XCircle className="w-3.5 h-3.5" /> Inativa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(lecture)}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-marista-50 text-neutral-600 hover:text-marista-primary transition-all"
                        title="Editar palestra"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(lecture.id, lecture.title)}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-all"
                        title="Excluir palestra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Palestra */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
              <h2 className="font-heading font-bold text-xl text-neutral-800">
                {editingLecture ? "Editar Palestra" : "Nova Palestra"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                  Título da Palestra / Profissão *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Medicina e Inteligência Artificial"
                  className="input-field py-2.5 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                    Palestrante *
                  </label>
                  <input
                    type="text"
                    value={formData.speaker}
                    onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                    placeholder="Ex: Dr. Roberto Santos"
                    className="input-field py-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                    Área / Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as LectureCategory,
                      })
                    }
                    className="input-field py-2.5 text-sm"
                  >
                    {LECTURE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                    Horário (Ex: 08:00 - 09:00) *
                  </label>
                  <input
                    type="text"
                    value={formData.timeSlot}
                    onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                    placeholder="08:00 - 09:00"
                    className="input-field py-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                    Limite de Vagas (Vagas Totais) *
                  </label>
                  <input
                    type="number"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="input-field py-2.5 text-sm"
                    min={1}
                    max={500}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                  Local / Sala
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Auditório Principal, Sala 102"
                  className="input-field py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                  Descrição Resumida
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve resumo sobre o conteúdo da palestra..."
                  rows={3}
                  className="input-field py-2.5 text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-marista-primary rounded border-neutral-300 focus:ring-marista-primary"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-neutral-700">
                  Palestra ativa e visível para os alunos
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingLecture ? (
                    "Salvar Alterações"
                  ) : (
                    "Criar Palestra"
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
