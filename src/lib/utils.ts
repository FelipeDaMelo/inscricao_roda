import { LectureCategory } from "@/types";

/**
 * Retorna a cor CSS correspondente a uma categoria de palestra
 */
export function getCategoryColor(category: LectureCategory): string {
  const colors: Record<LectureCategory, string> = {
    Saúde: "#10B981",
    Exatas: "#3B82F6",
    Humanas: "#8B5CF6",
    Artes: "#EC4899",
    Tecnologia: "#06B6D4",
    Negócios: "#F59E0B",
    Direito: "#EF4444",
    Comunicação: "#F97316",
    Educação: "#14B8A6",
    Outros: "#6B7280",
  };
  return colors[category] || colors["Outros"];
}

/**
 * Retorna classes Tailwind para o badge de categoria
 */
export function getCategoryBadgeClasses(category: LectureCategory): string {
  const classes: Record<LectureCategory, string> = {
    Saúde: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Exatas: "bg-blue-100 text-blue-700 border-blue-200",
    Humanas: "bg-violet-100 text-violet-700 border-violet-200",
    Artes: "bg-pink-100 text-pink-700 border-pink-200",
    Tecnologia: "bg-cyan-100 text-cyan-700 border-cyan-200",
    Negócios: "bg-amber-100 text-amber-700 border-amber-200",
    Direito: "bg-red-100 text-red-700 border-red-200",
    Comunicação: "bg-orange-100 text-orange-700 border-orange-200",
    Educação: "bg-teal-100 text-teal-700 border-teal-200",
    Outros: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return classes[category] || classes["Outros"];
}

/**
 * Calcula a porcentagem de vagas preenchidas
 */
export function getCapacityPercentage(
  current: number,
  max: number
): number {
  if (max === 0) return 0;
  return Math.min(Math.round((current / max) * 100), 100);
}

/**
 * Retorna a cor da barra de capacidade baseada na porcentagem
 */
export function getCapacityBarColor(percentage: number): string {
  if (percentage >= 90) return "bg-danger-500";
  if (percentage >= 70) return "bg-warning-500";
  return "bg-success-500";
}

/**
 * Retorna texto de status das vagas
 */
export function getCapacityText(current: number, max: number): string {
  const remaining = max - current;
  if (remaining <= 0) return "Esgotado";
  if (remaining <= 3) return `Últimas ${remaining} vagas!`;
  return `${remaining} vagas disponíveis`;
}

/**
 * Verifica se uma atividade/palestra possui capacidade ilimitada de alunos
 * (ex: Palestra Geral de sábado, que serve apenas para controle de presença/participação)
 */
export function isLectureUnlimited(lecture?: {
  title?: string;
  maxCapacity?: number;
  isUnlimited?: boolean;
  date?: string;
  location?: string;
  roomNumber?: string;
} | null): boolean {
  if (!lecture) return false;
  if (lecture.isUnlimited) return true;
  if (lecture.maxCapacity === 0 || (lecture.maxCapacity && lecture.maxCapacity >= 9999)) return true;

  // Regra de negócio: Palestra Geral de sábado (19/09) não tem limite de alunos
  const isSaturday = lecture.date === "2026-09-19" || !lecture.date;
  const titleLower = (lecture.title || "").toLowerCase();
  const locLower = (lecture.location || "").toLowerCase();
  const roomLower = (lecture.roomNumber || "").toLowerCase();

  if (
    isSaturday &&
    (titleLower.includes("palestra geral") ||
      titleLower.includes("profissões do futuro") ||
      locLower.includes("auditório") ||
      roomLower.includes("auditório"))
  ) {
    return true;
  }

  return false;
}

/**
 * Formata data para exibição (DD/MM/AAAA)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Lista de categorias disponíveis
 */
export const LECTURE_CATEGORIES: LectureCategory[] = [
  "Saúde",
  "Exatas",
  "Humanas",
  "Artes",
  "Tecnologia",
  "Negócios",
  "Direito",
  "Comunicação",
  "Educação",
  "Outros",
];

/**
 * Verifica se dois timeSlots conflitam
 * Formato esperado: "HH:MM - HH:MM"
 */
export function hasTimeConflict(
  timeSlot1: string,
  timeSlot2: string
): boolean {
  const parse = (slot: string) => {
    const parts = slot.split(" - ");
    if (parts.length !== 2) return null;
    const toMinutes = (t: string) => {
      const [h, m] = t.trim().split(":").map(Number);
      return h * 60 + m;
    };
    return { start: toMinutes(parts[0]), end: toMinutes(parts[1]) };
  };

  const a = parse(timeSlot1);
  const b = parse(timeSlot2);

  if (!a || !b) return false;

  // Dois intervalos conflitam se um começa antes do outro terminar
  return a.start < b.end && b.start < a.end;
}

/**
 * Data e horário oficial de abertura: Sexta-feira, 11/09/2026 às 20:00:00 (Horário de Brasília)
 * Offset UTC-3 garante exatidão de liberação no servidor da Vercel
 */
export const OFFICIAL_RELEASE_DATE_ISO = "2026-09-11T20:00:00-03:00";
export const OFFICIAL_RELEASE_TIMESTAMP = new Date(OFFICIAL_RELEASE_DATE_ISO).getTime();

/**
 * Valida se as inscrições já estão liberadas segundo o relógio do servidor Vercel
 */
export function isRegistrationOfficiallyReleased(settings?: {
  releaseDate?: string;
  forceOpen?: boolean;
  registrationOpen?: boolean;
} | null): boolean {
  if (settings?.forceOpen === true) return true;
  if (settings?.registrationOpen === false) return false;

  const targetDateStr = settings?.releaseDate || OFFICIAL_RELEASE_DATE_ISO;
  const targetTimestamp = new Date(targetDateStr).getTime();
  return Date.now() >= targetTimestamp;
}

