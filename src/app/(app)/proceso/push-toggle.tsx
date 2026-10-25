"use client";

import { useEffect, useState } from "react";
import { secondaryButtonClass } from "@/components/ui";
import { removeDevice, saveDevice } from "./push-actions";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "working" | "failed";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/** Turns process notices on or off for this phone or browser. */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus(ios && !installed ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const existing = await registration.pushManager.getSubscription();
      if (existing) await saveDevice(existing.toJSON() as Parameters<typeof saveDevice>[0]);
      setStatus(existing ? "on" : "off");
    })().catch(() => setStatus("failed"));
  }, []);

  async function turnOn() {
    setStatus("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const saved = await saveDevice(subscription.toJSON() as Parameters<typeof saveDevice>[0]);
      setStatus(saved.ok ? "on" : "failed");
    } catch {
      setStatus(Notification.permission === "denied" ? "denied" : "failed");
    }
  }

  async function turnOff() {
    setStatus("working");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await removeDevice(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("off");
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <div className="rounded-2xl bg-celeste/25 p-4 text-sm">
      {status === "on" ? (
        <div className="flex items-center justify-between gap-3">
          <p><span className="font-semibold">Avisos activados en este celular.</span> Te llegan aunque esté bloqueado.</p>
          <button type="button" onClick={turnOff} className="shrink-0 min-h-11 font-semibold text-cafe-oscuro underline">Desactivar</button>
        </div>
      ) : status === "ios-install" ? (
        <p>
          <span className="font-semibold">Para recibir avisos en el iPhone</span>, primero agrega la app a tu pantalla de inicio: toca
          Compartir y luego «Agregar a inicio». Ábrela desde ese ícono y activa los avisos aquí.
        </p>
      ) : status === "denied" ? (
        <p>
          <span className="font-semibold">Los avisos están bloqueados</span> para esta app. Actívalos en los ajustes de notificaciones del
          celular o del navegador y recarga.
        </p>
      ) : (
        <div className="space-y-2">
          <p>
            <span className="font-semibold">Recibe un aviso cuando termine cada paso</span>, aunque el celular esté bloqueado.
          </p>
          <button type="button" onClick={turnOn} disabled={status === "working"} className={`${secondaryButtonClass} w-full bg-white`}>
            {status === "working" ? "Activando…" : "Activar avisos en este celular"}
          </button>
          {status === "failed" ? <p>No se pudieron activar. Intenta de nuevo.</p> : null}
        </div>
      )}
    </div>
  );
}
