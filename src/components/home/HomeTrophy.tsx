import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import Reveal from "@/components/ui/Reveal";
import { formatDateShort } from "@/lib/format";
import { getHomeAwayScores, getMatchOutcome, getOpponent, matchResultNote } from "@/lib/competitions";
import { matchHref } from "@/lib/links";

/** Giorni in cui la coppa vinta resta in home dopo la finale. */
const TROPHY_DAYS = 45;

interface Final {
  id: string;
  slug: string | null;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  extra_time: boolean | null;
  opponent_logo_url: string | null;
  competition: { name: string } | null;
}

async function getWonFinal(): Promise<Final | null> {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, slug, match_date, home_team, away_team, is_home, home_score, away_score, home_penalties, away_penalties, extra_time, opponent_logo_url, competition:competitions(name)"
    )
    .eq("status", "finished")
    .eq("round", "Finale")
    .order("match_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = data as unknown as Final | null;
  if (!m || getMatchOutcome(m) !== "win") return null;
  if (Date.now() - Date.parse(m.match_date) > TROPHY_DAYS * 86400000) return null;
  return m;
}

/** Striscia celebrativa dopo una finale vinta: sparisce da sola dopo qualche settimana. */
export default async function HomeTrophy({ index, className }: { index: number; className: string }) {
  const m = await getWonFinal();
  if (!m) return null;
  const opponent = getOpponent(m);
  const { home, away } = getHomeAwayScores(m);
  const note = matchResultNote(m);
  const vch = <VCHLogo size={22} />;
  const opp = <TeamLogo src={m.opponent_logo_url} name={opponent} size={22} />;

  return (
    <Reveal index={index} className={className}>
      <Link
        href={matchHref(m)}
        className="bento-card group flex items-center gap-4 px-4 py-3.5 md:px-5 border-draw/40 hover:border-draw/70 transition"
        style={{ backgroundImage: "linear-gradient(100deg, rgb(var(--draw-rgb) / 0.16), transparent 55%)" }}
      >
        <span className="relative w-11 h-11 rounded-2xl bg-draw/15 ring-1 ring-draw/40 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-draw" aria-hidden />
          <span className="absolute -top-1 -right-1 text-xs" aria-hidden>✨</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-draw font-bold">Campioni!</p>
          <p className="font-display font-bold leading-tight">
            Il VCH ha vinto la {m.competition?.name ?? "coppa"}
          </p>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="shrink-0">Finale · {formatDateShort(m.match_date)}</span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              ·{m.is_home ? vch : opp}
              <span className="font-semibold text-text tabular whitespace-nowrap">
                {home}–{away}
              </span>
              {m.is_home ? opp : vch}
              <span className="truncate">{opponent}</span>
              {note && <span className="shrink-0">({note})</span>}
            </span>
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition" aria-hidden />
      </Link>
    </Reveal>
  );
}
