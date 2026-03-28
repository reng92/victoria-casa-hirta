"use client";
import { useState } from "react";
import { uploadImage } from "@/lib/storage";

interface Props {
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ folder, onUploaded, label = "Carica immagine" }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setPreview(URL.createObjectURL(file));
    const url = await uploadImage(file, folder);
    if (url) onUploaded(url);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="flex items-center gap-3">
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="w-14 h-14 rounded-full object-cover border border-gray-200"
          />
        )}
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full transition">
          {loading ? "Caricamento..." : "Scegli file"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
            disabled={loading}
          />
        </label>
      </div>
    </div>
  );
}
