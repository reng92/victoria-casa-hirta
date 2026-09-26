import { supabase } from "@/lib/supabase";

/** True se l'utente loggato è nella tabella admins (funzione SQL is_admin). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
