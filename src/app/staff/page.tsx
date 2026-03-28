import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
}

async function getStaff(): Promise<StaffMember[]> {
  const { data } = await supabase
    .from("staff")
    .select("id, full_name, role, photo_url")
    .order("role", { ascending: true });
  return (data as StaffMember[]) ?? [];
}

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Staff Tecnico</h1>
      <p className="text-gray-500 mb-10 text-sm">Il nostro team dietro le quinte</p>

      {staff.length === 0 && (
        <p className="text-gray-400 text-sm">Lo staff verrà caricato a breve.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {staff.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition"
          >
            <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {s.photo_url ? (
                <img
                  src={s.photo_url}
                  alt={s.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🧑‍💼</span>
              )}
            </div>
            <div className="font-bold text-brand-blue text-sm leading-tight">{s.full_name}</div>
            <div className="text-xs text-brand-red font-semibold mt-1">{s.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
