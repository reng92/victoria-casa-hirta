import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import TeamLogo from "@/components/ui/TeamLogo";
import { Pill } from "@/components/ui/Badge";
import { formatTime, formatWeekday, nowAsMatchDate } from "@/lib/format";
import { getOpponent, isVCH, matchContextShort, teamKey } from "@/lib/competitions";
import { competitionHref, getTeamLogos, getUnscheduledVCH } from "@/lib/competition-data";
import { matchHref } from "@/lib/links";

interface Match {
  slug?: string | null;
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  status: string;
  matchday: number | null;
  group_name: string | null;
  round?: string | null;
  opponent_logo_url: string | null;
  venue: { name: string } | null;
  competition: { id: string; name: string } | null;
}

const SELECT =
  "id, slug, match_date, home_team, away_team, is_home, status, matchday, group_name, round, opponent_logo_url, venue:venues(name), competition:competitions(id, name)";

/** Le prossime 3 partite (compresa quella in hero), con lo stesso filtro e ordine di NextMatch. */
async function getUpcoming(): Promise<Match[]> {
  const run = (select: string) =>
    supabase
      .from("matches")
      .select(select)
      .or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${nowAsMatchDate(3)})`)
      .order("status", { ascending: true })
      .order("match_date", { ascending: true })
      .limit(3);
  const { data, error } = await run(SELECT);
  const rows = error ? (await run(SELECT.replace("group_name, ", ""))).data : data;
  return (rows as unknown as Match[]) ?? [];
}

/** Partite già decise ma senza data (es. turni di coppa), in coda a quelle in calendario. */
async function getUndated(limit: number) {
  if (limit <= 0) return [];
  const [fixtures, logos] = await Promise.all([getUnscheduledVCH(), getTeamLogos()]);
  return fixtures.slice(0, limit).map((f) => {
    const opponent = isVCH(f.home_team) ? f.away_team : f.home_team;
    return { ...f, opponent, logo: logos[teamKey(opponent)] ?? null };
  });
}

export default async function UpcomingMatches() {
  const matches = await getUpcoming();
  const undated = await getUndated(3 - matches.length);

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Prossime partite" icon={CalendarDays} href="/calendario" hrefLabel="Calendario" />
      {matches.length === 0 && undated.length === 0 ? (
        <EmptyState compact title="Nessuna partita in programma" description="Il calendario verrà aggiornato a breve." />
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border flex-1">
          {matches.map((m) => {
            const d = new Date(m.match_date);
            const opponent = getOpponent(m);
            const context = matchContextShort(m);
            return (
              <li key={m.id}>
                <Link
                  href={matchHref(m)}
                  className="flex items-center gap-3 py-3 hover:bg-surface-2/40 -mx-2 px-2 rounded-xl tap"
                >
                  <div className="flex flex-col items-center w-11 shrink-0 rounded-xl bg-surface-2 border border-border py-1.5">
                    <span className="text-[10px] uppercase text-muted leading-none">{formatWeekday(m.match_date)}</span>
                    <span className="font-display text-lg font-bold leading-tight tabular">{d.getDate()}</span>
                  </div>
                  <TeamLogo src={m.opponent_logo_url} name={opponent} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{opponent}</p>
                    <p className="text-[11px] text-muted truncate">
                      {m.competition?.name ?? "Amichevole"}{context ? ` · ${context}` : ""}
                      {m.venue ? ` · ${m.venue.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold tabular">{formatTime(m.match_date)}</span>
                    <Pill tone={m.is_home ? "brand" : "neutral"} className="!py-px">{m.is_home ? "Casa" : "Fuori"}</Pill>
                  </div>
                </Link>
              </li>
            );
          })}
          {undated.map((f) => (
            <li key={f.id}>
              <Link
                href={f.competition ? competitionHref(f.competition) : "/calendario"}
                className="flex items-center gap-3 py-3 hover:bg-surface-2/40 -mx-2 px-2 rounded-xl tap"
              >
                <div className="flex flex-col items-center justify-center w-11 h-[46px] shrink-0 rounded-xl bg-surface-2 border border-border">
                  <span className="font-display text-lg font-bold leading-none text-muted">?</span>
                </div>
                <TeamLogo src={f.logo} name={f.opponent} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{f.opponent}</p>
                  <p className="text-[11px] text-muted truncate">
                    {f.competition?.name ?? "Amichevole"}{f.round ? ` · ${f.round}` : ""}
                  </p>
                </div>
                {/* Niente casa/fuori: il campo non è ancora deciso (le finali sono spesso in campo neutro) */}
                <span className="text-[11px] font-semibold text-muted shrink-0">Data da definire</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
