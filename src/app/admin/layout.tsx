"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Sidebar from "@/components/admin/Sidebar";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [checkingAuth, setCheckingAuth] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;

    async function checkAdminAuth() {
      try {
        // 1. Verificar se possui cookie de sessão administrativa ativo
        const res = await fetch("/api/admin/session");
        const data = await res.json();

        if (data.authenticated) {
          if (isMounted) setCheckingAuth(false);
          return;
        }

        // 2. Se não tiver cookie, verificar se está autenticado no Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;

          if (user) {
            try {
              const token = await user.getIdToken();
              // Sincroniza sessão
              await fetch("/api/admin/session", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              setCheckingAuth(false);
            } catch {
              router.push("/admin/login");
            }
          } else {
            router.push("/admin/login");
          }
        });

        return () => unsubscribe();
      } catch {
        if (isMounted) router.push("/admin/login");
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-neutral-100">{children}</main>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="w-9 h-9 animate-spin text-marista-primary mb-3" />
        <p className="text-sm font-semibold text-neutral-600">
          Verificando permissões administrativas...
        </p>
      </div>
    );
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
