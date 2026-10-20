import { Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import HomePrediction, { getPredictableMatch } from "@/components/home/HomePrediction";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Pronostici",
  description: "Pronostica le partite della Victoria Casa Hirta e scala la classifica dei tifosi.",
  path: "/pronostici",
});

interface Row {
  nickname: string;
  played: number;
  points: number;
}

async function getLeaderboard(): Promise<Row[]> {
  const { data } = await supabase.rpc("predict_leaderboard", { p_limit: 100 });
  return ((data as Row[]) ?? []).map((r) => ({ ...r, played: Number(r.played), points: Number(r.points) }));
}

export default async function PronosticiPage() {
  const [match, rows] = await Promise.all([getPredictableMatch(), getLeaderboard()]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Pronostici" subtitle="Indovina l'esito delle partite della Victoria e scala la classifica dei tifosi." />

      {match ? (
        <HomePrediction match={match} />
      ) : (
        <div className="bento-card">
          <EmptyState icon={Sparkles} title="Nessuna partita da pronosticare" description="Appena la prossima partita avrà una data, potrai fare il tuo pronostico qui." />
        </div>
      )}

      <section className="mt-10" aria-labelledby="classifica-tifosi">
        <h2 id="classifica-tifosi" className="font-display text-h3 mb-4">Classifica dei tifosi</h2>
        {rows.length === 0 ? (
          <div className="bento-card">
            <EmptyState compact icon={Trophy} title="Ancora nessun punto" description="La classifica parte dopo la prima partita pronosticata." />
          </div>
        ) : (
          <div className="bento-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted border-b border-border">
                  <th scope="col" className="text-left font-semibold px-4 py-3 w-10">#</th>
                  <th scope="col" className="text-left font-semibold px-2 py-3">Tifoso</th>
                  <th scope="col" className="text-right font-semibold px-2 py-3"><abbr title="Pronostici su partite giocate">Pr.</abbr></th>
                  <th scope="col" className="text-right font-semibold px-4 py-3">Punti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  // Stessa posizione a pari punti e pronostici
                  const prev = rows[i - 1];
                  const pos = prev && prev.points === r.points && prev.played === r.played ? null : i + 1;
                  return (
                    <tr key={r.nickname}>
                      <td className={`px-4 py-3 tabular font-semibold ${i < 3 ? "text-draw" : "text-muted"}`}>{pos ?? ""}</td>
                      <td className="px-2 py-3 font-semibold truncate max-w-[12rem]">{r.nickname}</td>
                      <td className="px-2 py-3 text-right tabular text-muted">{r.played}</td>
                      <td className="px-4 py-3 text-right tabular font-display font-bold text-base">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 bento-card p-5 text-sm text-muted" aria-labelledby="regole-pronostici">
        <h2 id="regole-pronostici" className="font-display font-bold text-text mb-2">Come funziona</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Scegli 1, X o 2 prima del fischio d&apos;inizio; puoi cambiare idea fino all&apos;inizio della partita.</li>
          <li>Ogni pronostico azzeccato vale 1 punto. Conta il risultato sul campo (supplementari compresi): una partita decisa ai rigori vale come pareggio.</li>
          <li>Non serve registrarsi: il nickname resta legato a questo dispositivo e browser.</li>
          <li>Al massimo 3 pronostici per partita dalla stessa rete.</li>
          <li>A parità di punti è avanti chi ha fatto meno pronostici, poi chi ha iniziato prima.</li>
        </ul>
      </section>
    </div>
  );
}
