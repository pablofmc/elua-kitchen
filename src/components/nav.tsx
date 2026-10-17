"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Inicio", icon: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/recetas", label: "Recetas", icon: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" },
  { href: "/calcular", label: "Calcular", icon: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" },
  { href: "/lotes", label: "Lotes", icon: "M4 7h16M4 12h16M4 17h10" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Bottom tab bar on phones, side menu from md up. */
export function Nav({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:left-0 md:right-auto md:flex md:w-56 md:flex-col md:justify-between md:border-t-0 md:border-r md:px-3 md:pb-6 md:pt-24"
    >
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-xs font-medium outline-cafe-oscuro focus-visible:outline-2 md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm ${
                  active ? "text-cafe-oscuro md:bg-crema" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                <Icon d={tab.icon} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {footer}
    </nav>
  );
}
