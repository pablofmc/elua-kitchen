/** Inline form error, marked with a coral dot (coral is too light for text). */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-tinta">
      <span className="mr-1 inline-block size-2 rounded-full bg-coral" aria-hidden />
      {message}
    </p>
  );
}
