"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ScrollText, Loader2 } from "lucide-react";
import type { AuditAction } from "@/types";

type AuditLog = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { name: string; email: string };
};

const ACTION_META: Record<AuditAction, { label: string; dot: string }> = {
  DRAFT_CREATED:            { label: "Draft created",        dot: "bg-[#2B2B2B]" },
  DRAFT_REGENERATED:        { label: "Regenerated",          dot: "bg-[#4A3A7A]" },
  DRAFT_SUBMITTED:          { label: "Submitted for review", dot: "bg-[#92600A]" },
  DRAFT_APPROVED:           { label: "Approved",             dot: "bg-[#1A6B3A]" },
  DRAFT_REJECTED:           { label: "Rejected",             dot: "bg-[#8B1A1A]" },
  DRAFT_REVISION_REQUESTED: { label: "Revision requested",   dot: "bg-[#8B3A0A]" },
  BRAND_UPDATED:            { label: "Brand updated",        dot: "bg-[#B3B3B3]" },
  MEMBER_ADDED:             { label: "Member added",         dot: "bg-[#1A5A6B]" },
  MEMBER_REMOVED:           { label: "Member removed",       dot: "bg-[#8B1A1A]" },
  MEMBER_RESTORED:          { label: "Member restored",      dot: "bg-[#1A6B3A]" },
};

export default function AuditLogPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/${workspaceId}/audit?page=${page}`)
      .then(async (r) => {
        if (!r.ok) { setError("Access denied"); return; }
        const data = await r.json();
        setLogs(data.logs ?? []);
        setPages(data.pages ?? 1);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, page]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">Audit Log</h1>
        <p className="text-xs text-[#B3B3B3] mt-0.5 tracking-wide">
          {total > 0 ? `${total} events` : "Append-only record of all workspace actions"}
        </p>
      </div>

      {error && (
        <div className="text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-4 py-3 mb-5">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="border border-[#D4D4D4] p-14 text-center">
          <ScrollText className="w-8 h-8 text-[#D4D4D4] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#2B2B2B]">No events recorded yet</p>
          <p className="text-xs text-[#B3B3B3] mt-1">Actions will appear here as the workspace is used.</p>
        </div>
      ) : (
        <div className="border border-[#D4D4D4]">
          <ul className="divide-y divide-[#F5F5F5]">
            {logs.map((log, i) => {
              const meta = ACTION_META[log.action] ?? { label: log.action, dot: "bg-[#B3B3B3]" };
              const reason = log.metadata?.reason != null ? String(log.metadata.reason) : null;
              const title = log.metadata?.title != null ? String(log.metadata.title) : null;
              const isLast = i === logs.length - 1;

              return (
                <li key={log.id} className="flex gap-5 px-6 py-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center shrink-0 pt-1.5">
                    <div className={`w-1.5 h-1.5 shrink-0 ${meta.dot}`} />
                    {!isLast && <div className="w-px flex-1 bg-[#F5F5F5] mt-1.5" />}
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-[#2B2B2B]">{meta.label}</span>
                        <span className="text-[10px] text-[#B3B3B3] font-mono">
                          {log.entityType.toLowerCase()} · {log.entityId.slice(0, 8)}
                        </span>
                      </div>
                      <time className="text-[10px] text-[#B3B3B3] shrink-0 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </time>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#2B2B2B]">{log.user.name}</span>
                      <span className="text-xs text-[#B3B3B3]">{log.user.email}</span>
                    </div>

                    {title && <p className="text-xs text-[#B3B3B3] mt-1 truncate">{title}</p>}
                    {reason && (
                      <p className="text-xs text-[#2B2B2B] mt-1.5 bg-[#F5F5F5] border border-[#D4D4D4] px-3 py-1.5">
                        &ldquo;{reason}&rdquo;
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-[#D4D4D4]">
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
        </div>
      )}
    </div>
  );
}
