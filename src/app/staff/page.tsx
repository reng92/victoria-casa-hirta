import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { UserCog } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";
import { initials } from "@/lib/format";

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

function StaffCard({ s, priority }: { s: StaffMember; priority?: boolean }) {
  return (
    <li className="group bento-card">
      <div className="relative aspect-[3/4] bg-surface-2 overflow-hidden">
        {s.photo_url ? (
          <Image
            src={s.photo_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 mesh-hero flex items-center justify-center">
            <span className="font-display text-4xl font-bold text-white/30">{initials(s.full_name)}</span>
          </div>
        )}
        {/* Gradiente per leggibilità */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />

        {/* Nome + ruolo */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display font-bold text-white leading-tight text-sm sm:text-base text-balance">{s.full_name}</p>
          <Pill tone="glass" className="mt-1.5 normal-case tracking-normal">{s.role}</Pill>
        </div>
      </div>
    </li>
  );
}

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Staff Tecnico" subtitle="Il nostro team dietro le quinte" />

      {staff.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={UserCog} title="Staff non disponibile" description="Lo staff verrà caricato a breve." />
        </div>
      )}

      <ul className="stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {staff.map((s, i) => (
          <StaffCard key={s.id} s={s} priority={i < 2} />
        ))}
      </ul>
    </div>
  );
}
