"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ComingSoonPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError("Password errata. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a1e3f 0%, #102c5c 60%, #1a3d7a 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "#e70d0c", transform: "translate(-40%, -40%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "#e70d0c", transform: "translate(40%, 40%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">

        {/* Logo */}
        <div className="mb-8">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mx-auto mb-5">
            <img src="/logo.jpeg" alt="Victoria Casa Hirta" className="w-full h-full object-cover" />
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-[0.3em]">
            Associazione Sportiva
          </p>
          <p className="text-white font-extrabold text-lg tracking-wide mt-0.5">
            Victoria Casa Hirta 2016
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8 w-full">
          <div className="flex-1 h-px bg-white/20" />
          <div className="w-2 h-2 rounded-full" style={{ background: "#e70d0c" }} />
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Coming Soon */}
        <h1
          className="font-extrabold uppercase leading-none mb-3 tracking-tight"
          style={{
            fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
            color: "#e70d0c",
            textShadow: "0 0 40px rgba(231,13,12,0.4)",
          }}
        >
          Coming Soon
        </h1>
        <p className="text-white/60 text-sm mb-10">
          Il nuovo sito ufficiale sta arrivando. Resta sintonizzato!
        </p>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type="password"
              placeholder="Password di accesso"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-3.5 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm font-medium" style={{ color: "#e70d0c" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: loading || !password ? undefined : "linear-gradient(135deg, #e70d0c, #c00b0b)" }}
          >
            {loading ? "Accesso in corso…" : "Entra nel sito"}
          </button>
        </form>

      </div>

      {/* Bottom */}
      <p className="absolute bottom-6 text-white/20 text-xs">
        © {new Date().getFullYear()} Associazione Sportiva di Fatto Victoria Casa Hirta 2016
      </p>
    </div>
  );
}
