/**
 * Phone photos run 2–5 MB, more than a Server Action accepts. Redraws the photo as a JPEG no wider
 * or taller than `maxSide`, which also is the size Claude reads best. Falls back to the original file
 * when the browser can't decode it (e.g. HEIC outside Safari); the server then reports the size.
 */
export async function shrinkImage(file: File, maxSide = 1568, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Replaces a file field in `formData` with its shrunk copy, when one was chosen. */
export async function shrinkFormImage(formData: FormData, field: string) {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) formData.set(field, await shrinkImage(file));
}
