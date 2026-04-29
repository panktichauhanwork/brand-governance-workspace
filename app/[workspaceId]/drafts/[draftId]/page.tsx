"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Send, CheckCircle, XCircle, MessageSquare, ArrowLeft, GitCompare, Loader2 } from "lucide-react";
import { useWorkspaceRole } from "@/components/WorkspaceProvider";
import { CHANNEL_LABELS, STATUS_CONFIG } from "@/lib/constants";
import type { Draft, DraftStatus } from "@/types";

export default function DraftDetailPage() {
  const { workspaceId, draftId } = useParams<{ workspaceId: string; draftId: string }>();
  const role = useWorkspaceRole();
  const canCreate = role === "ADMIN" || role === "CLIENT";
  const canReview = role === "ADMIN" || role === "REVIEWER";

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [error, setError] = useState("");

  const fetchDraft = async () => {
    const res = await fetch(`/api/${workspaceId}/drafts/${draftId}/review`);
    const data = await res.json();
    if (!res.ok || !data.versions) {
      setError(data.error ?? "Failed to load draft");
      setLoading(false);
      return;
    }
    setDraft(data);
    setSelectedVersion(data.currentVersionNumber ?? 1);
    setLoading(false);
  };

  useEffect(() => { fetchDraft(); }, [draftId, workspaceId]);

  const currentVersion = draft?.versions?.find((v) => v.versionNumber === selectedVersion);

  async function doAction(action: string, reason?: string) {
    setActionLoading(true);
    setError("");
    const res = await fetch(`/api/${workspaceId}/drafts/${draftId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
    });
    if (res.ok) { await fetchDraft(); }
    else { const d = await res.json(); setError(d.error ?? "Action failed"); }
    setActionLoading(false);
  }

  async function regenerate() {
    setActionLoading(true);
    setError("");
    const res = await fetch(`/api/${workspaceId}/drafts/${draftId}/version`, { method: "POST" });
    if (res.ok) { await fetchDraft(); }
    else { const d = await res.json(); setError(d.error ?? "Regeneration failed"); }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-8 text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] max-w-md mx-auto mt-8 px-4 py-3">
        {error || "Draft not found"}
      </div>
    );
  }

  const score = currentVersion?.complianceScore;
  const compliance = currentVersion?.complianceJson;
  const canSubmit = canCreate && ["DRAFT", "REVISION_REQUESTED"].includes(draft.status);
  const canRegenerate = canCreate && ["DRAFT", "REVISION_REQUESTED"].includes(draft.status);
  const cfg = STATUS_CONFIG[draft.status as DraftStatus] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/${workspaceId}/drafts`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#B3B3B3] hover:text-[#2B2B2B] mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Drafts
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#2B2B2B] truncate">{draft.title}</h1>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              {CHANNEL_LABELS[draft.channel] ?? draft.channel} · {draft.audience}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-4 py-3">{error}</div>
      )}

      {draft.reviewNote && (
        <div className="mb-6 border border-[#D4D4D4] bg-[#F5F5F5] px-5 py-4">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1">Reviewer note</p>
          <p className="text-sm text-[#2B2B2B] leading-relaxed">{draft.reviewNote}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main — content + actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Version tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {draft.versions.map((v) => (
              <button key={v.versionNumber} onClick={() => setSelectedVersion(v.versionNumber)}
                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  selectedVersion === v.versionNumber
                    ? "bg-[#2B2B2B] text-white border-[#2B2B2B]"
                    : "bg-white text-[#B3B3B3] border-[#D4D4D4] hover:border-[#2B2B2B] hover:text-[#2B2B2B]"
                }`}>
                v{v.versionNumber}
                {v.versionNumber === draft.currentVersionNumber && " · current"}
                {v.complianceScore != null && ` · ${v.complianceScore}`}
              </button>
            ))}

            {draft.versions.length >= 2 && (
              <Link href={`/${workspaceId}/drafts/${draftId}/compare`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#D4D4D4] text-[#B3B3B3] hover:border-[#2B2B2B] hover:text-[#2B2B2B] transition-colors">
                <GitCompare className="w-3 h-3" /> Compare
              </Link>
            )}
          </div>

          {/* Content */}
          <div className="border border-[#D4D4D4] p-6 bg-white">
            <pre className="text-sm text-[#2B2B2B] whitespace-pre-wrap font-sans leading-relaxed">
              {currentVersion?.content ?? "No content"}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <button onClick={() => doAction("SUBMIT")} disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2B2B] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors">
                <Send className="w-3 h-3" /> Submit for review
              </button>
            )}
            {canRegenerate && (
              <button onClick={regenerate} disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4D4D4] text-[#2B2B2B] text-xs font-semibold hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors">
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {actionLoading ? "Regenerating…" : "Regenerate"}
              </button>
            )}
            {draft.status === "IN_REVIEW" && (
              <>
                <button
                  onClick={() => canReview && doAction("APPROVE")}
                  disabled={!canReview || actionLoading}
                  title={!canReview ? "Only reviewers can approve" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#1A6B3A] text-white text-xs font-semibold hover:bg-[#155530] disabled:opacity-40 transition-colors ${!canReview ? "cursor-not-allowed" : ""}`}>
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => {
                    if (!canReview) return;
                    const reason = prompt("Revision note (required):");
                    if (reason?.trim()) doAction("REQUEST_REVISION", reason.trim());
                  }}
                  disabled={!canReview || actionLoading}
                  title={!canReview ? "Only reviewers can request revisions" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border border-[#92600A] text-[#92600A] text-xs font-semibold hover:bg-[#FEF8EC] disabled:opacity-40 transition-colors ${!canReview ? "cursor-not-allowed" : ""}`}>
                  <MessageSquare className="w-3 h-3" /> Request revision
                </button>
                <button
                  onClick={() => {
                    if (!canReview) return;
                    const reason = prompt("Rejection reason (required):");
                    if (reason?.trim()) doAction("REJECT", reason.trim());
                  }}
                  disabled={!canReview || actionLoading}
                  title={!canReview ? "Only reviewers can reject" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1A1A] text-white text-xs font-semibold hover:bg-[#6F1414] disabled:opacity-40 transition-colors ${!canReview ? "cursor-not-allowed" : ""}`}>
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar — compliance + metadata */}
        <div className="space-y-4">
          <div className="border border-[#D4D4D4] p-5">
            <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-4">Compliance</h2>
            {score == null ? (
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-[#D4D4D4] font-mono">—</p>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-[#D4D4D4] mt-1.5">Score pending</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold tabular-nums text-[#2B2B2B] font-mono">{score}</p>
                  <p className="text-[10px] text-[#B3B3B3] mt-1 tracking-wider uppercase">out of 100</p>
                </div>
                <div className="w-full bg-[#F5F5F5] h-0.5 mb-5">
                  <div className="h-0.5 bg-[#2B2B2B]" style={{ width: `${score}%` }} />
                </div>
                {compliance && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Tone match</p>
                      <p className="text-sm text-[#2B2B2B] mt-0.5">{compliance.tone_match}</p>
                    </div>
                    {compliance.violations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B1A1A] uppercase tracking-wider mb-1.5">
                          Violations ({compliance.violations.length})
                        </p>
                        <ul className="space-y-1">
                          {compliance.violations.map((v, i) => (
                            <li key={i} className="text-xs text-[#2B2B2B] flex gap-1.5">
                              <span className="text-[#8B1A1A] mt-px shrink-0">·</span>
                              <span>{v}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {compliance.suggestions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider mb-1.5">
                          Suggestions ({compliance.suggestions.length})
                        </p>
                        <ul className="space-y-1">
                          {compliance.suggestions.map((s, i) => (
                            <li key={i} className="text-xs text-[#2B2B2B] flex gap-1.5">
                              <span className="text-[#D4D4D4] mt-px shrink-0">·</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border border-[#D4D4D4] p-5 space-y-4">
            <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Brief</h2>
            <div>
              <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Topic</p>
              <p className="text-sm text-[#2B2B2B] mt-0.5 leading-relaxed">{draft.topic}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Versions</p>
              <p className="text-sm text-[#2B2B2B] mt-0.5 font-mono">{draft.versions.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Current</p>
              <p className="text-sm text-[#2B2B2B] mt-0.5 font-mono">v{draft.currentVersionNumber}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
