import Image from "next/image";

/** Logo dei 10 anni (2016–2026). Il file ha sfondo chiaro: ritaglio circolare con anello. */
export default function AnniversaryBadge({
  size = 40,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-10-anni.jpeg"
      alt="10 anni Victoria Casa Hirta, 2016–2026"
      title="10 anni di sport e amicizia · 2016–2026"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full ring-2 ring-white/15 shadow-soft bg-white object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
