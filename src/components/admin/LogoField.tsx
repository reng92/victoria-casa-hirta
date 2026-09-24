"use client";
import { useState } from "react";
import { uploadImage } from "@/lib/storage";

interface Props {
  /** URL corrente del logo (stringa vuota se assente). */
  value: string;
  onChange: (url: string) => void;
  /** Cartella nel bucket "media" (es. "opponents", "sponsors"). */
  folder: string;
  label?: string;
  /** Forma dell'anteprima. */
  shape?: "round" | "square";
  size?: number;
}

/**
 * Campo logo per l'admin: anteprima, caricamento file su Supabase Storage
 * oppure incolla di un URL, con pulsante per rimuovere.
 */
export default function LogoField({ value, onChange, folder, label = "Logo", shape = "round", size = 56 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    const url = await uploadImage(file, folder);
    setUploading(false);
    if (url) onChange(url);
    else setError("Caricamento non riuscito. Riprova o incolla un URL.");
  }

  const radius = shape === "round" ? "rounded-full" : "rounded-xl";

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className={`${radius} bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0`}
          style={{ width: size, height: size }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </div>
        <label className="cursor-pointer bg-brand-blue text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 transition">
          {uploading ? "Caricamento..." : "Carica file"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <input
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="oppure incolla un URL https://..."
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-gray-400 hover:text-red-500 transition"
            title="Rimuovi logo"
          >
            Rimuovi
          </button>
        )}
      </div>
      {error && <p className="text-xs text-brand-red mt-1">{error}</p>}
    </div>
  );
}
