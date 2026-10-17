import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Elúa Kitchen", template: "%s · Elúa Kitchen" },
  description: "Recetas, escalado y producción de Elúa",
  applicationName: "Elúa Kitchen",
  appleWebApp: { capable: true, title: "Elúa", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fae5d6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
