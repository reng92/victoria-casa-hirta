"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageUpload from "@/components/ImageUpload";

interface StaffMember { id: string; full_name: string; role: string; photo_url: string | null; }
const emptyForm = { full_name: "", role: "", photo_url: "" };

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    const { data } = await supabase.from("staff").select("id, full_name, role, photo_url").order("role");
    setStaff((data as unknown as StaffMember[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("staff").insert({
      full_name: form.full_name,
      role: form.role,
      photo_url: form.photo_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Membro aggiunto!"); setForm(emptyForm); fetchStaff(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare?")) return;
    await supabase.from("staff").delete().eq("id", id);
    fetchStaff();
  }

  function openEdit(s: StaffMember) {
    setEditMember(s);
    setEditMsg("");
    setEditForm({ full_name: s.full_name, role: s.role, photo_url: s.photo_url ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMember) return;
    setEditLoading(true);
    setEditMsg("");
    const { error } = await supabase.from("staff").update({
      full_name: editForm.full_name,
      role: editForm.role,
      photo_url: editForm.photo_url || null,
    }).eq("id", editMember.id);
    if (error) setEditMsg("Errore: " + error.message);
    else { setEditMsg("Membro aggiornato!"); fetchStaff(); setTimeout(() => setEditMember(null), 1000); }
    setEditLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Staff</h1>

      {editMember && (
        <div className="bg-white border-2 border-brand-blue rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-brand-blue">✏️ Modifica membro staff</h2>
            <button onClick={() => setEditMember(null)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
          </div>
          <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome e cognome *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ruolo *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="es. Allenatore, Presidente..." />
            </div>
            <div className="sm:col-span-2">
              {editForm.photo_url && (
                <div className="flex items-center gap-3 mb-3">
                  <img src={editForm.photo_url} alt="Foto attuale" className="w-14 h-14 rounded-full object-cover object-top border border-gray-200" />
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, photo_url: "" }))} className="text-xs text-gray-400 hover:text-red-500 transition">Rimuovi foto</button>
                </div>
              )}
              <ImageUpload
                key={editMember.id}
                folder="staff"
                label="Cambia foto"
                onUploaded={(url) => setEditForm(f => ({ ...f, photo_url: url }))}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={editLoading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
                {editLoading ? "Salvataggio..." : "Salva modifiche"}
              </button>
              {editMsg && <span className="ml-4 text-sm text-green-600">{editMsg}</span>}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi membro staff</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome e cognome *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ruolo *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="es. Allenatore, Presidente..." />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload
              folder="staff"
              label="Foto membro staff"
              onUploaded={(url) => setForm(f => ({ ...f, photo_url: url }))}
            />
            {form.photo_url && (
              <p className="text-xs text-green-600 mt-1">✓ Foto caricata</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Aggiungi"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {staff.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="font-bold text-brand-blue">{s.full_name}</span>
              <span className="ml-2 text-xs text-gray-400">{s.role}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition">
                ✏️ Modifica
              </button>
              <button onClick={() => handleDelete(s.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
