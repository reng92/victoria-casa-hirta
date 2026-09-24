"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

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
    <div className="fixed left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 flex items-center gap-3 glass rounded-card shadow-soft p-4 text-text bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+12px)] md:bottom-4">
      <span className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white shrink-0">
        <Smartphone className="w-5 h-5" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="font-bold text-sm">Installa l'app VCH</p>
        <p className="text-xs text-muted">Accedi velocemente dal tuo telefono</p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleInstall}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-full font-semibold hover:brightness-110"
        >
          Installa
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-xs text-muted hover:text-text text-center"
        >
          No grazie
        </button>
      </div>
    </div>
  );
}
