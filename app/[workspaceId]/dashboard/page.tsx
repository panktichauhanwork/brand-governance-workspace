import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, CheckCircle, Clock, XCircle, Plus, ArrowRight } from "lucide-react";
import { CHANNEL_LABELS, STATUS_CONFIG } from "@/lib/constants";
import type { DraftStatus } from "@/types";

type Props = { params: Promise<{ workspaceId: string }> };

export default async function DashboardPage({ params }: Props) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await db.workspace.findFirst({
    where: { OR: [{ slug: workspaceId }, { id: workspaceId }] },
  });
  if (!workspace) redirect("/");

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: workspace.id } },
  });
  if (!membership) redirect("/");

  const isClient = membership.role === "CLIENT";
  const draftFilter = isClient
    ? { workspaceId: workspace.id, createdById: session.user.id }
    : { workspaceId: workspace.id };

  const [totalDrafts, inReview, approved, needsWork] = await Promise.all([
    db.draft.count({ where: draftFilter }),
    db.draft.count({ where: { ...draftFilter, status: "IN_REVIEW" } }),
    db.draft.count({ where: { ...draftFilter, status: "APPROVED" } }),
    db.draft.count({ where: { ...draftFilter, OR: [{ status: "REJECTED" }, { status: "REVISION_REQUESTED" }] } }),
  ]);

  const recentDrafts = await db.draft.findMany({
    where: draftFilter,
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { complianceScore: true },
      },
    },
  });

  type DraftWithVersion = typeof recentDrafts[number];

  const brand = await db.brand.findUnique({ where: { workspaceId: workspace.id } });
  const canCreate = membership.role === "ADMIN" || membership.role === "CLIENT";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#B3B3B3] mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">{workspace.name}</h1>
        </div>
        {canCreate && (
          <Link href={`/${workspaceId}/drafts/new`}
            className="flex items-center gap-2 bg-[#2B2B2B] text-white px-4 py-2 text-sm font-semibold hover:bg-black transition-colors">
            <Plus className="w-4 h-4" /> New draft
          </Link>
        )}
      </div>

      {/* Brand setup CTA */}
      {!brand && membership.role === "ADMIN" && (
        <div className="mb-8 flex items-center justify-between border border-[#D4D4D4] bg-[#F5F5F5] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#2B2B2B]">Brand not configured</p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">Set up your brand guidelines to enable AI content generation.</p>
          </div>
          <Link href={`/${workspaceId}/brand`}
            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#2B2B2B] underline underline-offset-2">
            Set up now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Drafts", value: totalDrafts, icon: FileText },
          { label: "In Review",    value: inReview,    icon: Clock },
          { label: "Approved",     value: approved,    icon: CheckCircle },
          { label: "Needs Work",   value: needsWork,   icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-[#D4D4D4] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">{label}</span>
              <Icon className="w-4 h-4 text-[#D4D4D4]" />
            </div>
            <p className="text-3xl font-bold text-[#2B2B2B] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent drafts */}
      <div className="border border-[#D4D4D4]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D4D4D4] bg-[#F5F5F5]">
          <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3]">Recent Drafts</h2>
          <Link href={`/${workspaceId}/drafts`} className="text-xs font-semibold text-[#2B2B2B] flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentDrafts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <FileText className="w-8 h-8 text-[#D4D4D4] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#B3B3B3]">No drafts yet</p>
            {canCreate && (
              <Link href={`/${workspaceId}/drafts/new`} className="mt-2 inline-block text-sm text-[#2B2B2B] font-semibold hover:underline">
                Create your first draft →
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#F5F5F5]">
            {recentDrafts.map((draft: DraftWithVersion) => {
              const score = draft.versions[0]?.complianceScore;
              const cfg = STATUS_CONFIG[draft.status as DraftStatus] ?? STATUS_CONFIG.DRAFT;
              return (
                <li key={draft.id}>
                  <Link href={`/${workspaceId}/drafts/${draft.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F5] transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-1.5 shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2B2B2B] truncate group-hover:underline">{draft.title}</p>
                        <p className="text-xs text-[#B3B3B3] mt-0.5">{CHANNEL_LABELS[draft.channel] ?? draft.channel} · {draft.audience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {score != null && (
                        <span className="text-xs font-semibold tabular-nums text-[#2B2B2B] font-mono">{score}/100</span>
                      )}
                      <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
