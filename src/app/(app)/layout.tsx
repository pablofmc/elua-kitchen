import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Nav, NavFrame } from "@/components/nav";
import { signOut } from "../login/actions";
import logo from "../../../public/brand/logo-horizontal-cafe.png";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh pb-20 md:pb-0 md:pl-56">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borde bg-crema-claro/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur md:fixed md:left-0 md:top-0 md:w-56 md:border-b-0 md:bg-white md:px-6 md:pt-6 md:backdrop-blur-none">
        <Link href="/" aria-label="Elúa Kitchen, inicio">
          <Image src={logo} alt="Elúa" priority className="h-8 w-auto md:h-10" />
        </Link>
        <SignOutButton className="md:hidden" />
      </header>
      <Suspense fallback={<NavFrame pathname={null} footer={<SignOutButton className="hidden md:block" />} />}>
        <Nav footer={<SignOutButton className="hidden md:block" />} />
      </Suspense>
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}

function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        type="submit"
        className="rounded-lg px-3 py-2 text-sm text-tinta-suave outline-cafe-oscuro hover:text-tinta focus-visible:outline-2"
      >
        Salir
      </button>
    </form>
  );
}
