import Link from "next/link";
import { Lock } from "lucide-react";

interface DeveloperFooterProps {
  showAdminLink?: boolean;
  className?: string;
}

export default function DeveloperFooter({
  showAdminLink = true,
  className = "",
}: DeveloperFooterProps) {
  return (
    <footer className={`text-center space-y-2.5 ${className}`}>
      <p className="text-neutral-400 text-xs">
        Colégio Marista Nossa Senhora da Glória — Sistema de Inscrições 2026
      </p>

      {showAdminLink && (
        <div>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-marista-primary font-medium transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Painel Administrativo / Coordenação
          </Link>
        </div>
      )}
    </footer>
  );
}
