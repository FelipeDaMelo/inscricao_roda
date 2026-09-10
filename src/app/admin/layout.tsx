"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <main className="min-h-screen bg-neutral-100">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
