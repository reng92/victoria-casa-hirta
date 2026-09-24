import { supabase } from "@/lib/supabase";
import { UserCog } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";

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
  return (data as unknown as StaffMember[]) ?? [];
}

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Staff Tecnico" subtitle="Il nostro team dietro le quinte" />

      {staff.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={UserCog} title="Staff non disponibile" description="Lo staff verrà caricato a breve." />
        </div>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {staff.map((s) => (
          <li key={s.id} className="bento-card p-5 flex flex-col items-center text-center gap-3">
            <Avatar src={s.photo_url} name={s.full_name} size={80} className="ring-2 ring-brand-soft/30" />
            <div className="min-w-0 w-full">
              <p className="font-semibold text-sm leading-tight text-balance">{s.full_name}</p>
              <Pill tone="accent" className="mt-2 normal-case tracking-normal">{s.role}</Pill>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
