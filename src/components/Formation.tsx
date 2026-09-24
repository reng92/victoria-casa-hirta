import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface FormationPlayer {
  id: string;
  position_x: number;
  position_y: number;
  player: {
    full_name: string;
    shirt_number: number | null;
    photo_url: string | null;
  } | null;
}

async function getFormation(matchId: string): Promise<FormationPlayer[]> {
  const { data } = await supabase
    .from("match_formations")
    .select("id, position_x, position_y, player:players(full_name, shirt_number, photo_url)")
    .eq("match_id", matchId);
  return (data as unknown as FormationPlayer[]) ?? [];
}

/** Campo da calcio con i giocatori posizionati. Ritorna null se non c'è formazione. */
export default async function Formation({ matchId }: { matchId: string }) {
  const formation = await getFormation(matchId);
  if (formation.length === 0) return null;

  return (
    <div className="bento-card p-3 sm:p-4">
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(180deg, #2f8f52 0 10%, #2a8049 10% 20%)",
          aspectRatio: "2 / 3",
        }}
        role="img"
        aria-label="Formazione schierata in campo"
      >
        {/* Linee campo */}
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-3 border-2 border-white/45 rounded-sm" />
          <div className="absolute left-3 right-3 border-t-2 border-white/45" style={{ top: "50%" }} />
          <div
            className="absolute border-2 border-white/45 rounded-full w-[22%] aspect-square"
            style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          />
          <div className="absolute border-2 border-white/45 border-t-0" style={{ top: "3%", left: "35%", right: "35%", height: "8%" }} />
          <div className="absolute border-2 border-white/45 border-t-0" style={{ top: "3%", left: "20%", right: "20%", height: "18%" }} />
          <div className="absolute border-2 border-white/45 border-b-0" style={{ bottom: "3%", left: "35%", right: "35%", height: "8%" }} />
          <div className="absolute border-2 border-white/45 border-b-0" style={{ bottom: "3%", left: "20%", right: "20%", height: "18%" }} />
        </div>

        {/* Giocatori */}
        {formation.map((fp) => (
          <div
            key={fp.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${fp.position_x}%`,
              top: `${fp.position_y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-brand-blue border-2 border-white shadow-soft flex items-center justify-center">
              {fp.player?.photo_url ? (
                <Image src={fp.player.photo_url} alt={fp.player.full_name ?? ""} fill sizes="48px" className="object-cover" />
              ) : (
                <span className="text-white text-xs font-display font-bold tabular">
                  {fp.player?.shirt_number ?? "?"}
                </span>
              )}
            </div>
            <div className="mt-1 bg-black/65 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[72px] truncate text-center">
              {fp.player?.shirt_number ? `${fp.player.shirt_number} · ` : ""}
              {fp.player?.full_name?.split(" ").pop() ?? ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
