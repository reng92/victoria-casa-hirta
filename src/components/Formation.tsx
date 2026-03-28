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

export default async function Formation({ matchId }: { matchId: string }) {
  const formation = await getFormation(matchId);
  if (formation.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-brand-blue text-lg">⚽ Formazione</h2>
      </div>
      <div className="p-4">
        {/* Campo da calcio */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #2d8a4e 0%, #2d8a4e 100%)",
            paddingBottom: "150%",
          }}
        >
          {/* Linee campo */}
          <div className="absolute inset-0 flex flex-col">
            {/* Bordo campo */}
            <div className="absolute inset-3 border-2 border-white/40 rounded" />
            {/* Linea centrocampo */}
            <div className="absolute left-3 right-3 border-t-2 border-white/40" style={{ top: "50%" }} />
            {/* Cerchio centrocampo */}
            <div className="absolute border-2 border-white/40 rounded-full w-16 h-16"
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
            {/* Area piccola alto */}
            <div className="absolute border-2 border-white/40"
              style={{ top: "3%", left: "35%", right: "35%", height: "8%" }}
            />
            {/* Area grande alto */}
            <div className="absolute border-2 border-white/40"
              style={{ top: "3%", left: "20%", right: "20%", height: "18%" }}
            />
            {/* Area piccola basso */}
            <div className="absolute border-2 border-white/40"
              style={{ bottom: "3%", left: "35%", right: "35%", height: "8%" }}
            />
            {/* Area grande basso */}
            <div className="absolute border-2 border-white/40"
              style={{ bottom: "3%", left: "20%", right: "20%", height: "18%" }}
            />
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
              <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-blue border-2 border-white shadow-lg flex items-center justify-center">
                {fp.player?.photo_url ? (
                  <img src={fp.player.photo_url} alt={fp.player.full_name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-extrabold">
                    {fp.player?.shirt_number ?? "?"}
                  </span>
                )}
              </div>
              <div className="mt-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-16 truncate text-center">
                {fp.player?.full_name?.split(" ").pop() ?? ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
