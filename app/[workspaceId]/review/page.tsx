"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, MessageSquare, Eye, ClipboardCheck, Loader2 } from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/constants";
import type { DraftStatus } from "@/types";

type Draft = {
  id: string;
  title: string;
  channel: string;
  audience: string;
  topic: string;
  currentVersionNumber: number;
  updatedAt: string;
  versions: { complianceScore: number | null }[];
};

export default function ReviewPanel() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchDrafts = async () => {
    const res = await fetch(`/api/${workspaceId}/drafts`);
    const data = await res.json();
    setDrafts((data.drafts ?? []).filter((d: Draft & { status: DraftStatus }) => d.status === "IN_REVIEW"));
    setLoading(false);
  };

  useEffect(() => { fetchDrafts(); }, [workspaceId]);

  async function doReview(draftId: string, action: "APPROVE" | "REJECT" | "REQUEST_REVISION") {
    let reason: string | null = null;
    if (action !== "APPROVE") {
      reason = prompt(`${action === "REJECT" ? "Rejection" : "Revision"} reason (required):`);
      if (!reason?.trim()) return;
    }
    setActionLoading(draftId + action);
    setError("");
    const res = await fetch(`/api/${workspaceId}/drafts/${draftId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
    });
    if (res.ok) { await fetchDrafts(); }
    else { const d = await res.json(); setError(d.error ?? "Action failed"); }
    setActionLoading(null);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">Review Panel</h1>
        <p className="text-xs text-[#B3B3B3] mt-0.5 tracking-wide">Drafts awaiting your decision</p>
      </div>

      {error && (
        <div className="mb-5 text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="border border-[#D4D4D4] p-14 text-center">
          <ClipboardCheck className="w-8 h-8 text-[#D4D4D4] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#2B2B2B]">All clear</p>
          <p className="text-xs text-[#B3B3B3] mt-1">No drafts pending review.</p>
        </div>
      ) : (
        <div className="border border-[#D4D4D4] divide-y divide-[#F5F5F5]">
          {drafts.map((draft) => {
            const score = draft.versions[0]?.complianceScore;
            const isActing = actionLoading?.startsWith(draft.id);

            return (
              <div key={draft.id} className="p-5">
                <div className="flex items-start gap-5">
                  {/* Score */}
                  <div className="shrink-0 text-center w-14">
                    {score != null ? (
                      <>
                        <p className="text-2xl font-bold tabular-nums text-[#2B2B2B] font-mono">{score}</p>
                        <p className="text-[9px] font-semibold tracking-wider uppercase text-[#B3B3B3]">score</p>
                        <div className="w-full h-0.5 bg-[#F5F5F5] mt-1.5">
                          <div className="h-0.5 bg-[#2B2B2B]" style={{ width: `${score}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-[#D4D4D4]">—</p>
                        <p className="text-[9px] font-semibold tracking-wider uppercase text-[#D4D4D4]">score</p>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#2B2B2B]">{draft.title}</h3>
                    <p className="text-xs text-[#B3B3B3] mt-0.5">
                      {CHANNEL_LABELS[draft.channel] ?? draft.channel} · v{draft.currentVersionNumber} · {draft.audience}
                    </p>

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Link href={`/${workspaceId}/drafts/${draft.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4D4D4] text-[#2B2B2B] text-xs font-semibold hover:bg-[#F5F5F5] transition-colors">
                        <Eye className="w-3 h-3" /> View
                      </Link>
                      <button onClick={() => doReview(draft.id, "APPROVE")} disabled={!!isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A6B3A] text-white text-xs font-semibold hover:bg-[#155530] disabled:opacity-40 transition-colors">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => doReview(draft.id, "REQUEST_REVISION")} disabled={!!isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#92600A] text-[#92600A] text-xs font-semibold hover:bg-[#FEF8EC] disabled:opacity-40 transition-colors">
                        <MessageSquare className="w-3 h-3" /> Revise
                      </button>
                      <button onClick={() => doReview(draft.id, "REJECT")} disabled={!!isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1A1A] text-white text-xs font-semibold hover:bg-[#6F1414] disabled:opacity-40 transition-colors">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
