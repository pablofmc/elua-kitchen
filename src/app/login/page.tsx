import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import logo from "../../../public/brand/logo-vertical-cafe.png";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return <LoginForm linkError={error === "enlace"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-crema px-4 py-10">
      <div className="w-full max-w-sm">
        <Image src={logo} alt="Elúa" priority className="mx-auto mb-8 h-32 w-auto" />
        <p className="mb-6 text-center text-sm text-tinta-suave">Te enviaremos un código a tu correo para entrar.</p>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
