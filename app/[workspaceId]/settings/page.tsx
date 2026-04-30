"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Users, Loader2, Trash2 } from "lucide-react";
import { useWorkspaceRole } from "@/components/WorkspaceProvider";

type Member = { id: string; name: string; email: string; role: string; membershipId: string };

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    "bg-[#2B2B2B] text-white",
  REVIEWER: "border border-[#2B2B2B] text-[#2B2B2B]",
  CLIENT:   "border border-[#D4D4D4] text-[#B3B3B3]",
};

const inputCls =
  "border border-[#D4D4D4] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] placeholder:text-[#B3B3B3] transition-colors";

export default function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const isAdmin = useWorkspaceRole() === "ADMIN";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", role: "CLIENT" });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchMembers = () =>
    fetch(`/api/${workspaceId}/members`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && Array.isArray(data)) setMembers(data);
        else setError(data.error ?? "Failed to load members");
      })
      .finally(() => setLoading(false));

  useEffect(() => { fetchMembers(); }, [workspaceId]);

  async function handleAdd(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/${workspaceId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSuccess(`${form.email} added as ${form.role}`);
      setForm({ email: "", role: "CLIENT" });
      await fetchMembers();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to add member");
    }
    setAdding(false);
  }

  async function handleRemove(membershipId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from this workspace?`)) return;
    setRemoving(membershipId);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/${workspaceId}/members/${membershipId}`, { method: "DELETE" });
    if (res.ok) {
      setSuccess(`${memberName} removed from workspace`);
      await fetchMembers();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to remove member");
    }
    setRemoving(null);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">Members</h1>
        <p className="text-xs text-[#B3B3B3] mt-0.5 tracking-wide">
          Manage workspace access. Users must register before being added.
        </p>
      </div>

      {/* Add member — admin only */}
      {isAdmin && (
        <div className="border border-[#D4D4D4] mb-6">
          <div className="px-5 py-3.5 border-b border-[#D4D4D4] bg-[#F5F5F5]">
            <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Add Member</h2>
          </div>
          <div className="p-5">
            {error && (
              <div className="mb-3 text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-3 py-2">{error}</div>
            )}
            {success && (
              <div className="mb-3 text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-3 py-2">{success}</div>
            )}
            <form onSubmit={handleAdd} className="flex gap-2">
              <input type="email" required placeholder="user@company.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`flex-1 ${inputCls}`} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}>
                <option value="ADMIN">Admin</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="CLIENT">Client</option>
              </select>
              <button type="submit" disabled={adding}
                className="flex items-center gap-2 bg-[#2B2B2B] text-white px-4 py-2 text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors shrink-0">
                <UserPlus className="w-4 h-4" />
                {adding ? "Adding…" : "Add"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="border border-[#D4D4D4]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D4D4D4] bg-[#F5F5F5]">
          <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Team</h2>
          <span className="text-[10px] text-[#B3B3B3] font-mono">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-[#D4D4D4] mx-auto mb-2" />
            <p className="text-sm text-[#B3B3B3]">No members yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F5F5F5]">
            {members.map((member) => {
              const initials = member.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const isRemoving = removing === member.membershipId;
              return (
                <li key={member.id} className="group flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#2B2B2B] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2B2B2B]">{member.name}</p>
                      <p className="text-xs text-[#B3B3B3]">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 ${ROLE_BADGE[member.role] ?? ROLE_BADGE.CLIENT}`}>
                      {member.role}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemove(member.membershipId, member.name)}
                        disabled={isRemoving}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[#B3B3B3] hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        title="Remove member"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
