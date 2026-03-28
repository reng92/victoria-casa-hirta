import { supabase } from "@/lib/supabase";

export async function uploadImage(
  file: File,
  folder: string
): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const filename = `${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(filename, file, { upsert: true });

  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filename);
  return data.publicUrl;
}
