import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roda de Profissões | Colégio Marista Nossa Senhora da Glória",
  description:
    "Inscreva-se nas palestras da Roda de Profissões do Colégio Marista Nossa Senhora da Glória. Conheça diferentes carreiras e encontre o seu caminho!",
  keywords: [
    "Roda de Profissões",
    "Marista",
    "Nossa Senhora da Glória",
    "inscrição",
    "palestras",
    "carreiras",
    "profissões",
  ],
  authors: [{ name: "Colégio Marista Nossa Senhora da Glória" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className={inter.className}>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              padding: "16px",
              fontSize: "14px",
              fontWeight: 500,
            },
            success: {
              style: {
                background: "#ECFDF5",
                color: "#047857",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              },
              iconTheme: {
                primary: "#10B981",
                secondary: "#ECFDF5",
              },
            },
            error: {
              style: {
                background: "#FEF2F2",
                color: "#B91C1C",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              },
              iconTheme: {
                primary: "#EF4444",
                secondary: "#FEF2F2",
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
