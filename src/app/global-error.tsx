"use client";

/**
 * Errore nel layout principale: sostituisce tutta la pagina, quindi niente
 * Tailwind né font del sito, solo stili in linea con i colori del tema scuro.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#0b1220",
          color: "#e8eef8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Qualcosa è andato storto</h1>
        <p style={{ margin: 0, color: "#98a6bf", maxWidth: 320 }}>Il sito del VCH non si è caricato. Riprova tra qualche secondo.</p>
        <button
          type="button"
          onClick={reset}
          style={{ border: 0, borderRadius: 999, background: "#e70d0c", color: "#fff", fontWeight: 600, padding: "12px 24px", fontSize: 14, cursor: "pointer" }}
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
