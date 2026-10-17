import Image from "next/image";
import emblem from "../../public/brand/emblema-cafe.png";

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-borde bg-white px-6 py-12 text-center">
      <Image src={emblem} alt="" className="mb-4 size-14 opacity-40" />
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-tinta-suave">{children}</p>
    </div>
  );
}
