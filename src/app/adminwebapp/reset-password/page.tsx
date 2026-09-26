"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/**
 * Pagina di destinazione del link "password dimenticata".
 * Supabase apre questa URL con i token di recupero nel frammento (#access_token=...);
 * supabase-js li legge e crea una sessione di tipo recovery, con cui si può
 * impostare la nuova password.
 */
export default function AdminResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Il link può arrivare con ?error=... (scaduto o già usato)
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (params.get("error")) {
      setReady("invalid");
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady("ok");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setReady("ok");
      else setTimeout(() => setReady((r) => (r === "checking" ? "invalid" : r)), 4000);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Errore: " + error.message);
      return;
    }
    setDone(true);
    document.cookie = "vch-admin=1; path=/; max-age=86400";
    setTimeout(() => {
      router.push("/adminwebapp");
      router.refresh();
    }, 1200);
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue";

  return (
    <div data-theme="light" className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.jpeg" alt="Victoria Casa Hirta" width={72} height={72} className="mx-auto mb-4 rounded-full" />
          <h1 className="text-xl font-extrabold text-brand-blue">Nuova password</h1>
          <p className="text-xs text-gray-400 mt-1">Pannello Admin</p>
        </div>

        {ready === "checking" && <p className="text-sm text-gray-500 text-center">Verifica del link in corso...</p>}

        {ready === "invalid" && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-brand-red bg-red-50 p-3 rounded-lg">
              Link non valido o scaduto. Richiedi un nuovo link di recupero.
            </p>
            <Link href="/adminwebapp/login" className="text-sm font-semibold text-brand-blue hover:underline">
              Torna al login
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nuova password</label>
              <input required type="password" autoComplete="new-password" className={input} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Conferma password</label>
              <input required type="password" autoComplete="new-password" className={input} value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-xs text-brand-red bg-red-50 p-2 rounded-lg">{error}</p>}
            {done && <p className="text-xs text-green-700 bg-green-50 p-2 rounded-lg">Password aggiornata. Accesso in corso...</p>}
            <button
              type="submit"
              disabled={loading || done}
              className="bg-brand-blue text-white font-semibold py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Salva nuova password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
