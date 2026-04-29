"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Save, CheckCircle, Lock, Loader2 } from "lucide-react";
import { useWorkspaceRole } from "@/components/WorkspaceProvider";

type Brand = {
  tone: string;
  dos: string[];
  donts: string[];
  writingSamples: string[];
};

const inputCls =
  "w-full border border-[#D4D4D4] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] placeholder:text-[#B3B3B3] transition-colors";

export default function BrandPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const role = useWorkspaceRole();
  const isAdmin = role === "ADMIN";
  const [brand, setBrand] = useState<Brand>({ tone: "", dos: [""], donts: [""], writingSamples: [""] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/${workspaceId}/brand`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data) setBrand(data);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const update = (field: keyof Brand, idx: number, val: string) =>
    setBrand((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => (i === idx ? val : item)),
    }));

  const add = (field: keyof Brand) =>
    setBrand((prev) => ({ ...prev, [field]: [...(prev[field] as string[]), ""] }));

  const remove = (field: keyof Brand, idx: number) =>
    setBrand((prev) => ({ ...prev, [field]: (prev[field] as string[]).filter((_, i) => i !== idx) }));

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/${workspaceId}/brand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...brand,
        dos: brand.dos.filter((d) => d.trim()),
        donts: brand.donts.filter((d) => d.trim()),
        writingSamples: brand.writingSamples.filter((s) => s.trim()),
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#D4D4D4] animate-spin" />
        <span className="text-sm text-[#B3B3B3]">Loading brand settings…</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Brand Setup</h1>
          {!isAdmin && (
            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-[#B3B3B3] border border-[#D4D4D4] px-2 py-0.5">
              <Lock className="w-3 h-3" /> Read-only
            </span>
          )}
        </div>
        <p className="text-xs text-[#B3B3B3] mt-1 tracking-wide">
          These guidelines are injected verbatim into every AI generation prompt.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-4 py-3">{error}</div>
        )}

        {/* Tone */}
        <Section title="Brand Tone" description="Describe the voice and personality in 1–3 sentences.">
          <textarea
            required={isAdmin}
            readOnly={!isAdmin}
            value={brand.tone}
            onChange={(e) => isAdmin && setBrand({ ...brand, tone: e.target.value })}
            rows={3}
            placeholder="e.g. Professional, forward-thinking, concise. Confident but not arrogant. Use active voice."
            className={`${inputCls} resize-none ${!isAdmin ? "bg-[#F5F5F5] cursor-default" : ""}`}
          />
        </Section>

        {/* Do's */}
        <Section title="Do's" description="Rules the AI must follow.">
          <div className="space-y-2">
            {brand.dos.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2B2B2B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">✓</span>
                <input
                  readOnly={!isAdmin}
                  value={d}
                  onChange={(e) => update("dos", i, e.target.value)}
                  placeholder="Lead with value and outcomes"
                  className={`${inputCls} ${!isAdmin ? "bg-[#F5F5F5] cursor-default" : ""}`}
                />
                {isAdmin && (
                  <button type="button" onClick={() => remove("dos", i)} className="text-[#D4D4D4] hover:text-[#2B2B2B] transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button type="button" onClick={() => add("dos")}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#B3B3B3] hover:text-[#2B2B2B] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add rule
            </button>
          )}
        </Section>

        {/* Don'ts */}
        <Section title="Don'ts" description="What the AI must never do.">
          <div className="space-y-2">
            {brand.donts.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 border border-[#D4D4D4] text-[#B3B3B3] text-[10px] font-bold flex items-center justify-center shrink-0">✗</span>
                <input
                  readOnly={!isAdmin}
                  value={d}
                  onChange={(e) => update("donts", i, e.target.value)}
                  placeholder="Use jargon or buzzwords"
                  className={`${inputCls} ${!isAdmin ? "bg-[#F5F5F5] cursor-default" : ""}`}
                />
                {isAdmin && (
                  <button type="button" onClick={() => remove("donts", i)} className="text-[#D4D4D4] hover:text-[#2B2B2B] transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button type="button" onClick={() => add("donts")}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#B3B3B3] hover:text-[#2B2B2B] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add rule
            </button>
          )}
        </Section>

        {/* Writing Samples */}
        <Section title="Writing Samples" description="Paste examples of on-brand writing. The AI uses these for style matching.">
          <div className="space-y-3">
            {brand.writingSamples.map((s, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  readOnly={!isAdmin}
                  value={s}
                  onChange={(e) => update("writingSamples", i, e.target.value)}
                  rows={3}
                  placeholder="Paste a sample paragraph of content that represents your brand voice…"
                  className={`${inputCls} resize-none flex-1 ${!isAdmin ? "bg-[#F5F5F5] cursor-default" : ""}`}
                />
                {isAdmin && (
                  <button type="button" onClick={() => remove("writingSamples", i)} className="text-[#D4D4D4] hover:text-[#2B2B2B] transition-colors self-start mt-2 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button type="button" onClick={() => add("writingSamples")}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#B3B3B3] hover:text-[#2B2B2B] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add sample
            </button>
          )}
        </Section>

        {/* Save — admin only */}
        {isAdmin && (
          <div className="pt-2 flex items-center gap-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-[#2B2B2B] text-white px-5 py-2.5 text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors">
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save guidelines"}
            </button>
            {saved && <span className="text-xs text-[#B3B3B3] tracking-wide">Changes saved successfully</span>}
          </div>
        )}
      </form>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#D4D4D4]">
      <div className="px-5 py-3.5 border-b border-[#D4D4D4] bg-[#F5F5F5]">
        <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">{title}</h2>
        <p className="text-xs text-[#B3B3B3] mt-0.5">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
