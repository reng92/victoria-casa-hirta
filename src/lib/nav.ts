import {
  Home,
  CalendarDays,
  Trophy,
  Users,
  Ellipsis,
  Target,
  Newspaper,
  Camera,
  UserCog,
  Handshake,
  MapPin,
  Medal,
  History,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Voci principali: bottom nav mobile e nav orizzontale desktop */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendario", label: "Partite", icon: CalendarDays },
  { href: "/classifica", label: "Classifica", icon: Trophy },
  { href: "/rosa", label: "Rosa", icon: Users },
];

/** Voci secondarie: menu "Altro" */
export const secondaryNav: NavItem[] = [
  { href: "/cannonieri", label: "Cannonieri", icon: Target },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/galleria", label: "Galleria", icon: Camera },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/sponsors", label: "Sponsor", icon: Handshake },
  { href: "/campi", label: "Campi", icon: MapPin },
  { href: "/competizioni", label: "Competizioni", icon: Medal },
  { href: "/storico", label: "Storico", icon: History },
];

export const moreNav: NavItem = { href: "#altro", label: "Altro", icon: Ellipsis };

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
