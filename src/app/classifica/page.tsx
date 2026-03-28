import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface Standing {
  id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  competition: { name: string } | null;
}

async function getStandings(): Promise<Standing[]> {
  const { data } = await supabase
    .from("standings")
    .select("*, competition:competitions(name)")
    .order("points", { ascending: false });
  return (data as Standing[]) ?? [];
}

export default async function ClassificaPage() {
  const standings = await getStandings();

  const grouped = standings.reduce<Record<string, Standing[]>>((acc, s) => {
    const key = s.competition?.name ?? "Generale";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Classifica</h1>
      <p className="text-gray-500 mb-10 text-sm">Classifiche per competizione</p>

      {standings.length === 0 && (
        <p className="text-gray-400 text-sm">La classifica verrà caricata a breve.</p>
      )}

      {Object.entries(grouped).map(([compName, rows]) => (
        <div key={compName} className="mb-12">
          <h2 className="text-xl font-bold text-brand-red uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
            {compName}
          </h2>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-blue text-white text-xs uppercase tracking-widest">
                  <th className="py-3 px-4 text-left w-8">#</th>
                  <th className="py-3 px-4 text-left">Squadra</th>
                  <th className="py-3 px-4 text-center">G</th>
                  <th className="py-3 px-4 text-center">V</th>
                  <th className="py-3 px-4 text-center">N</th>
                  <th className="py-3 px-4 text-center">P</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">GF</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">GS</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">DR</th>
                  <th className="py-3 px-4 text-center font-bold">Pt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isVCH = row.team_name.toLowerCase().includes("victoria");
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-100 transition ${isVCH ? "bg-brand-blue/5 font-semibold" : "hover:bg-gray-50"}`}
                    >
                      <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-4 text-brand-blue">{row.team_name}</td>
                      <td className="py-3 px-4 text-center">{row.played}</td>
                      <td className="py-3 px-4 text-center text-green-600">{row.won}</td>
                      <td className="py-3 px-4 text-center text-yellow-600">{row.drawn}</td>
                      <td className="py-3 px-4 text-center text-red-600">{row.lost}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">{row.goals_for}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">{row.goals_against}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">{row.goals_for - row.goals_against}</td>
                      <td className="py-3 px-4 text-center font-bold text-brand-red text-base">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
