import Link from "next/link";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { OutcomeBadge } from "@/components/ui/Badge";
import { formatDateShort, getOutcome } from "@/lib/format";
import { getHomeAwayScores, getOpponent, getScores, matchContextShort } from "@/lib/competitions";

interface Match {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchday: number | null;
  group_name: string | null;
  opponent_logo_url: string | null;
  competition: { id: string; name: string } | null;
}

const SELECT =
  "id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, group_name, opponent_logo_url, competition:competitions(id, name)";

async function getLastResult(): Promise<Match | null> {
  const run = (select: string) =>
    supabase
      .from("matches")
      .select(select)
      .eq("status", "finished")
      .order("match_date", { ascending: false })
      .limit(1)
      .maybeSingle();
  const { data, error } = await run(SELECT);
  const row = error ? (await run(SELECT.replace("group_name, ", ""))).data : data;
  return row as unknown as Match | null;
}

export default async function LastResult() {
  const m = await getLastResult();

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Ultimo risultato" icon={Flag} href="/calendario" hrefLabel="Risultati" />
      {!m ? (
        <EmptyState compact title="Nessun risultato" description="La prima partita deve ancora essere giocata." />
      ) : (
        <LastResultBody m={m} />
      )}
    </div>
  );
}

function LastResultBody({ m }: { m: Match }) {
  const opponent = getOpponent(m);
  const context = matchContextShort(m);
  const { ours, theirs } = getScores(m);
  const outcome = getOutcome(ours, theirs);
  const { home, away } = getHomeAwayScores(m);
  const scoreColor = outcome === "win" ? "text-win" : outcome === "loss" ? "text-loss" : outcome === "draw" ? "text-draw" : "text-text";

  return (
    <Link href={`/calendario/${m.id}`} className="flex-1 flex flex-col justify-center mt-4 group">
      {/* Squadra di casa a sinistra */}
      <div className={`flex items-center justify-between gap-3 ${m.is_home ? "" : "flex-row-reverse"}`}>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <VCHLogo size={48} />
          <span className="text-xs font-semibold text-center leading-tight truncate w-full">VCH</span>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <span className={`font-display text-4xl font-bold tabular leading-none ${scoreColor}`}>
            {home ?? "–"}<span className="text-muted mx-1.5 font-normal">–</span>{away ?? "–"}
          </span>
          {outcome && <OutcomeBadge outcome={outcome} className="mt-2" />}
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamLogo src={m.opponent_logo_url} name={opponent} size={48} />
          <span className="text-xs font-semibold text-center leading-tight truncate w-full">{opponent}</span>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-4 text-center truncate">
        {m.competition?.name ?? "Amichevole"}{context ? ` · ${context}` : ""} · {formatDateShort(m.match_date)} · {m.is_home ? "Casa" : "Trasferta"}
      </p>
    </Link>
  );
}
