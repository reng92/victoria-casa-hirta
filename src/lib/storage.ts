import { supabase } from "@/lib/supabase";

const MAX_SIDE = 1600;

// Ridimensiona e converte in WebP nel browser prima del caricamento:
// le immagini sono servite così come sono (niente ottimizzazione Vercel),
// quindi devono essere già leggere. WebP mantiene la trasparenza dei loghi.
async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82)
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadImage(
  original: File,
  folder: string
): Promise<string | null> {
  const file = await compressImage(original);
  const ext = file.name.split(".").pop();
  // Il suffisso casuale evita che due foto caricate insieme si sovrascrivano
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(filename, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filename);
  return data.publicUrl;
}
