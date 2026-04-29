"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/constants";
import type { Channel } from "@/types";

const CHANNELS: Channel[] = ["LINKEDIN", "TWITTER", "EMAIL", "BLOG", "PRESS_RELEASE"];

const inputCls =
  "w-full border border-[#D4D4D4] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] placeholder:text-[#B3B3B3] transition-colors";

export default function NewDraftPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();

  const [form, setForm] = useState({ title: "", channel: "LINKEDIN" as Channel, audience: "", topic: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/${workspaceId}/drafts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/${workspaceId}/drafts/${data.draft.id}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Generation failed. Make sure your brand is configured and your API key is valid.");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <Link href={`/${workspaceId}/drafts`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#B3B3B3] hover:text-[#2B2B2B] mb-8 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Drafts
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">New Draft</h1>
        <p className="text-sm text-[#B3B3B3] mt-1">Fill in the brief — AI generates content and scores brand compliance automatically.</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-0 border border-[#D4D4D4]">
        {error && (
          <div className="text-sm text-[#2B2B2B] bg-[#F5F5F5] border-b border-[#D4D4D4] px-4 py-3">
            {error}
          </div>
        )}

        <div className="px-5 py-4 border-b border-[#D4D4D4]">
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-2">Draft Title</label>
          <input required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Q4 LinkedIn Post: AI in Construction"
            className={inputCls} />
        </div>

        <div className="px-5 py-4 border-b border-[#D4D4D4]">
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-3">Channel</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button key={c} type="button"
                onClick={() => setForm({ ...form, channel: c })}
                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  form.channel === c
                    ? "bg-[#2B2B2B] text-white border-[#2B2B2B]"
                    : "bg-white text-[#B3B3B3] border-[#D4D4D4] hover:border-[#2B2B2B] hover:text-[#2B2B2B]"
                }`}>
                {CHANNEL_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-[#D4D4D4]">
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-2">Target Audience</label>
          <input required value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            placeholder="e.g. Construction project managers and site supervisors"
            className={inputCls} />
        </div>

        <div className="px-5 py-4">
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-2">Topic / Brief</label>
          <textarea required value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            rows={4} placeholder="e.g. How AI reduces costly rework on large construction sites by up to 40%"
            className={`${inputCls} resize-none`} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-[#2B2B2B] text-white py-3.5 text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Generating…" : "Generate draft"}
        </button>
      </form>

      {loading && (
        <p className="text-[11px] text-center text-[#B3B3B3] mt-4 tracking-wide">
          AI is generating and scoring your content — this takes 10–20 seconds.
        </p>
      )}
    </div>
  );
}
