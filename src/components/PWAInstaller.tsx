"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstaller() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-brand-blue text-white rounded-2xl shadow-xl p-4 z-50 flex items-center gap-3">
      <span className="text-2xl">📲</span>
      <div className="flex-1">
        <p className="font-bold text-sm">Installa l'app VCH</p>
        <p className="text-xs text-white/70">Accedi velocemente dal tuo telefono</p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleInstall}
          className="text-xs bg-brand-red px-3 py-1 rounded-full font-semibold hover:opacity-90"
        >
          Installa
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-xs text-white/50 hover:text-white text-center"
        >
          No grazie
        </button>
      </div>
    </div>
  );
}
