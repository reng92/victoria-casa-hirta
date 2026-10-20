import { supabase } from "@/lib/supabase";
import MatchPrediction from "@/components/MatchPrediction";
import { getOpponent } from "@/lib/competitions";
import { nowAsMatchDate } from "@/lib/format";

export interface PredictableMatch {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  status: string;
}

/** Prossima partita con data ancora da giocare: l'unica su cui si può fare il pronostico in home. */
export async function getPredictableMatch(): Promise<PredictableMatch | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, status")
    .eq("status", "scheduled")
    .gte("match_date", nowAsMatchDate())
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as PredictableMatch | null;
}

export default function HomePrediction({ match }: { match: PredictableMatch }) {
  return (
    <MatchPrediction
      matchId={match.id}
      matchDate={match.match_date}
      isHome={match.is_home}
      status={match.status}
      opponent={getOpponent(match)}
      compact
    />
  );
}
