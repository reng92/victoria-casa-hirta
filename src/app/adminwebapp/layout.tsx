"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isCurrentUserAdmin } from "@/lib/admin";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/adminwebapp/login" || pathname === "/adminwebapp/reset-password";
  const [email, setEmail] = useState("");
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/adminwebapp/login");
        return;
      }
      if (!(await isCurrentUserAdmin())) {
        await supabase.auth.signOut();
        document.cookie = "vch-admin=; path=/; max-age=0";
        router.push("/adminwebapp/login");
        return;
      }
      if (session.user?.email) setEmail(session.user.email);
      setAllowed(true);
    });
  }, [isLoginPage, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "vch-admin=; path=/; max-age=0";
    router.push("/adminwebapp/login");
    router.refresh();
  }

  if (isLoginPage) return <>{children}</>;
  if (!allowed) return <div data-theme="light" className="min-h-screen bg-gray-50" />;

  return (
    <div data-theme="light" className="min-h-screen bg-gray-50 text-gray-900">
      <div className="bg-brand-blue text-white px-4 py-3 flex items-center justify-between text-sm sticky top-16 z-40">
        <div className="flex items-center gap-4 min-w-0 overflow-x-auto">
          <Link href="/adminwebapp" className="font-bold text-white hover:text-brand-red transition whitespace-nowrap">
            ⚙️ Admin
          </Link>
          <Link href="/" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">← Vai al sito</Link>
          <Link href="/adminwebapp/partite" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Partite</Link>
          <Link href="/adminwebapp/risultati" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Risultati altre squadre</Link>
          <Link href="/adminwebapp/marcatori" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Marcatori</Link>
          <Link href="/adminwebapp/rosa" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Rosa</Link>
          <Link href="/adminwebapp/news" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">News</Link>
          <Link href="/adminwebapp/notifiche" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Notifiche</Link>
          <Link href="/adminwebapp/loghi" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Loghi</Link>
          <Link href="/adminwebapp/sponsors" className="text-white/60 hover:text-white transition text-xs whitespace-nowrap">Sponsor</Link>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/60 text-xs hidden sm:block">{email}</span>
          <button
            onClick={handleLogout}
            className="text-xs bg-brand-red px-3 py-1 rounded-full hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
