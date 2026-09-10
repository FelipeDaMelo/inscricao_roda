// ============================================
// Tipos do Sistema de Inscrições
// Roda de Profissões — Marista Glória
// ============================================

export interface Student {
  id: string; // matrícula
  name: string;
  grade: string; // ex: "1ª Série EM", "2ª Série EM", "3ª Série EM"
  createdAt?: Date;
}

export interface Lecture {
  id: string;
  title: string;
  speaker: string;
  description: string;
  location: string;
  roomNumber?: string;
  courses?: string;
  guests?: string;
  mediator?: string;
  timeSlot: string; // ex: "11:00 - 12:00"
  date: string; // ex: "2026-09-16"
  maxCapacity: number;
  currentEnrollments: number;
  category: LectureCategory;
  isActive: boolean;
  createdAt?: Date;
}

export type LectureCategory =
  | "Saúde"
  | "Exatas"
  | "Humanas"
  | "Artes"
  | "Tecnologia"
  | "Negócios"
  | "Direito"
  | "Comunicação"
  | "Educação"
  | "Outros";

export interface Registration {
  id: string;
  studentId: string; // matrícula
  studentName: string;
  studentGrade: string;
  lectureId: string;
  lectureTitle: string;
  lectureTimeSlot: string;
  lectureDate?: string; // ex: "2026-09-16" | "2026-09-19"
  position: number; // posição na fila FIFO
  status: "confirmed" | "waitlist";
  registeredAt: Date;
}

export interface EventSettings {
  eventName: string;
  eventDate: string;
  registrationOpen: boolean;
  day16Open?: boolean;
  day19Open?: boolean;
  registrationStartDate?: string;
  registrationEndDate?: string;
  maxLecturesPerStudent: number; // 0 = sem limite (controlamos por horário)
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StudentLookupResponse {
  student: Student;
  registrations: Registration[];
}

export interface RegisterRequest {
  studentId: string;
  lectureId: string;
}

export interface RegisterResponse {
  registration: Registration;
  position: number;
}

// ============================================
// Admin Types
// ============================================

export interface LectureFormData {
  title: string;
  speaker: string;
  description: string;
  location: string;
  timeSlot: string;
  date: string;
  maxCapacity: number;
  category: LectureCategory;
  isActive: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalLectures: number;
  totalRegistrations: number;
  activeLectures: number;
  availableSpots: number;
}

export interface StudentImportData {
  id: string;
  name: string;
  grade: string;
}
