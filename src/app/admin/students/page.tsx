"use client";

import { useEffect, useState } from "react";
import { Student } from "@/types";
import {
  Users,
  Upload,
  Search,
  Trash2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

const SAMPLE_JSON = JSON.stringify(
  [
    { id: "1001", name: "Ana Clara Silva", grade: "1ª Série EM" },
    { id: "1002", name: "Bruno Oliveira", grade: "1ª Série EM" },
    { id: "2001", name: "Carla Mendes", grade: "2ª Série EM" },
    { id: "3001", name: "Daniel Ferreira", grade: "3ª Série EM" },
    { id: "3002", name: "Elena Souza", grade: "3ª Série EM" },
  ],
  null,
  2
);

export default function StudentsAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [importing, setImporting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch {
      toast.error("Erro ao buscar alunos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleImportJson = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e: any) {
      toast.error(`JSON inválido: ${e.message}`);
      return;
    }

    if (!Array.isArray(parsed)) {
      toast.error("O JSON deve ser um Array de estudantes");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Estudantes importados com sucesso!");
        setShowImportModal(false);
        fetchStudents();
      } else {
        toast.error(data.error || "Erro na importação");
      }
    } catch {
      toast.error("Erro ao enviar dados ao servidor");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover aluno "${name}" (Matrícula: ${id})?`)) return;

    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Aluno removido");
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error(data.error || "Erro ao remover aluno");
      }
    } catch {
      toast.error("Erro de conexão ao remover aluno");
    }
  };

  const copySample = () => {
    navigator.clipboard.writeText(SAMPLE_JSON);
    toast.success("Exemplo copiado para a área de transferência!");
  };

  const filteredStudents = students.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-neutral-800">
            Cadastro de Alunos
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gerencie o banco de alunos matriculados e importe listas completas em JSON.
          </p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="btn-primary py-3 px-5 text-sm flex items-center gap-2 self-start sm:self-auto shadow-lg"
        >
          <FileCode className="w-5 h-5" />
          Importar Alunos (JSON)
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por matrícula, nome do estudante ou série..."
            className="input-field pl-12 py-2.5 text-sm"
          />
        </div>
        <span className="text-xs text-neutral-400 font-medium">
          {filteredStudents.length} aluno(s)
        </span>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <Loader2 className="w-8 h-8 text-marista-primary animate-spin mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Carregando lista de alunos...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-bold mb-1">Nenhum aluno cadastrado ainda</p>
          <p className="text-neutral-400 text-xs mb-4">
            Importe o arquivo JSON fornecido pela secretaria para começar.
          </p>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary py-2.5 px-4 text-xs"
          >
            Abrir Importador JSON
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Matrícula</th>
                  <th className="p-4">Nome Completo do Aluno</th>
                  <th className="p-4">Série</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50/80 transition-all">
                    <td className="p-4 font-mono font-bold text-marista-primary">
                      {student.id}
                    </td>
                    <td className="p-4 font-semibold text-neutral-800">
                      {student.name}
                    </td>
                    <td className="p-4 text-neutral-600">
                      <span className="bg-neutral-100 text-neutral-700 font-medium px-2.5 py-1 rounded-lg text-xs">
                        {student.grade}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-500 hover:text-red-600 transition-all"
                        title="Excluir aluno"
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

      {/* Modal Importar JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImportModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-6 h-6 text-marista-primary" />
                <h2 className="font-heading font-bold text-xl text-neutral-800">
                  Importar Alunos via JSON
                </h2>
              </div>
              <button
                onClick={copySample}
                className="text-xs text-marista-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Exemplo
              </button>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              Cole abaixo a lista de alunos em formato JSON. Cada objeto deve conter os campos <code>id</code> (matrícula), <code>name</code> (nome) e <code>grade</code> (série).
            </p>

            <div className="mb-4">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={12}
                className="w-full font-mono text-xs p-4 bg-neutral-900 text-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-marista-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportJson}
                disabled={importing}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar Alunos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
