"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (isLoginPage) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) setEmail(session.user.email);
    });
  }, [isLoginPage, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "vch-admin=; path=/; max-age=0";
    router.push("/admin/login");
    router.refresh();
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-blue text-white px-4 py-3 flex items-center justify-between text-sm sticky top-16 z-40">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="font-bold text-white hover:text-brand-red transition">
            ⚙️ Admin
          </Link>
          <Link href="/" className="text-white/60 hover:text-white transition text-xs">← Vai al sito</Link>
          <Link href="/admin/partite" className="text-white/60 hover:text-white transition text-xs hidden md:block">Partite</Link>
          <Link href="/admin/marcatori" className="text-white/60 hover:text-white transition text-xs hidden md:block">Marcatori</Link>
          <Link href="/admin/rosa" className="text-white/60 hover:text-white transition text-xs hidden md:block">Rosa</Link>
          <Link href="/admin/news" className="text-white/60 hover:text-white transition text-xs hidden md:block">News</Link>
        </div>
        <div className="flex items-center gap-3">
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
