/** Planeado in coral (still to do), Horneado in celeste (done). */
export function StatusChip({ status }: { status: "planeado" | "horneado" }) {
  return (
    <span className={`rounded-full px-3 py-1 ${status === "horneado" ? "bg-celeste/40" : "bg-coral/30"}`}>
      {status === "horneado" ? "Horneado" : "Planeado"}
    </span>
  );
}
