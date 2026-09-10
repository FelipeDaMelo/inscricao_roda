"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  GraduationCap,
  FileSpreadsheet,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/lectures", label: "Palestras", icon: CalendarDays },
  { href: "/admin/students", label: "Estudantes", icon: Users },
  { href: "/admin/registrations", label: "Inscrições", icon: ClipboardList },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Sessão encerrada com sucesso");
      router.push("/admin/login");
    } catch {
      toast.error("Erro ao encerrar sessão");
    }
  };

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
    <aside className="w-64 bg-marista-dark text-white flex flex-col min-h-screen fixed left-0 top-0 z-30 shadow-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
        <img
          src="/logo_1.png"
          alt="Marista Glória"
          className="h-10 w-auto object-contain brightness-0 invert"
        />
        <span className="text-[10px] font-bold uppercase tracking-wider bg-marista-primary/40 text-cyan-200 px-2 py-1 rounded">
          Admin
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-marista-primary text-white shadow-md font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-cyan-300" : "text-white/60"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Quick Actions & Logout */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={handleDownloadExcel}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 transition-all shadow-sm group"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          Exportar Excel (.xlsx)
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair do Painel
        </button>
      </div>
    </aside>
  );
}
