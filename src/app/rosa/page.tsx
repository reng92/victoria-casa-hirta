import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";
import { initials } from "@/lib/format";
import { playerHref } from "@/lib/links";

export const revalidate = 60;

const ruoliOrder = ["portiere", "difensore", "centrocampista", "attaccante"];

const ruoliLabel: Record<string, string> = {
  portiere: "Portieri",
  difensore: "Difensori",
  centrocampista: "Centrocampisti",
  attaccante: "Attaccanti",
};

const ruoloSingolare: Record<string, string> = {
  portiere: "Portiere",
  difensore: "Difensore",
  centrocampista: "Centrocampista",
  attaccante: "Attaccante",
};

interface Player {
  slug?: string | null;
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

async function getPlayers(): Promise<Player[]> {
  const { data } = await supabase
    .from("players")
    .select("id, slug, full_name, shirt_number, role, photo_url")
    .eq("is_active", true)
    .order("shirt_number", { ascending: true });
  return (data as unknown as Player[]) ?? [];
}

function PlayerCard({ p, priority }: { p: Player; priority?: boolean }) {
  return (
    <Link
      href={playerHref(p)}
      className="group bento-card tap block focus-visible:ring-2 focus-visible:ring-brand-soft"
      aria-label={`${p.full_name}${p.shirt_number ? `, numero ${p.shirt_number}` : ""}, ${ruoloSingolare[p.role] ?? p.role}`}
    >
      <div className="relative aspect-[3/4] bg-surface-2 overflow-hidden">
        {p.photo_url ? (
          <Image
            src={p.photo_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 mesh-hero flex items-center justify-center">
            <span className="font-display text-4xl font-bold text-white/30">{initials(p.full_name)}</span>
          </div>
        )}
        {/* Gradiente per leggibilità */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />

        {/* Numero maglia grande in overlay */}
        {p.shirt_number !== null && (
          <span
            className="absolute top-2 right-3 font-display font-bold text-white/90 leading-none tabular drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            style={{ fontSize: "clamp(2.25rem, 8vw, 3.5rem)" }}
            aria-hidden
          >
            {p.shirt_number}
          </span>
        )}

        {/* Nome + ruolo */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display font-bold text-white leading-tight text-sm sm:text-base text-balance">{p.full_name}</p>
          <Pill tone="glass" className="mt-1.5 normal-case tracking-normal">{ruoloSingolare[p.role] ?? p.role}</Pill>
        </div>
      </div>
    </Link>
  );
}

export default async function RosaPage() {
  const players = await getPlayers();

  const grouped = ruoliOrder.reduce<Record<string, Player[]>>((acc, role) => {
    acc[role] = players.filter((p) => p.role === role);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Rosa" subtitle={`Stagione in corso · ${players.length} giocatori`} />

      {players.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Users} title="Rosa non disponibile" description="I giocatori verranno caricati a breve." />
        </div>
      )}

      {ruoliOrder.map((role, gi) => {
        const group = grouped[role];
        if (!group || group.length === 0) return null;
        return (
          <section key={role} className="mb-10" aria-labelledby={`role-${role}`}>
            <div className="flex items-center gap-3 mb-4">
              <h2 id={`role-${role}`} className="font-display text-h3">{ruoliLabel[role]}</h2>
              <span className="text-xs text-muted tabular">{group.length}</span>
            </div>
            <div className="stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {group.map((p, i) => (
                <PlayerCard key={p.id} p={p} priority={gi === 0 && i < 2} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
