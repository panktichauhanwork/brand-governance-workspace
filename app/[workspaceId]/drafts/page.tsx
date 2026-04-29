"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useWorkspaceRole } from "@/components/WorkspaceProvider";
import { CHANNEL_LABELS, STATUS_CONFIG } from "@/lib/constants";
import type { DraftStatus } from "@/types";

type Draft = {
  id: string;
  title: string;
  channel: string;
  audience: string;
  status: DraftStatus;
  currentVersionNumber: number;
  updatedAt: string;
  versions: { complianceScore: number | null }[];
};

export default function DraftsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const role = useWorkspaceRole();
  const canCreate = role === "ADMIN" || role === "CLIENT";

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/${workspaceId}/drafts?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setDrafts(data.drafts ?? []);
        setPages(data.pages ?? 1);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, page]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Drafts</h1>
          {!loading && (
            <p className="text-xs text-[#B3B3B3] mt-0.5 tracking-wide">{total} draft{total !== 1 ? "s" : ""}</p>
          )}
        </div>
        {canCreate && (
          <Link href={`/${workspaceId}/drafts/new`}
            className="flex items-center gap-2 bg-[#2B2B2B] text-white px-4 py-2 text-sm font-semibold hover:bg-black transition-colors">
            <Plus className="w-4 h-4" /> New draft
          </Link>
        )}
      </div>

      <div className="border border-[#D4D4D4]">
        {loading ? (
          <div className="p-14 flex justify-center">
            <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="w-8 h-8 text-[#D4D4D4] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#B3B3B3]">No drafts yet</p>
            {canCreate && (
              <Link href={`/${workspaceId}/drafts/new`} className="mt-2 inline-block text-sm text-[#2B2B2B] font-semibold hover:underline">
                Create your first draft →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 px-5 py-3 border-b border-[#D4D4D4] bg-[#F5F5F5]">
              <div className="col-span-5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Title</div>
              <div className="col-span-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Channel</div>
              <div className="col-span-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Score</div>
              <div className="col-span-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Status</div>
              <div className="col-span-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] text-right">Ver.</div>
            </div>

            <ul className="divide-y divide-[#F5F5F5]">
              {drafts.map((draft) => {
                const score = draft.versions[0]?.complianceScore;
                const cfg = STATUS_CONFIG[draft.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <li key={draft.id}>
                    <Link href={`/${workspaceId}/drafts/${draft.id}`}
                      className="grid grid-cols-12 items-center px-5 py-4 hover:bg-[#F5F5F5] transition-colors group">
                      <div className="col-span-5 min-w-0 pr-4">
                        <p className="text-sm font-medium text-[#2B2B2B] truncate group-hover:underline">{draft.title}</p>
                        <p className="text-xs text-[#B3B3B3] mt-0.5 truncate">{draft.audience}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-[#B3B3B3]">{CHANNEL_LABELS[draft.channel] ?? draft.channel}</span>
                      </div>
                      <div className="col-span-2">
                        {score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-[#F5F5F5] h-1">
                              <div className="h-1 bg-[#2B2B2B]" style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-[#2B2B2B] font-mono">{score}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#D4D4D4]">—</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-xs text-[#B3B3B3] font-mono">v{draft.currentVersionNumber}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#D4D4D4]">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs font-semibold text-[#B3B3B3] disabled:opacity-30 hover:text-[#2B2B2B] transition-colors">
                  ← Prev
                </button>
                <span className="text-[10px] text-[#B3B3B3] tracking-wider">Page {page} of {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="text-xs font-semibold text-[#B3B3B3] disabled:opacity-30 hover:text-[#2B2B2B] transition-colors">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
