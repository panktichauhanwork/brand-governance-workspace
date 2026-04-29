import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit, AuditAction } from "@/lib/audit";
import { ok, err, withAuth } from "@/lib/api";
import { z } from "zod";

type Params = { params: Promise<{ workspaceId: string; draftId: string }> };

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_REVISION"]),
  reason: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId, draftId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER", "CLIENT"]);

    const draft = await db.draft.findFirst({
      where: { id: draftId, workspaceId },
      include: { versions: { orderBy: { versionNumber: "asc" } } },
    });

    if (!draft) return err("Draft not found", 404);

    type DraftVersion = typeof draft.versions[number];

    return ok({
      ...draft,
      versions: draft.versions.map((v: DraftVersion) => ({
        ...v,
        complianceJson: v.complianceJson ? JSON.parse(v.complianceJson) : null,
      })),
    });
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId, draftId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    const body = await req.json().catch(() => null);

    if (body?.action === "SUBMIT") {
      await requireRole(userId, workspaceId, ["ADMIN", "CLIENT"]);

      const draft = await db.draft.findFirst({ where: { id: draftId, workspaceId } });
      if (!draft) return err("Draft not found", 404);
      if (!["DRAFT", "REVISION_REQUESTED"].includes(draft.status)) {
        return err("Draft is not in a submittable state", 400);
      }

      await db.draft.update({ where: { id: draftId }, data: { status: "IN_REVIEW", reviewNote: null } });
      await logAudit({ workspaceId, userId, action: "DRAFT_SUBMITTED", entityType: "DRAFT", entityId: draftId, metadata: {} });

      return ok({ status: "IN_REVIEW" });
    }

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER"]);

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return err("Invalid action", 400);

    const { action, reason } = parsed.data;

    const draft = await db.draft.findFirst({ where: { id: draftId, workspaceId } });
    if (!draft) return err("Draft not found", 404);
    if (draft.status !== "IN_REVIEW") return err("Draft is not in review", 400);

    if ((action === "REJECT" || action === "REQUEST_REVISION") && !reason?.trim()) {
      return err("A reason is required for rejection or revision request", 400);
    }

    const statusMap: Record<string, string> = { APPROVE: "APPROVED", REJECT: "REJECTED", REQUEST_REVISION: "REVISION_REQUESTED" };
    const auditMap: Record<string, AuditAction> = { APPROVE: "DRAFT_APPROVED", REJECT: "DRAFT_REJECTED", REQUEST_REVISION: "DRAFT_REVISION_REQUESTED" };

    await db.draft.update({ where: { id: draftId }, data: { status: statusMap[action], reviewNote: reason ?? null } });
    await logAudit({ workspaceId, userId, action: auditMap[action], entityType: "DRAFT", entityId: draftId, metadata: { reason: reason ?? null } });

    return ok({ status: statusMap[action] });
  });
}
