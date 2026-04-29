"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitCompare, Loader2 } from "lucide-react";

type Version = {
  id: string;
  versionNumber: number;
  content: string;
  complianceScore: number | null;
  complianceJson: {
    score: number;
    tone_match: string;
    violations: string[];
    suggestions: string[];
  } | null;
  createdAt: string;
};

const selectCls =
  "border border-[#D4D4D4] px-3 py-1.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] transition-colors";

export default function ComparePage() {
  const { workspaceId, draftId } = useParams<{ workspaceId: string; draftId: string }>();
  const searchParams = useSearchParams();

  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftNum, setLeftNum] = useState<number>(1);
  const [rightNum, setRightNum] = useState<number>(2);

  useEffect(() => {
    fetch(`/api/${workspaceId}/drafts/${draftId}/version`)
      .then((r) => r.json())
      .then((data: Version[]) => {
        setVersions(data);
        const v1 = parseInt(searchParams.get("v1") ?? "1", 10);
        const v2 = parseInt(searchParams.get("v2") ?? String(data.length), 10);
        setLeftNum(v1);
        setRightNum(v2);
      })
      .finally(() => setLoading(false));
  }, [draftId, workspaceId, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 text-[#D4D4D4] animate-spin" />
      </div>
    );
  }

  if (versions.length < 2) {
    return (
      <div className="p-8 max-w-md mx-auto text-center mt-16">
        <GitCompare className="w-10 h-10 text-[#D4D4D4] mx-auto mb-4" />
        <h2 className="text-base font-bold text-[#2B2B2B] mb-1">Nothing to compare yet</h2>
        <p className="text-sm text-[#B3B3B3] mb-6">
          This draft only has one version. Regenerate to create a second version.
        </p>
        <Link href={`/${workspaceId}/drafts/${draftId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#B3B3B3] hover:text-[#2B2B2B] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to draft
        </Link>
      </div>
    );
  }

  const left = versions.find((v) => v.versionNumber === leftNum);
  const right = versions.find((v) => v.versionNumber === rightNum);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/${workspaceId}/drafts/${draftId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#B3B3B3] hover:text-[#2B2B2B] mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to draft
        </Link>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Version Comparison</h1>

          {/* Version selectors */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Left</label>
              <select value={leftNum} onChange={(e) => setLeftNum(parseInt(e.target.value, 10))} className={selectCls}>
                {versions.map((v) => (
                  <option key={v.versionNumber} value={v.versionNumber}>v{v.versionNumber}</option>
                ))}
              </select>
            </div>
            <span className="text-[#D4D4D4] text-xs font-semibold">vs</span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Right</label>
              <select value={rightNum} onChange={(e) => setRightNum(parseInt(e.target.value, 10))} className={selectCls}>
                {versions.map((v) => (
                  <option key={v.versionNumber} value={v.versionNumber}>v{v.versionNumber}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side columns */}
      <div className="grid grid-cols-2 gap-5">
        {[
          { version: left, num: leftNum },
          { version: right, num: rightNum },
        ].map(({ version, num }) => {
          const s = version?.complianceScore;
          return (
            <div key={num} className="space-y-4">
              {/* Score header */}
              <div className="border border-[#D4D4D4] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2B2B]">Version {num}</p>
                  {version && (
                    <p className="text-[10px] text-[#B3B3B3] mt-0.5 font-mono">
                      {new Date(version.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                {s != null ? (
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-[#F5F5F5] h-0.5">
                      <div className="h-0.5 bg-[#2B2B2B]" style={{ width: `${s}%` }} />
                    </div>
                    <span className="text-sm font-bold tabular-nums text-[#2B2B2B] font-mono">{s}/100</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#D4D4D4]">No score</span>
                )}
              </div>

              {/* Content */}
              <div className="border border-[#D4D4D4] p-6 min-h-64 bg-white">
                {version ? (
                  <pre className="text-sm text-[#2B2B2B] whitespace-pre-wrap font-sans leading-relaxed">
                    {version.content}
                  </pre>
                ) : (
                  <p className="text-sm text-[#D4D4D4] italic">Version not found</p>
                )}
              </div>

              {/* Compliance detail */}
              {version?.complianceJson && (
                <div className="border border-[#D4D4D4] p-5 space-y-3">
                  <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Compliance Detail</p>

                  <div>
                    <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider">Tone match</p>
                    <p className="text-sm text-[#2B2B2B] mt-0.5">{version.complianceJson.tone_match}</p>
                  </div>

                  {version.complianceJson.violations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#2B2B2B] uppercase tracking-wider mb-1.5">
                        Violations ({version.complianceJson.violations.length})
                      </p>
                      <ul className="space-y-1">
                        {version.complianceJson.violations.map((v, i) => (
                          <li key={i} className="text-xs text-[#2B2B2B] flex gap-1.5">
                            <span className="text-[#B3B3B3] shrink-0">·</span>
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {version.complianceJson.suggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wider mb-1.5">
                        Suggestions ({version.complianceJson.suggestions.length})
                      </p>
                      <ul className="space-y-1">
                        {version.complianceJson.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-[#2B2B2B] flex gap-1.5">
                            <span className="text-[#D4D4D4] shrink-0">·</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
