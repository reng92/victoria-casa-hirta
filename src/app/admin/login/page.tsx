"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetSent, setResetSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Errore: " + error.message);
      return;
    }
    setResetSent(true);
  }

  function switchMode(next: "login" | "reset") {
    setMode(next);
    setError("");
    setResetSent(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Errore: " + error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      document.cookie = `vch-admin=1; path=/; max-age=86400`;
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div data-theme="light" className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
                src="/logo.jpeg"
            alt="Victoria Casa Hirta"
            width={72}
            height={72}
            className="mx-auto mb-4 rounded-full"
          />
          <h1 className="text-xl font-extrabold text-brand-blue">Pannello Admin</h1>
          <p className="text-xs text-gray-400 mt-1">Victoria Casa Hirta</p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Password</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-brand-red bg-red-50 p-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-blue text-white font-semibold py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="text-xs text-gray-500 hover:text-brand-blue underline underline-offset-2 transition self-center"
            >
              Password dimenticata?
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Inserisci l&apos;email dell&apos;account admin: ti invieremo un link per impostare una nuova password.
            </p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-brand-red bg-red-50 p-2 rounded-lg">{error}</p>}
            {resetSent && (
              <p className="text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                Email inviata. Controlla la casella (anche lo spam) e apri il link entro un&apos;ora.
              </p>
            )}
            <button
              type="submit"
              disabled={loading || resetSent}
              className="bg-brand-blue text-white font-semibold py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Invio..." : "Invia link di recupero"}
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-xs text-gray-500 hover:text-brand-blue underline underline-offset-2 transition self-center"
            >
              Torna al login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
