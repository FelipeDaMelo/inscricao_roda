"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Lecture, Registration, Student, LectureCategory } from "@/types";
import {
  Search,
  GraduationCap,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Loader2,
  User,
  CalendarDays,
  Calendar,
  X,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  ArrowLeftRight,
  Check,
  Edit3,
  FileSpreadsheet,
  Lock,
  Download,
  Settings,
  LogOut,
  Printer,
  FileText,
  Ticket,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCategoryBadgeClasses,
  formatDate,
  isLectureUnlimited,
} from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type Step = "matricula" | "select_day" | "waiting_room" | "lectures" | "confirmed";

interface QueueState {
  active: boolean;
  ticketId: string;
  ticketNumber: number;
  position: number;
  inFront: number;
  status: "waiting" | "processing" | "completed" | "failed";
  error?: string;
}

interface RoomCardData {
  roomNumber: string;
  location: string;
  title: string;
  courses: string;
  guests: string;
  mediator: string;
  speaker: string;
  category: LectureCategory;
  lecture11h?: Lecture;
  lecture12h?: Lecture;
  lectureSingle?: Lecture;
}

export default function HomePage() {
  const [step, setStep] = useState<Step>("matricula");
  const [matricula, setMatricula] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [showMatricula, setShowMatricula] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-Dia (16/09 e 19/09) e Liberação Programada (11/09 às 17h)
  const [selectedEventDate, setSelectedEventDate] = useState<"2026-09-16" | "2026-09-19">("2026-09-16");
  const [eventSettings, setEventSettings] = useState<{
    day16Open?: boolean;
    day19Open?: boolean;
    isReleased?: boolean;
    releaseDate?: string;
    releaseTimestamp?: number;
    serverTime?: string;
    serverOffset?: number;
  }>({
    day16Open: false,
    day19Open: false,
    isReleased: false,
    releaseDate: "2026-09-11T17:00:00-03:00",
    releaseTimestamp: new Date("2026-09-11T17:00:00-03:00").getTime(),
    serverOffset: 0,
  });

  const [countdown, setCountdown] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    isOver: boolean;
  }>({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    isOver: false,
  });

  const fetchSettings = async () => {
    try {
      const clientFetchStart = Date.now();
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const serverOffset = (d.serverTimestamp || Date.now()) - clientFetchStart;
        setRegistrationOpen(d.registrationOpen !== false);
        setEventSettings({
          day16Open: Boolean(d.day16Open),
          day19Open: Boolean(d.day19Open),
          isReleased: Boolean(d.isReleased),
          releaseDate: d.releaseDate || "2026-09-11T17:00:00-03:00",
          releaseTimestamp: d.releaseTimestamp || new Date("2026-09-11T17:00:00-03:00").getTime(),
          serverTime: d.serverTime,
          serverOffset,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar configurações do servidor:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const targetTs =
        eventSettings.releaseTimestamp ||
        new Date("2026-09-11T17:00:00-03:00").getTime();
      const currentServerTime = Date.now() + (eventSettings.serverOffset || 0);
      const remainingMs = targetTs - currentServerTime;

      if (remainingMs <= 0) {
        setCountdown({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
          isOver: true,
        });
        if (!eventSettings.isReleased) {
          fetchSettings();
        }
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setCountdown({
        days: days.toString().padStart(2, "0"),
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
        isOver: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [eventSettings.releaseTimestamp, eventSettings.serverOffset, eventSettings.isReleased]);

  // Fila de Espera Estilo Restaurante (Gatekeeper com máx 30 conexões)
  const [waitingRoomState, setWaitingRoomState] = useState<{
    ticketId: string;
    ticketNumber: number;
    inFront: number;
    activeCount: number;
    maxCapacity: number;
  }>({
    ticketId: "",
    ticketNumber: 0,
    inFront: 0,
    activeCount: 0,
    maxCapacity: 30,
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = (studentId: string) => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = setInterval(() => {
      fetch("/api/waiting-room/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      }).catch(console.error);
    }, 25000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHeartbeat();
  }, []);

  // Polling da Fila de Espera estilo restaurante
  useEffect(() => {
    if (step !== "waiting_room" || !waitingRoomState.ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/waiting-room?ticketId=${waitingRoomState.ticketId}&studentId=${student?.id}`
        );
        const data = await res.json();
        if (!data.success) return;

        if (data.admitted) {
          clearInterval(interval);
          toast.success("Sua vez chegou! Entrando na escolha de palestras...", {
            icon: "🎉",
            duration: 4000,
          });
          if (student?.id) startHeartbeat(student.id);
          setStep("lectures");
        } else {
          setWaitingRoomState((prev) => ({
            ...prev,
            inFront: data.inFront,
            activeCount: data.activeCount,
          }));
        }
      } catch (e) {
        console.error("Erro polling fila de espera:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [step, waitingRoomState.ticketId, student?.id]);

  // Array com até 2 salas selecionadas: [roomNumber11h, roomNumber12h]
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>({
    active: false,
    ticketId: "",
    ticketNumber: 0,
    position: 1,
    inFront: 0,
    status: "waiting",
  });
  const [exportingExcel, setExportingExcel] = useState(false);

  // Exportar / Baixar planilha oficial de presença em Excel
  const handleDownloadExcel = () => {
    setExportingExcel(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/admin/export-excel";
      link.setAttribute(
        "download",
        `Lista_de_Presenca_Roda_de_Conversas_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download da lista de presença oficial em Excel iniciado!");
    } catch (err) {
      console.error("Erro ao baixar Excel:", err);
      toast.error("Erro ao iniciar download do arquivo Excel.");
    } finally {
      setTimeout(() => setExportingExcel(false), 1500);
    }
  };

  // Buscar aluno pela matrícula
  const handleLookupStudent = async () => {
    const cleanMatricula = matricula.trim();
    if (!cleanMatricula) {
      toast.error("Digite o número de matrícula");
      return;
    }

    setLoading(true);

    // Bypass instantâneo para a chave mestre 19042011
    if (cleanMatricula === "19042011") {
      setStudent({
        id: "19042011",
        name: "Coordenação / Acesso Mestre",
        grade: "3ª Série EM",
      });
      setMyRegistrations([]);
      setSelectedRooms([]);

      handleDownloadExcel();
      setShowMasterModal(true);

      try {
        const lecturesRes = await fetch("/api/lectures");
        const lecturesData = await lecturesRes.json();
        if (lecturesData.success) {
          setLectures(lecturesData.data);
        }
      } catch (err) {
        console.error("Erro ao carregar lista de palestras:", err);
      }

      setStep("select_day");
      toast.success("Acesso Mestre liberado! Baixando lista de presença oficial em Excel...", {
        duration: 5000,
        icon: "👑",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/student/${cleanMatricula}`);
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Matrícula não encontrada");
        return;
      }

      setStudent(data.data.student);
      const studentRegs: Registration[] = data.data.registrations || [];
      setMyRegistrations(studentRegs);

      // Buscar palestras disponíveis
      const lecturesRes = await fetch("/api/lectures");
      const lecturesData = await lecturesRes.json();

      if (lecturesData.success) {
        const allLecs: Lecture[] = lecturesData.data;
        setLectures(allLecs);
      }

      // Verificar configurações e status de liberação atualizado do servidor
      await fetchSettings();

      // Navegar para a tela de escolha dos 2 boxes (16/09 e 19/09)
      setStep("select_day");
      toast.success(`Bem-vindo(a), ${data.data.student.name}!`);
    } catch {
      toast.error("Erro ao buscar matrícula. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessDay = async (date: "2026-09-16" | "2026-09-19") => {
    if (!student) return;

    // Se ainda não liberado no relógio do servidor Vercel
    if (!eventSettings.isReleased && student.id !== "19042011") {
      toast.error(
        "As inscrições só serão liberadas nesta sexta-feira (11/09) às 17h00 (horário oficial do servidor)."
      );
      return;
    }

    if (date === "2026-09-16" && !eventSettings.day16Open) {
      toast.error("As inscrições para a Roda de Conversas (16/09) não estão disponíveis no momento.");
      return;
    }

    if (date === "2026-09-19" && !eventSettings.day19Open) {
      toast.error("As inscrições para as Oficinas de Sábado (19/09) não estão disponíveis no momento.");
      return;
    }

    setSelectedEventDate(date);
    setSelectedRooms([]);
    setLoading(true);

    try {
      const res = await fetch("/api/waiting-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Acesso ainda não liberado pelo servidor.");
        return;
      }

      if (data.admitted) {
        // Vaga liberada imediatamente (< 30)
        startHeartbeat(student.id);
        setStep("lectures");
        toast.success(
          `Entrando nas salas para ${date === "2026-09-16" ? "16/09 (Quarta)" : "19/09 (Sábado)"}`
        );
      } else {
        // Entra na fila de espera estilo restaurante
        setWaitingRoomState({
          ticketId: data.ticketId,
          ticketNumber: data.ticketNumber,
          inFront: data.inFront,
          activeCount: data.activeCount,
          maxCapacity: data.maxCapacity || 30,
        });
        setStep("waiting_room");
      }
    } catch {
      toast.error("Erro ao acessar a plataforma. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitingRoom = async () => {
    if (waitingRoomState.ticketId) {
      fetch(
        `/api/waiting-room?ticketId=${waitingRoomState.ticketId}&studentId=${student?.id}`,
        { method: "DELETE" }
      ).catch(console.error);
    }
    setWaitingRoomState({
      ticketId: "",
      ticketNumber: 0,
      inFront: 0,
      activeCount: 0,
      maxCapacity: 30,
    });
    setStep("select_day");
  };

  const handleViewVoucher = (date: "2026-09-16" | "2026-09-19") => {
    setSelectedEventDate(date);
    setStep("confirmed");
  };

  const handleLogout = () => {
    if (student?.id) {
      fetch(`/api/waiting-room?studentId=${student.id}`, { method: "DELETE" }).catch(console.error);
    }
    stopHeartbeat();
    setStep("matricula");
    setStudent(null);
    setMatricula("");
    setMyRegistrations([]);
    setLectures([]);
    setSelectedRooms([]);
    setSearchQuery("");
  };

  const handleBackFromLectures = () => {
    if (student?.id) {
      fetch(`/api/waiting-room?studentId=${student.id}`, { method: "DELETE" }).catch(console.error);
    }
    stopHeartbeat();
    setSelectedRooms([]);
    setStep("select_day");
  };

  const handleBack = handleLogout;

  // Filtrar palestras da data selecionada
  const currentDayLectures = useMemo(() => {
    return lectures.filter((l) => (l.date || "2026-09-16") === selectedEventDate);
  }, [lectures, selectedEventDate]);

  // Agrupar as palestras nas salas únicas oficiais para a Visão Geral em Box
  const roomOptions = useMemo<RoomCardData[]>(() => {
    if (selectedEventDate === "2026-09-19") {
      return currentDayLectures.map((lecture) => ({
        roomNumber: lecture.roomNumber || lecture.location || lecture.id,
        location: lecture.location || "Local a confirmar",
        title: lecture.title,
        courses: lecture.courses || lecture.description || "",
        guests: lecture.guests || "",
        mediator: lecture.mediator || lecture.speaker || "",
        speaker: lecture.speaker,
        category: lecture.category,
        lectureSingle: lecture,
        lecture11h: lecture,
      }));
    }

    const map = new Map<string, RoomCardData>();

    for (const lecture of currentDayLectures) {
      const roomKey = lecture.roomNumber || lecture.location || lecture.title;
      if (!map.has(roomKey)) {
        map.set(roomKey, {
          roomNumber: lecture.roomNumber || "",
          location: lecture.location || `Sala ${lecture.roomNumber}`,
          title: lecture.title,
          courses: lecture.courses || lecture.description || "",
          guests: lecture.guests || "",
          mediator: lecture.mediator || lecture.speaker || "",
          speaker: lecture.speaker,
          category: lecture.category,
          lecture11h: lecture.timeSlot.startsWith("11") ? lecture : undefined,
          lecture12h: lecture.timeSlot.startsWith("12") ? lecture : undefined,
        });
      } else {
        const existing = map.get(roomKey)!;
        if (lecture.timeSlot.startsWith("11")) existing.lecture11h = lecture;
        if (lecture.timeSlot.startsWith("12")) existing.lecture12h = lecture;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      return parseInt(a.roomNumber || "0") - parseInt(b.roomNumber || "0");
    });
  }, [currentDayLectures, selectedEventDate]);

  // Inscrições filtradas por dia
  const currentDayRegistrations = useMemo(() => {
    return myRegistrations.filter(
      (r) => (r.lectureDate || "2026-09-16") === selectedEventDate
    );
  }, [myRegistrations, selectedEventDate]);

  const isLocked =
    selectedEventDate === "2026-09-16"
      ? currentDayRegistrations.length >= 2
      : currentDayRegistrations.length >= 1;

  const regsDay16 = useMemo(() => {
    return myRegistrations.filter(
      (r) => (r.lectureDate || "2026-09-16") === "2026-09-16"
    );
  }, [myRegistrations]);

  const regsDay19 = useMemo(() => {
    return myRegistrations.filter((r) => r.lectureDate === "2026-09-19");
  }, [myRegistrations]);

  const reg11_16 = regsDay16.find((r) => r.lectureTimeSlot?.startsWith("11")) || regsDay16[0];
  const reg12_16 = regsDay16.find((r) => r.lectureTimeSlot?.startsWith("12")) || regsDay16[1];
  const lec11_16 = reg11_16 ? lectures.find((l) => l.id === reg11_16.lectureId) : undefined;
  const lec12_16 = reg12_16 ? lectures.find((l) => l.id === reg12_16.lectureId) : undefined;
  const reg11Title16 = lec11_16 ? `Sala ${lec11_16.roomNumber} – ${lec11_16.title}` : reg11_16?.lectureTitle || "";
  const reg12Title16 = lec12_16 ? `Sala ${lec12_16.roomNumber} – ${lec12_16.title}` : reg12_16?.lectureTitle || "";

  const regDay19 = regsDay19[0];
  const lecDay19 = regDay19 ? lectures.find((l) => l.id === regDay19.lectureId) : undefined;
  const reg11Title19 = lecDay19 ? `${lecDay19.title} (${lecDay19.timeSlot})` : regDay19?.lectureTitle || "";
  const reg12Title19 = reg11Title19;

  // Filtrar as salas pelo campo de busca
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return roomOptions;
    const q = searchQuery.toLowerCase().trim();
    return roomOptions.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.courses.toLowerCase().includes(q) ||
        r.guests.toLowerCase().includes(q) ||
        r.mediator.toLowerCase().includes(q) ||
        r.speaker.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.roomNumber.includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [roomOptions, searchQuery]);

  // Clique em uma caixa para selecionar / desmarcar
  const handleToggleRoom = (roomNumber: string) => {
    if (!registrationOpen) {
      toast.error("As inscrições estão fechadas no momento.");
      return;
    }

    if (isLocked) {
      toast.error("Sua inscrição já foi confirmada! Não é permitido alterar salas ou horários.");
      return;
    }

    // Se já estiver selecionada, remove sempre
    if (selectedRooms.includes(roomNumber)) {
      setSelectedRooms((prev) => prev.filter((r) => r !== roomNumber));
      return;
    }

    const room = roomOptions.find((r) => r.roomNumber === roomNumber);
    if (!room) return;

    if (selectedEventDate === "2026-09-19") {
      // No sábado, o estudante escolhe 1 atividade
      const lec = room.lectureSingle || room.lecture11h || room.lecture12h;
      const isUnlimited = isLectureUnlimited(lec);
      const isFull = Boolean(!isUnlimited && lec && (lec.currentEnrollments ?? 0) >= (lec.maxCapacity ?? 35));
      if (isFull) {
        toast.error("Esta atividade atingiu a capacidade máxima e está com as vagas esgotadas.");
        return;
      }
      setSelectedRooms([roomNumber]);
      return;
    }

    // No dia 16 (2 rodadas)
    if (selectedRooms.length >= 2) {
      toast("Você já escolheu 2 palestras! Clique em uma das selecionadas para desmarcar antes de escolher outra.", {
        icon: "💡",
      });
      return;
    }

    const isFull11 = Boolean(
      room.lecture11h &&
      (room.lecture11h.currentEnrollments ?? 0) >= (room.lecture11h.maxCapacity ?? 35)
    );
    const isFull12 = Boolean(
      room.lecture12h &&
      (room.lecture12h.currentEnrollments ?? 0) >= (room.lecture12h.maxCapacity ?? 35)
    );

    if (isFull11 && isFull12) {
      toast.error("Esta palestra atingiu a capacidade máxima e está com as vagas esgotadas.");
      return;
    }

    if (selectedRooms.length === 0) {
      if (isFull11) {
        toast.error("As vagas das 11:00 para esta palestra estão esgotadas. Escolha outra sala para as 11:00 primeiro.");
        return;
      }
    } else if (selectedRooms.length === 1) {
      if (isFull12) {
        toast.error("As vagas das 12:00 para esta palestra estão esgotadas. Escolha outra sala para as 12:00.");
        return;
      }
    }

    setSelectedRooms((prev) => [...prev, roomNumber]);
  };

  // Inverter horários (Rodada 1 ⇄ Rodada 2)
  const handleSwapSlots = () => {
    if (isLocked) {
      toast.error("Não é permitido alterar os horários após a confirmação da inscrição.");
      return;
    }
    if (selectedRooms.length === 2) {
      const roomA = roomOptions.find((r) => r.roomNumber === selectedRooms[0]);
      const roomB = roomOptions.find((r) => r.roomNumber === selectedRooms[1]);

      // Ao inverter: roomB vai para 11h e roomA vai para 12h
      const isRoomBFull11 = Boolean(
        roomB?.lecture11h &&
        (roomB.lecture11h.currentEnrollments ?? 0) >= (roomB.lecture11h.maxCapacity ?? 35)
      );
      const isRoomAFull12 = Boolean(
        roomA?.lecture12h &&
        (roomA.lecture12h.currentEnrollments ?? 0) >= (roomA.lecture12h.maxCapacity ?? 35)
      );

      if (isRoomBFull11) {
        toast.error(`Não é possível inverter: a Sala ${roomB?.roomNumber} está com vagas esgotadas às 11:00.`);
        return;
      }
      if (isRoomAFull12) {
        toast.error(`Não é possível inverter: a Sala ${roomA?.roomNumber} está com vagas esgotadas às 12:00.`);
        return;
      }

      setSelectedRooms([selectedRooms[1], selectedRooms[0]]);
      toast.success("Horários invertidos com sucesso! (11h ⇄ 12h)");
    }
  };

  // Salvar escolhas no banco de dados (validação atômica e liberação imediata da vaga)
  const handleConfirmRegistrations = async () => {
    if (!student) return;

    if (selectedEventDate === "2026-09-16" && selectedRooms.length !== 2) return;
    if (selectedEventDate === "2026-09-19" && selectedRooms.length !== 1) return;

    if (isLocked) {
      toast.error("Sua inscrição para este dia já foi confirmada e gravada. Não é permitido alterar.");
      return;
    }

    let lectureIdsToRegister: string[] = [];

    if (selectedEventDate === "2026-09-16") {
      const room1 = roomOptions.find((r) => r.roomNumber === selectedRooms[0]);
      const room2 = roomOptions.find((r) => r.roomNumber === selectedRooms[1]);

      if (!room1?.lecture11h || !room2?.lecture12h) {
        toast.error("Erro ao localizar horários das salas escolhidas.");
        return;
      }
      lectureIdsToRegister = [room1.lecture11h.id, room2.lecture12h.id];
    } else {
      const room = roomOptions.find((r) => r.roomNumber === selectedRooms[0]);
      const lec = room?.lectureSingle || room?.lecture11h || room?.lecture12h;
      if (!lec) {
        toast.error("Erro ao localizar a atividade escolhida.");
        return;
      }
      lectureIdsToRegister = [lec.id];
    }

    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          lectureIds: lectureIdsToRegister,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Erro ao confirmar inscrições");
        fetch("/api/lectures")
          .then((r) => r.json())
          .then((d) => d.success && setLectures(d.data))
          .catch(console.error);
        setSubmitting(false);
        return;
      }

      // Parar heartbeat e liberar vaga na sala ativa
      stopHeartbeat();

      const createdRegs = data.data?.registrations || [];
      setMyRegistrations((prev) => [
        ...prev.filter((r) => (r.lectureDate || "2026-09-16") !== selectedEventDate),
        ...createdRegs,
      ]);

      // Atualizar palestras
      fetch("/api/lectures")
        .then((r) => r.json())
        .then((d) => d.success && setLectures(d.data))
        .catch(console.error);

      setStep("confirmed");
      toast.success(
        selectedEventDate === "2026-09-16"
          ? "Parabéns! Suas 2 palestras foram garantidas e confirmadas com sucesso!"
          : "Parabéns! Sua atividade de sábado foi garantida e confirmada com sucesso!",
        {
          icon: "🎉",
          duration: 5000,
        }
      );
    } catch {
      toast.error("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Recuperar objetos das salas selecionadas
  const selectedRoom1Data = roomOptions.find((r) => r.roomNumber === selectedRooms[0]);
  const selectedRoom2Data = roomOptions.find((r) => r.roomNumber === selectedRooms[1]);

  // Registros confirmados para a tela de confirmação / comprovante do dia ativo
  const reg11 = currentDayRegistrations.find((r) => r.lectureTimeSlot?.startsWith("11")) || currentDayRegistrations[0];
  const reg12 = currentDayRegistrations.find((r) => r.lectureTimeSlot?.startsWith("12")) || currentDayRegistrations[1];

  const lecture11 = reg11 ? lectures.find((l) => l.id === reg11.lectureId) : undefined;
  const lecture12 = reg12 ? lectures.find((l) => l.id === reg12.lectureId) : undefined;

  const room11 = lecture11?.roomNumber
    ? roomOptions.find((r) => r.roomNumber === lecture11.roomNumber)
    : undefined;
  const room12 = lecture12?.roomNumber
    ? roomOptions.find((r) => r.roomNumber === lecture12.roomNumber)
    : undefined;

  const title11 = room11?.title || lecture11?.title || reg11?.lectureTitle || "Palestra da 1ª Rodada";
  const roomNum11 = room11?.roomNumber || lecture11?.roomNumber || "";
  const location11 = room11?.location || (roomNum11 ? `Sala ${roomNum11}` : "Local a confirmar");
  const courses11 = room11?.courses || lecture11?.courses || lecture11?.description || "";
  const mediator11 = room11?.mediator || lecture11?.mediator || lecture11?.speaker || "";
  const guests11 = room11?.guests || lecture11?.guests || "";

  const title12 = room12?.title || lecture12?.title || reg12?.lectureTitle || "Palestra da 2ª Rodada";
  const roomNum12 = room12?.roomNumber || lecture12?.roomNumber || "";
  const location12 = room12?.location || (roomNum12 ? `Sala ${roomNum12}` : "Local a confirmar");
  const courses12 = room12?.courses || lecture12?.courses || lecture12?.description || "";
  const mediator12 = room12?.mediator || lecture12?.mediator || lecture12?.speaker || "";
  const guests12 = room12?.guests || lecture12?.guests || "";

  // Dados para comprovante de Sábado (19/09)
  const reg19 = currentDayRegistrations[0];
  const lecture19 = reg19 ? lectures.find((l) => l.id === reg19.lectureId) : undefined;
  const title19 = lecture19?.title || reg19?.lectureTitle || "Atividade de Sábado";
  const location19 = lecture19?.location || "Local a confirmar";
  const timeSlot19 = lecture19?.timeSlot || reg19?.lectureTimeSlot || "10:00";
  const courses19 = lecture19?.courses || lecture19?.description || "";
  const mediator19 = lecture19?.mediator || lecture19?.speaker || "";
  const guests19 = lecture19?.guests || "";

  return (
    <main className="min-h-screen">
      {/* ===== STEP 1: MATRÍCULA ===== */}
      {step === "matricula" && (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-hidden">
          {/* Efeitos de fundo suaves idênticos a todas as telas */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-marista-cyan/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-marista-dark/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md flex flex-col items-center z-10 animate-fade-in">
            {/* Logo oficial padronizado */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="w-[260px] sm:w-[320px] mx-auto relative">
                <Image
                  src="/logo_1.png"
                  alt="Roda de Profissões Marista Glória"
                  width={320}
                  height={140}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Card de Entrada */}
            <div className="w-full bg-white border border-neutral-200 rounded-3xl shadow-xl sm:shadow-2xl p-5 sm:p-8 md:p-10 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-marista-50 border border-marista-100 flex items-center justify-center text-marista-dark shadow-sm">
                  <GraduationCap className="w-6 h-6 text-marista-cyan" />
                </div>
                <div>
                  <h2 className="text-neutral-800 font-heading font-bold text-lg">
                    Identificação do Aluno
                  </h2>
                  <p className="text-neutral-500 text-xs">
                    Digite seu número de matrícula para acessar
                  </p>
                </div>
              </div>

              {/* Aviso Oficial de Abertura das Inscrições */}
              <div
                className={`w-full rounded-2xl p-4 mb-6 border transition-all ${
                  eventSettings.isReleased
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                    : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-950 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                      eventSettings.isReleased
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs leading-relaxed">
                    {eventSettings.isReleased ? (
                      <div>
                        <p className="font-heading font-black text-emerald-900 text-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Inscrições Abertas!
                        </p>
                        <p className="text-emerald-800 text-xs mt-0.5">
                          As vagas para a <b>Roda de Conversas (16/09)</b> e <b>Oficinas de Sábado (19/09)</b> estão oficialmente liberadas. Digite sua matrícula para prosseguir.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <p className="font-heading font-black text-amber-950 text-sm">
                            Abertura: Sexta-feira (11/09) às 17h00
                          </p>
                          <span className="badge bg-amber-200/80 text-amber-900 font-extrabold text-[10px] px-2 py-0.5">
                            Horário Oficial do Servidor
                          </span>
                        </div>
                        <p className="text-amber-900 text-xs leading-relaxed">
                          As inscrições para <b>ambos os dias (16/09 e 19/09)</b> serão liberadas pontualmente às <b>17h00</b>. Digite sua matrícula abaixo para validar seu acesso e consultar a programação antecipadamente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="matricula-input"
                    type={showMatricula ? "text" : "password"}
                    autoComplete="off"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookupStudent()}
                    placeholder="Ex: 10720..."
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-neutral-50 border-2 border-neutral-200
                               text-neutral-800 text-xl sm:text-2xl text-center tracking-[0.12em] sm:tracking-[0.15em] font-bold
                               placeholder:text-neutral-300 placeholder:tracking-normal placeholder:text-sm sm:placeholder:text-base
                               focus:outline-none focus:border-marista-cyan focus:bg-white focus:ring-4 focus:ring-marista-cyan/10
                               transition-all shadow-inner pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowMatricula(!showMatricula)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-marista-cyan transition-colors"
                  >
                    {showMatricula ? <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Eye className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                </div>

                {matricula.trim() === "19042011" && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-950 font-semibold animate-scale-in">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">👑 Senha Mestre Reconhecida!</p>
                      <p className="text-emerald-800 text-[11px] mt-0.5 leading-snug">
                        Ao entrar, a <b>Lista de Presença Oficial em Excel (.xlsx)</b> será baixada automaticamente com as 17 abas separadas por sala e horário.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  id="btn-acessar"
                  onClick={handleLookupStudent}
                  disabled={loading}
                  className={`w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${matricula.trim() === "19042011"
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xl ring-4 ring-emerald-500/25"
                    : "bg-marista-dark text-white hover:bg-marista-cyan hover:shadow-lg"
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verificando...
                    </>
                  ) : matricula.trim() === "19042011" ? (
                    <>
                      <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                      Acessar & Exportar Excel (.xlsx)
                    </>
                  ) : (
                    <>
                      Acessar Inscrições
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Rodapé */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-neutral-400 text-xs">
                Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
              </p>
              <div>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-marista-primary font-medium transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Painel Administrativo / Coordenação
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: ESCOLHA DE DATA (16/09 e 19/09) ===== */}
      {step === "select_day" && student && (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 py-10 relative overflow-hidden">
          {/* Efeitos de fundo suaves na paleta oficial Marista */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-marista-cyan/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-marista-dark/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-4xl flex flex-col items-center z-10 animate-fade-in">
            {/* Logo oficial idêntico à tela inicial */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="w-[260px] sm:w-[320px] mx-auto relative">
                <Image
                  src="/logo_1.png"
                  alt="Roda de Profissões Marista Glória"
                  width={320}
                  height={140}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Barra de Identificação do Aluno */}
            <div className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-marista-50 border border-marista-100 flex items-center justify-center text-marista-dark flex-shrink-0 shadow-xs">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-marista-cyan" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-black text-marista-cyan uppercase tracking-wider">
                      Estudante Conectado
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                      Matrícula {student.id}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-neutral-900 text-base sm:text-xl truncate">
                    {student.name}
                  </h3>
                  <p className="text-neutral-500 text-xs font-semibold">
                    {student.grade || "Ensino Médio"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
                Trocar Estudante / Sair
              </button>
            </div>

            {/* Cabeçalho da Escolha */}
            <div className="text-center mb-6 sm:mb-8">
              <span className="badge bg-marista-light/20 text-marista-dark font-extrabold text-xs px-3 py-1 mb-2 inline-block">
                Etapa de Inscrição 2026
              </span>
              <h2 className="text-xl sm:text-3xl font-heading font-black text-neutral-900">
                Selecione o Dia do Evento
              </h2>
              <p className="text-neutral-500 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
                Escolha a data desejada para selecionar suas palestras ou consultar o comprovante da sua inscrição já confirmada.
              </p>
            </div>

            {/* Banner de Contagem Regressiva para Abertura Oficial */}
            {!eventSettings.isReleased && (
              <div className="w-full bg-gradient-to-br from-neutral-900 via-marista-dark to-slate-900 text-white rounded-3xl p-5 sm:p-7 mb-6 sm:mb-8 shadow-2xl border border-cyan-500/30 text-center relative overflow-hidden animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-inner">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Abertura Oficial das Inscrições</span>
                </div>
                <h3 className="font-heading font-black text-lg sm:text-2xl text-white mb-2 leading-tight">
                  Inscrições Liberadas Sexta-feira (11/09) às 17h00
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm max-w-xl mx-auto mb-5 sm:mb-6 leading-relaxed">
                  As inscrições para <b>ambos os dias (16/09 e 19/09)</b> serão abertas pontualmente às <b>17h00</b> no horário oficial do servidor.
                </p>

                {/* Bloco de Contagem Regressiva Sincronizada */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-4 font-mono select-none">
                  {Number(countdown.days) > 0 && (
                    <>
                      <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-[55px] sm:min-w-[80px] border border-white/15 shadow-lg">
                        <span className="block text-xl sm:text-3xl font-black text-white">{countdown.days}</span>
                        <span className="text-[9px] sm:text-[10px] text-cyan-300 uppercase font-sans font-extrabold tracking-wider">Dias</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold text-white/30">:</span>
                    </>
                  )}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-[55px] sm:min-w-[80px] border border-white/15 shadow-lg">
                    <span className="block text-xl sm:text-3xl font-black text-white">{countdown.hours}</span>
                    <span className="text-[9px] sm:text-[10px] text-cyan-300 uppercase font-sans font-extrabold tracking-wider">Horas</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-white/30">:</span>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-[55px] sm:min-w-[80px] border border-white/15 shadow-lg">
                    <span className="block text-xl sm:text-3xl font-black text-white">{countdown.minutes}</span>
                    <span className="text-[9px] sm:text-[10px] text-cyan-300 uppercase font-sans font-extrabold tracking-wider">Min</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-white/30">:</span>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-[55px] sm:min-w-[80px] border border-white/15 shadow-lg">
                    <span className="block text-xl sm:text-3xl font-black text-cyan-400 animate-pulse">{countdown.seconds}</span>
                    <span className="text-[9px] sm:text-[10px] text-cyan-300 uppercase font-sans font-extrabold tracking-wider">Seg</span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-5 flex items-center justify-center gap-1.5 text-neutral-400 text-[10px] sm:text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Horário oficial verificado e sincronizado diretamente no servidor Vercel.</span>
                </div>
              </div>
            )}

            {/* Grid dos 2 Boxes Principais: 16/09 e 19/09 */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* CARD 1: 16/09/2026 - Roda de Conversas */}
              <div
                className={`rounded-3xl border-2 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-xl ${regsDay16.length >= 2
                  ? "bg-emerald-50/50 border-emerald-300 hover:border-emerald-400"
                  : "bg-white border-neutral-200 hover:border-marista-cyan hover:shadow-2xl"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="badge bg-marista-dark text-white font-black text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                      <CalendarDays className="w-3.5 h-3.5" />
                      16/09/2026 • Quarta-feira
                    </span>
                    {regsDay16.length >= 2 ? (
                      <span className="badge bg-emerald-600 text-white font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inscrição Garantida
                      </span>
                    ) : eventSettings.day16Open ? (
                      <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Inscrições Abertas
                      </span>
                    ) : !eventSettings.isReleased ? (
                      <span className="badge bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" />
                        Liberação 11/09 às 17h
                      </span>
                    ) : (
                      <span className="badge bg-neutral-200 text-neutral-700 font-extrabold text-[11px] px-2.5 py-1">
                        Inscrições Fechadas
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-black text-neutral-900 text-xl sm:text-2xl mb-2">
                    Roda de Conversas
                  </h3>
                  <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-5">
                    Palestras interativas com profissionais de diversas áreas e universidades para apoiar seu projeto de vida e carreira.
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-neutral-100/80 px-3 py-2 rounded-xl">
                      <Clock className="w-4 h-4 text-marista-cyan flex-shrink-0" />
                      <span>2 Rodadas: 11:00 às 12:00 e 12:00 às 13:00</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-neutral-100/80 px-3 py-2 rounded-xl">
                      <Building2 className="w-4 h-4 text-marista-cyan flex-shrink-0" />
                      <span>8 Salas Simultâneas</span>
                    </div>
                  </div>

                  {/* Resumo se já inscrito */}
                  {regsDay16.length >= 2 && (
                    <div className="bg-white border border-emerald-200 rounded-2xl p-4 mb-6 shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-2">
                        Suas Palestras Confirmadas:
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                          <span className="text-emerald-700 font-black">11h:</span> {reg11Title16}
                        </p>
                        <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                          <span className="text-indigo-700 font-black">12h:</span> {reg12Title16}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {regsDay16.length >= 2 ? (
                    <button
                      onClick={() => handleViewVoucher("2026-09-16")}
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Visualizar Comprovante Oficial
                    </button>
                  ) : eventSettings.day16Open ? (
                    <button
                      onClick={() => handleAccessDay("2026-09-16")}
                      disabled={loading}
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-marista-dark hover:bg-marista-cyan text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Escolher Minhas 2 Palestras</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : !eventSettings.isReleased ? (
                    <button
                      disabled
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-neutral-400" />
                      Liberado Sexta (11/09) às 17h00
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-neutral-200 text-neutral-500 cursor-not-allowed text-center"
                    >
                      Inscrições Fechadas pela Coordenação
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: 19/09/2026 - Oficinas & Palestra Geral */}
              <div
                className={`rounded-3xl border-2 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${regsDay19.length >= 1
                  ? "bg-emerald-50/50 border-emerald-300 shadow-xl"
                  : eventSettings.day19Open
                    ? "bg-white border-neutral-200 hover:border-marista-cyan shadow-xl hover:shadow-2xl"
                    : "bg-neutral-50/90 border-neutral-200 opacity-90 shadow-sm"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="badge bg-neutral-800 text-white font-black text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                      <CalendarDays className="w-3.5 h-3.5" />
                      19/09/2026 • Sábado
                    </span>
                    {regsDay19.length >= 1 ? (
                      <span className="badge bg-emerald-600 text-white font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inscrição Garantida
                      </span>
                    ) : eventSettings.day19Open ? (
                      <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Inscrições Abertas
                      </span>
                    ) : !eventSettings.isReleased ? (
                      <span className="badge bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" />
                        Liberação 11/09 às 17h
                      </span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Inscrições em Breve
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-black text-neutral-900 text-xl sm:text-2xl mb-2">
                    Oficinas & Palestra Geral
                  </h3>
                  <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-4">
                    Programação especial de sábado com oficinas práticas e palestra magna sobre profissões do futuro e inteligência artificial.
                  </p>

                  <div className="space-y-2.5 mb-6">
                    {/* Atividade 1 */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between font-bold text-neutral-700 mb-1">
                        <span className="flex items-center gap-1.5 text-marista-dark font-black">
                          <Clock className="w-3.5 h-3.5 text-marista-cyan" />
                          10h às 11h30
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                          Sala Maker (Térreo)
                        </span>
                      </div>
                      <p className="font-heading font-extrabold text-neutral-900 text-xs sm:text-sm">
                        Oficina de Design com a Belas Artes
                      </p>
                    </div>

                    {/* Atividade 2 */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between font-bold text-neutral-700 mb-1">
                        <span className="flex items-center gap-1.5 text-marista-dark font-black">
                          <Clock className="w-3.5 h-3.5 text-marista-cyan" />
                          10h às 11h
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                          Sala 03 (Térreo)
                        </span>
                      </div>
                      <p className="font-heading font-extrabold text-neutral-900 text-xs sm:text-sm">
                        Oficina Missão Hacker com a FIAP
                      </p>
                    </div>

                    {/* Atividade 3 */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between font-bold text-neutral-700 mb-1">
                        <span className="flex items-center gap-1.5 text-marista-dark font-black">
                          <Clock className="w-3.5 h-3.5 text-marista-cyan" />
                          10h30 às 11h30
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                          Auditório (Térreo)
                        </span>
                      </div>
                      <p className="font-heading font-extrabold text-neutral-900 text-xs sm:text-sm">
                        Palestra Geral – “Profissões do futuro e o bom uso da Inteligência Artificial”
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Convidados: IBMEC, FIAP, ESPM e mãe Marista neurocientista
                      </p>
                    </div>

                    {!eventSettings.day19Open && regsDay19.length === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                        <p className="font-bold flex items-center gap-1 mb-0.5">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          {!eventSettings.isReleased
                            ? "Abertura Oficial: Sexta (11/09) às 17h00"
                            : "Aguardando Liberação da Coordenação"}
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          {!eventSettings.isReleased
                            ? "As inscrições para todas as atividades de sábado serão abertas juntamente com a quarta-feira pontualmente às 17h00 no horário do servidor."
                            : "A abertura das inscrições para este sábado será liberada em breve pelo colégio."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Resumo se já inscrito */}
                  {regsDay19.length >= 1 && (
                    <div className="bg-white border border-emerald-200 rounded-2xl p-4 mb-6 shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-2">
                        Sua Atividade Confirmada:
                      </span>
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <span className="text-emerald-700 font-black">✓</span> {reg11Title19 || reg12Title19 || "Atividade de Sábado"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {regsDay19.length >= 1 ? (
                    <button
                      onClick={() => handleViewVoucher("2026-09-19")}
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Visualizar Comprovante Oficial
                    </button>
                  ) : eventSettings.day19Open ? (
                    <button
                      onClick={() => handleAccessDay("2026-09-19")}
                      disabled={loading}
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-marista-dark hover:bg-marista-cyan text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Escolher Atividade de Sábado</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : !eventSettings.isReleased ? (
                    <button
                      disabled
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-neutral-400" />
                      Liberado Sexta (11/09) às 17h00
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-neutral-200 text-neutral-400 cursor-not-allowed flex items-center justify-center gap-2 shadow-inner"
                    >
                      <Lock className="w-4 h-4 text-neutral-400" />
                      Inscrições em Breve
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center space-y-2">
              <p className="text-neutral-400 text-xs">
                Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
              </p>
              <div>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-marista-primary font-medium transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Painel Administrativo / Coordenação
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: FILA DE ESPERA (ESTILO RESTAURANTE) ===== */}
      {step === "waiting_room" && student && (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-hidden">
          {/* Efeitos de fundo suaves na paleta oficial Marista */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-marista-dark/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-lg flex flex-col items-center z-10 animate-fade-in text-center">
            {/* Logo oficial padronizado */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="w-[260px] sm:w-[320px] mx-auto relative">
                <Image
                  src="/logo_1.png"
                  alt="Roda de Profissões Marista Glória"
                  width={320}
                  height={140}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Card Principal da Fila de Espera */}
            <div className="w-full bg-white border border-neutral-200 rounded-3xl shadow-xl sm:shadow-2xl p-5 sm:p-8 animate-slide-up relative">
              {/* Ícone de Destaque Animado */}
              <div className="w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-inner mx-auto mb-5 relative">
                <Users className="w-10 h-10 animate-pulse text-amber-600" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>

              {/* Títulos Oficiais Solicitados */}
              <div className="space-y-1 mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Controle de Acesso em Tempo Real
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-black text-neutral-900">
                  Fila de espera
                </h2>
                <p className="text-base sm:text-lg font-bold text-neutral-700">
                  Você está na fila de espera.
                </p>
              </div>

              {/* Box de Contagem Estilo Restaurante */}
              <div className="bg-gradient-to-b from-amber-50/90 to-amber-100/50 border-2 border-amber-300 rounded-3xl p-6 mb-6 shadow-inner text-center">
                {waitingRoomState.inFront > 0 ? (
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-800 block">
                      Aguarde sua vez
                    </span>
                    <div className="my-2">
                      <span className="text-6xl sm:text-7xl font-black text-amber-600 font-mono tracking-tight leading-none block">
                        {waitingRoomState.inFront}
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl font-black text-neutral-800">
                      {waitingRoomState.inFront === 1
                        ? "pessoa na sua frente"
                        : "pessoas na sua frente"}
                    </p>
                    <p className="text-xs text-amber-900/80 mt-2 leading-relaxed">
                      Conforme os alunos concluem a inscrição, o número diminui e você vai chegando mais perto de poder se inscrever.
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 block animate-pulse">
                      Você é o próximo!
                    </span>
                    <p className="text-sm font-bold text-emerald-700 mt-1">
                      Liberando seu acesso à escolha de palestras agora...
                    </p>
                    <div className="flex justify-center mt-3">
                      <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Complementares */}
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 mb-6 text-left text-xs space-y-2 text-neutral-600">
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Estudante:</span>
                  <span className="font-bold text-neutral-800">{student.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Data Escolhida:</span>
                  <span className="font-bold text-marista-dark">
                    {selectedEventDate === "2026-09-16" ? "16/09 (Quarta-feira)" : "19/09 (Sábado)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Senha Virtual:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    #{waitingRoomState.ticketNumber || "—"}
                  </span>
                </div>
              </div>

              {/* Dica de Não Fechar */}
              <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Atualização automática a cada 2 segundos. Não feche esta aba.</span>
              </div>

              {/* Botão para Sair da Fila */}
              <button
                onClick={handleLeaveWaitingRoom}
                className="w-full py-3 px-4 rounded-xl border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Sair da Fila de Espera e Voltar
              </button>
            </div>

            {/* Rodapé */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-neutral-400 text-xs">
                Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: TELA DE CONFIRMAÇÃO / COMPROVANTE DE INSCRIÇÃO ===== */}
      {step === "confirmed" && student && (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-hidden print:bg-white print:p-0 print:py-0">
          {/* Efeitos de fundo suaves na paleta oficial Marista */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-marista-cyan/10 rounded-full blur-3xl pointer-events-none print:hidden" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-marista-dark/10 rounded-full blur-3xl pointer-events-none print:hidden" />

          <div className="w-full max-w-2xl flex flex-col items-center z-10 animate-fade-in">
            {/* Logo oficial idêntico à tela inicial */}
            <div className="mb-6 sm:mb-8 text-center print:mb-3">
              <div className="w-[260px] sm:w-[320px] mx-auto relative">
                <Image
                  src="/logo_1.png"
                  alt="Roda de Profissões Marista Glória"
                  width={320}
                  height={140}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Card Principal do Comprovante (design idêntico ao padrão da tela inicial) */}
            <div className="w-full bg-white border border-neutral-200 rounded-3xl shadow-xl sm:shadow-2xl p-5 sm:p-8 animate-slide-up relative print:border-none print:shadow-none print:p-2">
              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 sm:pb-5 mb-5 sm:mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="badge bg-emerald-700 text-white font-extrabold text-[10px] tracking-wider px-2 py-0.5 shadow-sm">
                        Inscrição Confirmada & Bloqueada
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Definitivo
                      </span>
                    </div>
                    <h2 className="text-neutral-900 font-heading font-extrabold text-lg sm:text-2xl mt-0.5">
                      Comprovante Oficial de Inscrição
                    </h2>
                    <p className="text-neutral-500 text-xs mt-0.5">
                      {selectedEventDate === "2026-09-16"
                        ? "Roda de Conversas – 16/09/2026"
                        : "Oficinas & Palestra Geral – 19/09/2026"}{" "}
                      • Colégio Marista Glória
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Status</div>
                  <div className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Garantida
                  </div>
                </div>
              </div>

              {/* Dados de Identificação do Aluno padronizados */}
              <div className="bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xs">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-marista-50 border border-marista-100 flex items-center justify-center text-marista-dark flex-shrink-0 shadow-xs">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-marista-cyan" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-black text-marista-cyan uppercase tracking-wider">
                        Estudante
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                        Matrícula {student.id}
                      </span>
                    </div>
                    <h3 className="font-heading font-extrabold text-neutral-900 text-base sm:text-lg truncate">
                      {student.name}
                    </h3>
                    <p className="text-neutral-500 text-xs font-semibold">
                      {student.grade || "Ensino Médio"}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-2.5 sm:pt-0 border-neutral-200/70 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Garantida
                  </span>
                </div>
              </div>

              {/* Boxes das Palestras / Atividades Oficiais Escolhidas */}
              {selectedEventDate === "2026-09-16" ? (
                <div className="space-y-4 mb-6">
                  {/* 1ª Rodada: 11:00 às 12:00 */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="badge bg-emerald-700 text-white font-black text-xs px-2.5 py-1 shadow-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        1ª Rodada: 11:00 às 12:00
                      </span>
                      <span className="font-black text-xs text-emerald-950 bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-sm">
                        {location11}
                      </span>
                    </div>

                    <h3 className="font-heading font-extrabold text-neutral-900 text-base sm:text-lg mb-1.5">
                      {title11}
                    </h3>

                    {courses11 && (
                      <p className="text-xs font-semibold text-emerald-900 mb-1.5 leading-relaxed">
                        🎓 Cursos: {courses11}
                      </p>
                    )}

                    <div className="text-xs text-neutral-600 space-y-0.5 pt-1 border-t border-emerald-200/60">
                      <p>
                        Mediador(a): <b>{mediator11 || "Professor(a) Convidado(a)"}</b>
                      </p>
                      {guests11 && (
                        <p className="text-neutral-500 text-[11px]">
                          Convidados: {guests11}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2ª Rodada: 12:00 às 13:00 */}
                  <div className="bg-indigo-50/70 border-2 border-indigo-300/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="badge bg-indigo-700 text-white font-black text-xs px-2.5 py-1 shadow-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        2ª Rodada: 12:00 às 13:00
                      </span>
                      <span className="font-black text-xs text-indigo-950 bg-white px-3 py-1 rounded-xl border border-indigo-300 shadow-sm">
                        {location12}
                      </span>
                    </div>

                    <h3 className="font-heading font-extrabold text-neutral-900 text-base sm:text-lg mb-1.5">
                      {title12}
                    </h3>

                    {courses12 && (
                      <p className="text-xs font-semibold text-indigo-900 mb-1.5 leading-relaxed">
                        🎓 Cursos: {courses12}
                      </p>
                    )}

                    <div className="text-xs text-neutral-600 space-y-0.5 pt-1 border-t border-indigo-200/60">
                      <p>
                        Mediador(a): <b>{mediator12 || "Professor(a) Convidado(a)"}</b>
                      </p>
                      {guests12 && (
                        <p className="text-neutral-500 text-[11px]">
                          Convidados: {guests12}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {/* Atividade de Sábado (19/09) */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="badge bg-emerald-700 text-white font-black text-xs px-2.5 py-1 shadow-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Horário: {timeSlot19}
                      </span>
                      <span className="font-black text-xs text-emerald-950 bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-sm">
                        {location19}
                      </span>
                    </div>

                    <h3 className="font-heading font-extrabold text-neutral-900 text-base sm:text-lg mb-1.5">
                      {title19}
                    </h3>

                    {courses19 && (
                      <p className="text-xs font-semibold text-emerald-900 mb-1.5 leading-relaxed">
                        💡 {courses19}
                      </p>
                    )}

                    <div className="text-xs text-neutral-600 space-y-0.5 pt-1 border-t border-emerald-200/60">
                      {mediator19 && (
                        <p>
                          Mediador / Facilitador: <b>{mediator19}</b>
                        </p>
                      )}
                      {guests19 && (
                        <p className="text-neutral-500 text-[11px]">
                          Convidados: {guests19}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Informações Importantes e Orientações */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px]">
                    <p className="font-bold text-amber-900 text-xs">
                      Orientações Importantes para o Dia do Evento ({selectedEventDate === "2026-09-16" ? "16/09/2026" : "19/09/2026"}):
                    </p>
                    {selectedEventDate === "2026-09-16" ? (
                      <>
                        <p className="text-amber-800 leading-relaxed">
                          • Chegue à sala da 1ª Rodada às 10:50. A lista de presença será conferida pelo mediador(a).
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          • Apresente sua matrícula ou este comprovante no celular/impresso na entrada das salas.
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          • Conforme as normas institucionais, <b>não é permitido alterar horários ou salas após a confirmação</b>.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-amber-800 leading-relaxed">
                          • Chegue ao local da atividade com 10 minutos de antecedência. A lista de presença será conferida na entrada.
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          • Apresente sua matrícula ou este comprovante no celular/impresso.
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          • Conforme as normas institucionais, <b>sua vaga é única e intransferível</b>.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé Interno do Voucher (visível na impressão) */}
              <div className="hidden print:block text-center pt-4 border-t border-neutral-200 text-[10px] text-neutral-500 space-y-1">
                <p className="font-bold text-neutral-700">Colégio Marista Nossa Senhora da Glória • Evento Roda de Conversas 2026</p>
                <p>Comprovante emitido eletronicamente em {new Date().toLocaleDateString('pt-BR')} • Inscrição Definitiva</p>
                <p className="font-mono text-neutral-400">Autenticação: GLORIA-RDP26-{student.id}</p>
              </div>

              {/* Botões de Ação com Estética da Tela Inicial */}
              <div className="space-y-3 pt-2 print:hidden">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-4 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-marista-dark hover:bg-marista-cyan text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir / Salvar Comprovante
                  </button>

                  <button
                    onClick={() => setStep("select_day")}
                    className="flex-1 py-4 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 shadow-sm transition-all"
                  >
                    <Calendar className="w-4 h-4 text-marista-cyan" />
                    Voltar aos Dias (16 e 19/09)
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Encerrar Sessão e Sair
                </button>
              </div>
            </div>

            {/* Rodapé da Página idêntico à tela inicial */}
            <div className="mt-8 text-center space-y-2 print:hidden">
              <p className="text-neutral-400 text-xs">
                Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
              </p>
              <div>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-marista-primary font-medium transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Painel Administrativo / Coordenação
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 3: VISÃO GERAL DAS PALESTRAS EM BOX ===== */}
      {step === "lectures" && student && (
        <div className="min-h-screen bg-neutral-50/60 pb-64 sm:pb-44">
          {/* Header Superior Coeso com Identidade Visual Marista */}
          <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                {/* Lado Esquerdo: Botão Voltar + Logo Marista Oficial */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={handleBackFromLectures}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                    title="Voltar para Escolha de Dias"
                  >
                    <ArrowLeft className="w-4 h-4 text-marista-dark" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                  <div className="w-[130px] xs:w-[150px] sm:w-[190px] relative">
                    <Image
                      src="/logo_1.png"
                      alt="Roda de Profissões Marista Glória"
                      width={190}
                      height={65}
                      className="w-full h-auto object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Centro/Direita: Identificação do Estudante */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-marista-cyan">
                        Estudante
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        #{student.id}
                      </span>
                    </div>
                    <p className="text-neutral-900 font-extrabold text-xs sm:text-sm leading-tight truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[220px]">
                      {student.name}
                    </p>
                    <p className="text-neutral-400 text-[10px] hidden xs:block">
                      {student.grade || "Ensino Médio"}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-marista-50 border border-marista-100 flex items-center justify-center text-marista-dark flex-shrink-0 shadow-xs">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-marista-cyan" />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Faixa de Gestão Mestre / Exportação Excel */}
          {student.id === "19042011" && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-neutral-900 px-4 py-2.5 shadow-md border-b border-amber-600/30">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2 font-black">
                  <span className="bg-neutral-900 text-amber-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    👑 Senha Mestre
                  </span>
                  <span>Acesso Coordenação / Administrador Ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadExcel}
                    disabled={exportingExcel}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all text-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    {exportingExcel ? "Baixando..." : "Exportar Lista de Presença Excel (.xlsx)"}
                  </button>
                  <Link
                    href="/admin/registrations"
                    className="bg-white hover:bg-neutral-100 text-neutral-900 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all text-xs border border-amber-600/30"
                  >
                    <Settings className="w-3.5 h-3.5 text-neutral-700" />
                    Painel Admin
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Banner de Instruções e Orientação OU Confirmação Bloqueada */}
          <div className="max-w-7xl mx-auto px-4 mt-6">
            {isLocked ? (
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-emerald-400/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md text-emerald-300 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge bg-emerald-400 text-emerald-950 font-black text-xs px-2.5 py-0.5 shadow-sm">
                        Inscrição Oficial Confirmada
                      </span>
                      <span className="text-xs text-emerald-200 font-medium">
                        {selectedEventDate === "2026-09-16" ? "Roda de Conversas – 16/09/2026" : "Oficinas & Palestra Geral – 19/09/2026"}
                      </span>
                    </div>
                    <h2 className="font-heading font-extrabold text-base sm:text-lg text-white">
                      {selectedEventDate === "2026-09-16" ? "Suas 2 Palestras estão Garantidas e Bloqueadas!" : "Sua Atividade está Garantida e Bloqueada!"}
                    </h2>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-1 leading-relaxed max-w-3xl">
                      {selectedEventDate === "2026-09-16"
                        ? "Você já concluiu sua inscrição para os dois horários do evento. Conforme o regulamento do colégio, não é permitido alterar as salas ou os horários após a confirmação."
                        : "Você já concluiu sua inscrição para o sábado de oficinas e palestra geral. Conforme o regulamento do colégio, não é permitido alterar a atividade após a confirmação."}
                    </p>
                  </div>
                </div>

                <div className="self-stretch md:self-auto flex items-center justify-end gap-2.5 flex-wrap">
                  <button
                    onClick={() => setStep("confirmed")}
                    className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Ver Comprovante
                  </button>
                  <button
                    onClick={handleBack}
                    className="btn-secondary bg-white text-emerald-950 hover:bg-emerald-50 border-0 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-emerald-800" />
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-marista-dark via-marista-primary to-marista-light text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-cyan-400/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md text-cyan-300 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-heading font-extrabold text-base sm:text-lg">
                      {selectedEventDate === "2026-09-16"
                        ? "Escolha suas 2 Palestras"
                        : "Escolha sua Oficina ou Palestra Geral"}
                    </h2>
                    <p className="text-white/90 text-xs sm:text-sm mt-1 leading-relaxed max-w-3xl">
                      {selectedEventDate === "2026-09-16" ? (
                        <>
                          Veja abaixo a <b>visão geral de todas as salas</b> da Roda de Conversas.<br className="hidden sm:inline" />
                          Basta <b>clicar na caixa da palestra desejada</b> para marcar sua <b>1ª Opção (11:00 às 12:00)</b> e a sua <b>2ª Opção (12:00 às 13:00)</b>.
                        </>
                      ) : (
                        <>
                          Veja abaixo as <b>atividades disponíveis no sábado (19/09)</b>.<br className="hidden sm:inline" />
                          Basta <b>clicar no card da atividade desejada</b> para garantir a sua vaga. As atividades ocorrem pela manhã.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Indicador de Seleção */}
                <div className="bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 flex items-center gap-3 self-stretch md:self-auto justify-center flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-cyan-200 font-bold">
                      Suas Escolhas
                    </div>
                    <div className="text-lg font-black text-white">
                      {selectedRooms.length} de {selectedEventDate === "2026-09-16" ? 2 : 1} selecionada{selectedEventDate === "2026-09-16" ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-all ${selectedRooms.length >= 1 ? "bg-emerald-400 shadow-sm scale-110" : "bg-white/30"
                        }`}
                    />
                    {selectedEventDate === "2026-09-16" && (
                      <div
                        className={`w-3.5 h-3.5 rounded-full transition-all ${selectedRooms.length >= 2 ? "bg-indigo-400 shadow-sm scale-110" : "bg-white/30"
                          }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aviso se Inscrições Fechadas */}
          {!registrationOpen && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-amber-800 font-semibold text-sm">
                  As inscrições estão fechadas no momento pelo administrador. Apenas visualização disponível.
                </p>
              </div>
            </div>
          )}

          {/* Barra de Busca Dinâmica */}
          <div className="max-w-7xl mx-auto px-4 mt-6">
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-neutral-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full">
                <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por curso (Medicina, Cinema, Direito, TI...), faculdade (FGV, Inteli, IBMEC...), sala ou professor..."
                  className="w-full pl-12 pr-10 py-3 rounded-xl border border-neutral-200 bg-neutral-50/70 text-sm focus:outline-none focus:border-marista-cyan focus:bg-white focus:ring-3 focus:ring-marista-cyan/15 transition-all placeholder:text-neutral-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="text-xs text-neutral-500 whitespace-nowrap self-start sm:self-center font-bold bg-neutral-100 px-3 py-1.5 rounded-lg">
                  Mostrando {filteredRooms.length} de {roomOptions.length} opções
                </div>
              )}
            </div>
          </div>

          {/* ===== GRID DAS 8 OPÇÕES EM BOX ===== */}
          <div className="max-w-7xl mx-auto px-4 mt-6">
            {filteredRooms.length === 0 ? (
              <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center shadow-sm">
                <CalendarDays className="w-16 h-16 text-neutral-300 mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg text-neutral-700 mb-1">
                  Nenhuma palestra encontrada
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Não há salas que coincidam com o termo &quot;{searchQuery}&quot;.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedEventDate === "2026-09-19" ? "xl:grid-cols-3" : "xl:grid-cols-4"} gap-5`}>
                {filteredRooms.map((room) => {
                  const isDay19 = selectedEventDate === "2026-09-19";
                  const isSelected1 = selectedRooms[0] === room.roomNumber;
                  const isSelected2 = !isDay19 && selectedRooms[1] === room.roomNumber;
                  const isSelected = isSelected1 || isSelected2;

                  const isFull11 = Boolean(
                    room.lecture11h &&
                    (room.lecture11h.currentEnrollments ?? 0) >= (room.lecture11h.maxCapacity ?? 35)
                  );
                  const isFull12 = Boolean(
                    room.lecture12h &&
                    (room.lecture12h.currentEnrollments ?? 0) >= (room.lecture12h.maxCapacity ?? 35)
                  );
                  const isCompletelyFull = isFull11 && isFull12;

                  const isUnlimitedDay19 = Boolean(
                    isDay19 &&
                    room.lectureSingle &&
                    isLectureUnlimited(room.lectureSingle)
                  );

                  const isFullDay19 = Boolean(
                    !isUnlimitedDay19 &&
                    room.lectureSingle &&
                    (room.lectureSingle.currentEnrollments ?? 0) >= (room.lectureSingle.maxCapacity ?? 20)
                  );

                  // Se o aluno ainda não selecionou nada, o próximo slot é 11h
                  // Se o aluno já selecionou 1 sala, o próximo slot é 12h
                  const isUnavailableForNextSlot =
                    !isDay19 &&
                    !isSelected &&
                    (isCompletelyFull ||
                      (selectedRooms.length === 0 && isFull11) ||
                      (selectedRooms.length === 1 && isFull12));

                  const isGray = isDay19 ? (!isSelected && isFullDay19) : (isCompletelyFull || isUnavailableForNextSlot);

                  return (
                    <div
                      key={room.roomNumber}
                      onClick={() => handleToggleRoom(room.roomNumber)}
                      className={`group relative rounded-3xl p-5 transition-all duration-200 flex flex-col justify-between border-2 select-none ${isSelected1
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xl ring-4 ring-emerald-500/20 scale-[1.01]"
                        : isSelected2
                          ? "border-indigo-600 bg-indigo-50/50 shadow-xl ring-4 ring-indigo-500/20 scale-[1.01]"
                          : isGray
                            ? "border-neutral-300 bg-neutral-100 text-neutral-400 opacity-60 cursor-not-allowed shadow-none"
                            : isLocked
                              ? "border-neutral-200 bg-neutral-100/70 opacity-50 cursor-not-allowed"
                              : "border-neutral-200 bg-white hover:border-marista-cyan hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                        }`}
                    >
                      <div>
                        {/* Linha do Cabeçalho do Box */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`badge font-black text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm ${isGray ? "bg-neutral-400 text-white" : "bg-neutral-900 text-white"
                              }`}>
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              {isDay19 ? (room.location || `Sala ${room.roomNumber}`) : `Sala ${room.roomNumber}`}
                            </span>
                            {isDay19 && room.lectureSingle?.timeSlot && (
                              <span className="badge bg-cyan-950 text-cyan-300 font-bold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                {room.lectureSingle.timeSlot.replace(":", "h").replace(":", "h").replace("-", "às")}
                              </span>
                            )}
                            {isDay19 && isUnlimitedDay19 && (
                              <span className="badge bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                <Users className="w-3 h-3 text-purple-700" />
                                Vagas Abertas • Inscrição de Participação
                              </span>
                            )}
                            <span className={`badge ${getCategoryBadgeClasses(room.category)} font-bold text-[11px] ${isGray ? "opacity-60 grayscale" : ""}`}>
                              {room.category}
                            </span>
                          </div>

                          {/* Indicador de Seleção no Box */}
                          {isDay19 ? (
                            isSelected1 ? (
                              <span className="badge bg-emerald-700 text-white font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-sm animate-scale-in">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isLocked ? "Confirmada" : "Atividade Selecionada"}
                              </span>
                            ) : isLocked ? (
                              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-200/80 px-2 py-0.5 rounded">
                                Não Escolhida
                              </span>
                            ) : isFullDay19 ? (
                              <span className="badge bg-neutral-400 text-white font-black text-[10px] px-2.5 py-1 flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" />
                                Vagas Esgotadas
                              </span>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-neutral-300 group-hover:border-marista-cyan group-hover:bg-cyan-50 flex items-center justify-center text-transparent group-hover:text-marista-cyan transition-all">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )
                          ) : (
                            isSelected1 ? (
                              <span className="badge bg-emerald-700 text-white font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-sm animate-scale-in">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isLocked ? "11h (Confirmada)" : "1ª Escolha (11h)"}
                              </span>
                            ) : isSelected2 ? (
                              <span className="badge bg-indigo-700 text-white font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-sm animate-scale-in">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isLocked ? "12h (Confirmada)" : "2ª Escolha (12h)"}
                              </span>
                            ) : isLocked ? (
                              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-200/80 px-2 py-0.5 rounded">
                                Não Escolhida
                              </span>
                            ) : isCompletelyFull ? (
                              <span className="badge bg-neutral-400 text-white font-black text-[10px] px-2.5 py-1 flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" />
                                Vagas Esgotadas
                              </span>
                            ) : isUnavailableForNextSlot ? (
                              <span className="badge bg-neutral-400 text-white font-black text-[10px] px-2.5 py-1 flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" />
                                {selectedRooms.length === 0 ? "11h Esgotada" : "12h Esgotada"}
                              </span>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-neutral-300 group-hover:border-marista-cyan group-hover:bg-cyan-50 flex items-center justify-center text-transparent group-hover:text-marista-cyan transition-all">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )
                          )}
                        </div>

                        {/* Título da Área */}
                        <h3 className={`font-heading font-extrabold text-lg mb-2.5 leading-snug transition-colors ${isGray ? "text-neutral-500" : "text-neutral-900 group-hover:text-marista-primary"
                          }`}>
                          {room.title}
                        </h3>

                        {/* Bloco de Cursos Abordados */}
                        {room.courses && (
                          <div className={`rounded-2xl p-3 mb-3 border ${isGray ? "bg-neutral-100 border-neutral-200 text-neutral-500" : "bg-sky-50/90 border-sky-200/80"
                            }`}>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-950 mb-1">
                              <GraduationCap className={`w-3.5 h-3.5 flex-shrink-0 ${isGray ? "text-neutral-400" : "text-sky-600"}`} />
                              <span className={isGray ? "text-neutral-600" : "text-sky-950"}>Cursos Abordados:</span>
                            </div>
                            <p className={`text-xs font-bold leading-relaxed ${isGray ? "text-neutral-500" : "text-neutral-800"}`}>
                              {room.courses}
                            </p>
                          </div>
                        )}

                        {/* Bloco de Convidados e Faculdades */}
                        {room.guests && (
                          <div className={`rounded-2xl p-3 mb-3 text-xs border ${isGray ? "bg-neutral-100 border-neutral-200 text-neutral-500" : "bg-neutral-50/90 border-neutral-200/80"
                            }`}>
                            <div className="flex items-center gap-1.5 font-bold mb-2 text-[11px]">
                              <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isGray ? "text-neutral-400" : "text-marista-primary"}`} />
                              <span className={isGray ? "text-neutral-600" : "text-neutral-800"}>Convidados Confirmados:</span>
                            </div>
                            <div className="space-y-1.5">
                              {room.guests.split(" | ").map((guestPart, idx) => (
                                <div key={idx} className={`text-xs leading-relaxed flex items-start gap-1.5 ${isGray ? "text-neutral-500" : "text-neutral-700"}`}>
                                  <span className={`font-black mt-0.5 ${isGray ? "text-neutral-400" : "text-marista-cyan"}`}>•</span>
                                  <span className="flex-1 font-medium">{guestPart.trim()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rodapé do Box: Professor Mediador e Ação de Clique */}
                      <div className="pt-2 border-t border-neutral-100 mt-2 space-y-2">
                        {(room.mediator || room.speaker) && (
                          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border ${isGray ? "bg-neutral-100 border-neutral-200 text-neutral-500" : "bg-amber-50/90 border-amber-200/80 text-neutral-800"
                            }`}>
                            <UserCheck className={`w-3.5 h-3.5 flex-shrink-0 ${isGray ? "text-neutral-400" : "text-amber-600"}`} />
                            <div className="text-[11px] truncate">
                              <span className={`font-bold ${isGray ? "text-neutral-600" : "text-amber-950"}`}>Mediador: </span>
                              <span className={`font-semibold ${isGray ? "text-neutral-500" : "text-neutral-800"}`}>
                                {room.mediator || room.speaker}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Botão / Label de Seleção */}
                        <div className="pt-1">
                          {isDay19 ? (
                            isSelected1 ? (
                              <div className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                Atividade Selecionada
                              </div>
                            ) : isFullDay19 ? (
                              <div className="w-full py-2 rounded-xl bg-neutral-200 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Vagas Esgotadas</span>
                              </div>
                            ) : isUnlimitedDay19 ? (
                              <div className="w-full py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-purple-700 group-hover:text-white transition-all">
                                <span>Garantir Participação na Palestra Geral</span>
                              </div>
                            ) : (
                              <div className="w-full py-2 rounded-xl bg-neutral-100 text-neutral-600 font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-marista-primary group-hover:text-white transition-all">
                                <span>Clique para Selecionar</span>
                              </div>
                            )
                          ) : (
                            isSelected1 ? (
                              <div className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                1ª Rodada Selecionada
                              </div>
                            ) : isSelected2 ? (
                              <div className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                2ª Rodada Selecionada
                              </div>
                            ) : isCompletelyFull ? (
                              <div className="w-full py-2 rounded-xl bg-neutral-200 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Vagas Esgotadas</span>
                              </div>
                            ) : isUnavailableForNextSlot ? (
                              <div className="w-full py-2 rounded-xl bg-neutral-200 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>
                                  {selectedRooms.length === 0
                                    ? "Esgotada às 11:00 (Disp. 12:00)"
                                    : "Esgotada às 12:00"}
                                </span>
                              </div>
                            ) : (
                              <div className="w-full py-2 rounded-xl bg-neutral-100 text-neutral-600 font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-marista-primary group-hover:text-white transition-all">
                                <span>Clique para Selecionar</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rodapé da Página idêntico a todas as telas */}
          <div className="max-w-7xl mx-auto px-4 mt-12 mb-6 text-center space-y-2">
            <p className="text-neutral-400 text-xs">
              Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
            </p>
            <div>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-marista-primary font-medium transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Painel Administrativo / Coordenação
              </Link>
            </div>
          </div>

          {/* ===== BARRA FLUTUANTE DE RESUMO E CONFIRMAÇÃO ===== */}
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-2xl p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
              {/* Resumo das escolhas */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm flex-shrink-0 ${(selectedEventDate === "2026-09-16" ? selectedRooms.length === 2 : selectedRooms.length === 1)
                        ? "bg-emerald-500 text-white shadow-md"
                        : selectedRooms.length === 1 && selectedEventDate === "2026-09-16"
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-neutral-200 text-neutral-600"
                        }`}
                    >
                      {selectedRooms.length}/{selectedEventDate === "2026-09-16" ? 2 : 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-800 leading-tight">
                        {isLocked
                          ? "Inscrição Concluída e Bloqueada!"
                          : selectedEventDate === "2026-09-19"
                            ? (selectedRooms.length === 1 ? "Atividade Selecionada!" : "Selecione 1 Atividade")
                            : selectedRooms.length === 2
                              ? "2 Palestras Selecionadas!"
                              : selectedRooms.length === 1
                                ? "Selecione mais 1 palestra"
                                : "Nenhuma palestra selecionada"}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-neutral-500 leading-tight">
                        {isLocked
                          ? "Horários e salas confirmados oficialmente"
                          : selectedEventDate === "2026-09-19"
                            ? (selectedRooms.length === 1 ? "Pronto para confirmar sua inscrição" : "Clique em uma atividade acima para escolher")
                            : selectedRooms.length === 2
                              ? "Pronto para confirmar sua inscrição"
                              : "Clique nas caixas acima para escolher"}
                      </div>
                    </div>
                  </div>

                  {/* No mobile, botão de inverter horários se couber */}
                  {selectedEventDate === "2026-09-16" && selectedRooms.length === 2 && !isLocked && (
                    <button
                      onClick={handleSwapSlots}
                      type="button"
                      className="md:hidden px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs flex-shrink-0"
                      title="Inverter 11h e 12h"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-marista-cyan" />
                      <span>Inverter</span>
                    </button>
                  )}
                </div>

                {/* Badges das salas selecionadas */}
                {selectedRooms.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                    {selectedEventDate === "2026-09-19" ? (
                      selectedRoom1Data && (
                        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 font-bold shadow-xs">
                          <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[260px] sm:max-w-none">
                            {selectedRoom1Data.title} ({selectedRoom1Data.location || `Sala ${selectedRoom1Data.roomNumber}`})
                          </span>
                        </div>
                      )
                    ) : (
                      <>
                        {selectedRoom1Data && (
                          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center gap-1 font-bold shadow-xs">
                            <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>11h: Sala {selectedRoom1Data.roomNumber}</span>
                          </div>
                        )}
                        {selectedRoom2Data && (
                          <div className="bg-indigo-50 border border-indigo-300 text-indigo-900 px-2 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center gap-1 font-bold shadow-xs">
                            <Clock className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                            <span>12h: Sala {selectedRoom2Data.roomNumber}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
                {/* Botão de Inverter Horários (Desktop) */}
                {selectedEventDate === "2026-09-16" && selectedRooms.length === 2 && !isLocked && (
                  <button
                    onClick={handleSwapSlots}
                    type="button"
                    className="hidden md:flex px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 font-bold text-xs items-center gap-1.5 transition-all shadow-sm"
                    title="Inverter qual sala assistir às 11h e qual às 12h"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-marista-cyan" />
                    <span>Inverter Horários</span>
                  </button>
                )}

                {/* Status quando já confirmado (Bloqueado) */}
                {isLocked ? (
                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <button
                      onClick={() => setStep("confirmed")}
                      className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-marista-dark hover:bg-marista-cyan text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ver Comprovante</span>
                    </button>
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Bloqueada</span>
                    </div>
                    <button
                      onClick={handleBack}
                      className="px-3 py-2.5 rounded-xl border border-neutral-300 text-neutral-600 hover:bg-neutral-100 font-semibold text-xs flex items-center justify-center gap-1 transition-all shadow-sm"
                      title="Encerrar sessão"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Sair</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-confirmar-duas-palestras"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={
                      (selectedEventDate === "2026-09-16" ? selectedRooms.length !== 2 : selectedRooms.length !== 1) ||
                      submitting ||
                      !registrationOpen
                    }
                    className="w-full md:w-auto px-5 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200
                               bg-marista-primary text-white hover:bg-marista-light hover:shadow-lg
                               disabled:opacity-40 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirmando...
                      </>
                    ) : selectedEventDate === "2026-09-19" ? (
                      selectedRooms.length === 1 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar Inscrição na Atividade
                        </>
                      ) : (
                        <>
                          <span>Selecione 1 Atividade</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )
                    ) : selectedRooms.length === 2 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Minhas 2 Palestras
                      </>
                    ) : (
                      <>
                        <span>Selecione 2 Palestras ({selectedRooms.length}/2)</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CONFIRMAÇÃO DAS ESCOLHAS ===== */}
      {showConfirmModal && selectedRoom1Data && (selectedEventDate === "2026-09-19" || selectedRoom2Data) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-scale-in max-h-[90vh] overflow-y-auto border border-neutral-100">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-xl text-neutral-900">
                  {selectedEventDate === "2026-09-19" ? "Confirmar sua Inscrição" : "Confirmar suas 2 Palestras"}
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {selectedEventDate === "2026-09-19"
                    ? "Oficinas & Palestra Geral – 19/09/2026 • Colégio Marista Glória"
                    : "Roda de Conversas – 16/09/2026 • Colégio Marista Glória"}
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-3">
              {selectedEventDate === "2026-09-19"
                ? "Você selecionou a seguinte atividade para a manhã de sábado:"
                : "Você selecionou as seguintes salas para os dois horários do evento:"}
            </p>

            {/* Alerta de Inscrição Definitiva e Bloqueio */}
            <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3.5 mb-5 flex items-start gap-3 text-amber-900 shadow-sm">
              <div className="p-1.5 bg-amber-200/80 text-amber-900 rounded-xl flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-amber-900" />
              </div>
              <div className="text-xs">
                <p className="font-black text-amber-950 text-xs">
                  Atenção: Inscrição Definitiva!
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  {selectedEventDate === "2026-09-19"
                    ? "Após confirmar, sua vaga estará garantida e não será possível trocar de atividade. Verifique sua escolha antes de concluir."
                    : "Após confirmar, seus horários e salas estarão garantidos e não será possível alterar horários ou trocar de palestras. Verifique suas escolhas antes de concluir."}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {selectedEventDate === "2026-09-19" ? (
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="badge bg-emerald-700 text-white font-extrabold text-xs px-2.5 py-1">
                      {selectedRoom1Data.lectureSingle?.timeSlot
                        ? selectedRoom1Data.lectureSingle.timeSlot.replace(":", "h").replace(":", "h").replace("-", "às")
                        : "10h às 11h30"}
                    </span>
                    <span className="font-black text-xs text-emerald-900 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {selectedRoom1Data.location || `Sala ${selectedRoom1Data.roomNumber}`}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-neutral-900 text-base">
                    {selectedRoom1Data.title}
                  </h4>
                  {selectedRoom1Data.courses && (
                    <p className="text-xs font-semibold text-emerald-900">
                      🎓 Cursos: {selectedRoom1Data.courses}
                    </p>
                  )}
                  {selectedRoom1Data.guests && (
                    <div className="text-xs text-neutral-700 bg-white/70 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                      <span className="font-bold text-emerald-950 block">Convidados:</span>
                      {selectedRoom1Data.guests.split(" | ").map((g, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(selectedRoom1Data.mediator || selectedRoom1Data.speaker) && (
                    <p className="text-xs text-neutral-600">
                      Mediador(a): <b>{selectedRoom1Data.mediator || selectedRoom1Data.speaker}</b>
                    </p>
                  )}
                  {selectedRoom1Data.lectureSingle && isLectureUnlimited(selectedRoom1Data.lectureSingle) && (
                    <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
                      <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <b className="font-bold text-purple-950 block">Atividade com Participação Livre:</b>
                        Esta palestra geral no auditório não possui limite de vagas. Sua inscrição serve para confirmar a sua presença e apoiar a organização do evento.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                selectedRoom2Data && (
                  <>
                    {/* Card 1ª Escolha (11h) */}
                    <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge bg-emerald-700 text-white font-extrabold text-xs px-2.5 py-1">
                          1ª Rodada: 11:00 às 12:00
                        </span>
                        <span className="font-black text-xs text-emerald-900 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                          Sala {selectedRoom1Data.roomNumber}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-neutral-900 text-base">
                        {selectedRoom1Data.title}
                      </h4>
                      {selectedRoom1Data.courses && (
                        <p className="text-xs font-semibold text-emerald-900">
                          🎓 Cursos: {selectedRoom1Data.courses}
                        </p>
                      )}
                      <p className="text-xs text-neutral-600">
                        Mediador(a): <b>{selectedRoom1Data.mediator || selectedRoom1Data.speaker}</b>
                      </p>
                    </div>

                    {/* Card 2ª Escolha (12h) */}
                    <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge bg-indigo-700 text-white font-extrabold text-xs px-2.5 py-1">
                          2ª Rodada: 12:00 às 13:00
                        </span>
                        <span className="font-black text-xs text-indigo-900 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200">
                          Sala {selectedRoom2Data.roomNumber}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-neutral-900 text-base">
                        {selectedRoom2Data.title}
                      </h4>
                      {selectedRoom2Data.courses && (
                        <p className="text-xs font-semibold text-indigo-900">
                          🎓 Cursos: {selectedRoom2Data.courses}
                        </p>
                      )}
                      <p className="text-xs text-neutral-600">
                        Mediador(a): <b>{selectedRoom2Data.mediator || selectedRoom2Data.speaker}</b>
                      </p>
                    </div>
                  </>
                )
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1 py-3 text-sm font-semibold rounded-xl"
              >
                Voltar e Ajustar
              </button>
              <button
                onClick={handleConfirmRegistrations}
                disabled={submitting}
                className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedEventDate === "2026-09-19" ? "Confirmar Inscrição" : "Confirmar Inscrições"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE FILA VIRTUAL FIFO (IGUAL A INGRESSO) ===== */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-in border border-neutral-100 overflow-hidden">
            {/* Faixa decorativa superior estilo ingresso */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-marista-dark via-marista-cyan to-marista-primary" />

            {/* Cabeçalho da Fila */}
            <div className="text-center mb-5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-marista-dark font-extrabold text-[11px] uppercase tracking-wider mb-2 shadow-sm">
                <Ticket className="w-3.5 h-3.5 text-marista-cyan" />
                <span>Fila Virtual FIFO • Ordem de Chegada</span>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-neutral-900">
                {queueState.status === "completed"
                  ? "Vagas Garantidas com Sucesso!"
                  : queueState.status === "failed"
                    ? "Aviso de Lotação"
                    : "Aguarde na Fila de Inscrição"}
              </h3>
              <p className="text-neutral-500 text-xs mt-0.5">
                Roda de Conversas – 16/09/2026 • Colégio Marista Glória
              </p>
            </div>

            {/* Card Estilo Ingresso com picote visual */}
            <div className="bg-gradient-to-b from-neutral-50 via-white to-neutral-50 rounded-2xl border-2 border-neutral-200 p-5 mb-4 relative shadow-inner">
              {/* Picotes laterais de ingresso */}
              <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-r-2 border-neutral-200" />
              <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-l-2 border-neutral-200" />

              {/* Informações da Senha / Ingresso */}
              <div className="flex items-center justify-between border-b border-dashed border-neutral-300 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Sua Senha / Ingresso
                  </span>
                  <span className="font-mono font-black text-2xl text-marista-dark">
                    {queueState.ticketNumber ? `#${queueState.ticketNumber}` : "#..."}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Atendimento
                  </span>
                  <span className="badge bg-neutral-900 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5">
                    FIFO Estrito
                  </span>
                </div>
              </div>

              {/* Status Dinâmico da Posição */}
              <div className="text-center py-2">
                {queueState.status === "completed" ? (
                  <div className="animate-scale-in">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-600 mb-2 shadow-md">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="badge bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 mb-1 inline-block">
                      Atendimento Concluído
                    </span>
                    <h4 className="font-heading font-extrabold text-base text-neutral-900 mt-1">
                      Suas 2 Palestras foram Garantidas!
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Abrindo seu comprovante oficial...
                    </p>
                  </div>
                ) : queueState.status === "failed" ? (
                  <div className="animate-scale-in">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-danger-50 border-2 border-danger-300 flex items-center justify-center text-danger-600 mb-2 shadow-sm">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <span className="badge bg-danger-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 mb-1 inline-block">
                      Não Foi Possível Concluir
                    </span>
                    <p className="text-xs text-neutral-800 font-bold mt-2 leading-relaxed px-2">
                      {queueState.error || "As vagas para uma das salas esgotaram enquanto você aguardava na fila."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Sua Posição na Fila
                    </div>
                    <div className="text-5xl font-heading font-black text-marista-primary tracking-tight my-1">
                      #{queueState.position || 1}
                    </div>
                    <p className="text-xs text-neutral-600 font-semibold mt-1.5">
                      {queueState.inFront === 0
                        ? "Você é o próximo! Processando reserva das suas vagas..."
                        : `${queueState.inFront} ${queueState.inFront === 1 ? "pessoa" : "pessoas"} à sua frente na fila`}
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de Progresso em Tempo Real */}
              {queueState.status !== "failed" && (
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-semibold mb-1.5">
                    <span>Progresso do Atendimento</span>
                    <span className="font-bold text-neutral-700">
                      {queueState.status === "completed"
                        ? "100%"
                        : queueState.inFront === 0
                          ? "85%"
                          : `${Math.max(20, 100 - queueState.inFront * 25)}%`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${queueState.status === "completed"
                        ? "bg-emerald-500 w-full"
                        : "bg-gradient-to-r from-marista-dark via-marista-cyan to-marista-light animate-pulse"
                        }`}
                      style={{
                        width:
                          queueState.status === "completed"
                            ? "100%"
                            : `${Math.max(20, 100 - queueState.inFront * 25)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Explicação da Fila Estilo Ingresso */}
            {queueState.status !== "failed" && (
              <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3 mb-4 text-xs text-sky-950 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1">
                  <p className="font-bold text-sky-900">Como funciona a Fila Virtual (FIFO)?</p>
                  <p className="text-sky-800 leading-relaxed">
                    Assim como na compra de ingressos de grandes eventos, cada solicitação é atendida rigorosamente por <b>ordem estrita de chegada</b> (FIFO). Por favor, <b>não feche nem recarregue</b> esta página.
                  </p>
                </div>
              </div>
            )}

            {/* Ação em caso de Falha / Lotação na Fila */}
            {queueState.status === "failed" && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowQueueModal(false);
                    setQueueState({
                      active: false,
                      ticketId: "",
                      ticketNumber: 0,
                      position: 1,
                      inFront: 0,
                      status: "waiting",
                    });
                  }}
                  className="btn-primary w-full py-3.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar e Escolher Outra Sala
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL DE EXPORTAÇÃO EXCEL DA SENHA MESTRE ===== */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMasterModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-scale-in border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="badge bg-amber-500 text-neutral-900 font-black text-[10px] uppercase tracking-wider px-2 py-0.5">
                    👑 Senha Mestre Reconhecida
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-neutral-900">
                    Lista de Presença Exportada!
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowMasterModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
              A planilha oficial do evento <b>Roda de Conversas (16/09/2026)</b> foi gerada e o download iniciado automaticamente no seu navegador.
            </p>

            {/* Detalhes da Planilha */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 mb-6 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-neutral-700">
                <span>📑 Formato do Arquivo:</span>
                <span className="font-bold text-neutral-900">Planilha Excel (.xlsx)</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-neutral-700">
                <span>📊 Estrutura de Abas:</span>
                <span className="font-bold text-emerald-700">17 Abas Separadas</span>
              </div>
              <div className="text-neutral-500 text-[11px] pl-2 border-l-2 border-emerald-400 space-y-1 py-1">
                <div>• <b>1 Aba Resumo Geral:</b> Itinerário completo de todos os alunos</div>
                <div>• <b>8 Abas Horário 11:00 - 12:00:</b> Uma aba para cada Sala (305 a 313)</div>
                <div>• <b>8 Abas Horário 12:00 - 13:00:</b> Uma aba para cada Sala (305 a 313)</div>
                <div>• <b>Colunas Oficiais:</b> Nº, Matrícula, Nome em Ordem Alfabética, Turma, Assinatura e Presença (P/F)</div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2.5">
              <button
                onClick={handleDownloadExcel}
                disabled={exportingExcel}
                className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Baixando Planilha...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Baixar Planilha Novamente (.xlsx)
                  </>
                )}
              </button>

              <Link
                href="/admin/registrations"
                className="w-full btn-secondary py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl text-marista-dark hover:bg-marista-50 border border-neutral-300 transition-all"
              >
                <Settings className="w-4 h-4" />
                Acessar Painel Administrativo de Inscrições
              </Link>

              <button
                onClick={() => setShowMasterModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors text-center"
              >
                Fechar e Visualizar Grade de Palestras
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
