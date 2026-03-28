import { supabase } from "@/lib/supabase";
import Image from "next/image";

export const revalidate = 60;

const ruoliOrder = ["portiere", "difensore", "centrocampista", "attaccante"];

const ruoliLabel: Record<string, string> = {
  portiere: "Portieri",
  difensore: "Difensori",
  centrocampista: "Centrocampisti",
  attaccante: "Attaccanti",
};

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

async function getPlayers(): Promise<Player[]> {
  const { data } = await supabase
    .from("players")
    .select("id, full_name, shirt_number, role, photo_url")
    .eq("is_active", true)
    .order("shirt_number", { ascending: true });
  return (data as Player[]) ?? [];
}

export default async function RosaPage() {
  const players = await getPlayers();

  const grouped = ruoliOrder.reduce<Record<string, Player[]>>((acc, role) => {
    acc[role] = players.filter((p) => p.role === role);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Rosa</h1>
      <p className="text-gray-500 mb-10 text-sm">Stagione in corso</p>

      {players.length === 0 && (
        <p className="text-gray-400 text-sm">La rosa verrà caricata a breve.</p>
      )}

      {ruoliOrder.map((role) => {
        const group = grouped[role];
        if (!group || group.length === 0) return null;
        return (
          <div key={role} className="mb-12">
            <h2 className="text-xl font-bold text-brand-red uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">
              {ruoliLabel[role]}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {group.map((player) => (
                <div
                  key={player.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition group"
                >
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {player.photo_url ? (
                      <Image
                        src={player.photo_url}
                        alt={player.full_name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-3xl">⚽</span>
                    )}
                  </div>
                  {player.shirt_number && (
                    <div className="text-xs font-bold text-brand-red mb-1">
                      #{player.shirt_number}
                    </div>
                  )}
                  <div className="font-semibold text-brand-blue text-sm leading-tight group-hover:text-brand-red transition">
                    {player.full_name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 capitalize">{player.role}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
