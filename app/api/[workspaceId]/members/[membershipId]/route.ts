import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { ok, err, withAuth } from "@/lib/api";

type Params = { params: Promise<{ workspaceId: string; membershipId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId, membershipId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN"]);

    const membership = await db.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.workspaceId !== workspaceId) return err("Member not found", 404);

    if (membership.userId === userId) return err("You cannot remove yourself from the workspace", 400);

    // Soft delete: set deletedAt timestamp instead of hard delete
    await db.membership.update({
      where: { id: membershipId },
      data: { deletedAt: new Date() },
    });

    // Log the removal action
    await logAudit({
      workspaceId,
      userId,
      action: "MEMBER_REMOVED",
      entityType: "MEMBERSHIP",
      entityId: membershipId,
      metadata: { targetUserId: membership.userId, role: membership.role },
    });

    return ok({ removed: true });
  });
}
