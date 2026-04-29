import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { ok, err, withAuth } from "@/lib/api";
import { z } from "zod";

type Params = { params: Promise<{ workspaceId: string }> };

const addSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "REVIEWER", "CLIENT"]),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER", "CLIENT"]);

    const members = await db.membership.findMany({
      where: { workspaceId, deletedAt: null }, // Only fetch non-deleted members
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return ok(members.map((m) => ({ ...m.user, role: m.role, membershipId: m.id })));
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400);

    const { email, role } = parsed.data;

    const targetUser = await db.user.findUnique({ where: { email } });
    if (!targetUser) return err("User not found. They must register first.", 404);

    const existing = await db.membership.findUnique({
      where: { userId_workspaceId: { userId: targetUser.id, workspaceId } },
    });
    
    // If user was soft-deleted, restore them instead of creating new membership
    if (existing) {
      if (existing.deletedAt) {
        await db.membership.update({
          where: { id: existing.id },
          data: { deletedAt: null, role }, // Restore and update role
        });
        await logAudit({ workspaceId, userId, action: "MEMBER_RESTORED", entityType: "MEMBERSHIP", entityId: existing.id, metadata: { targetEmail: email, role } });
        return ok({ ...targetUser, role, membershipId: existing.id }, 200);
      }
      return err("User is already a member of this workspace", 409);
    }

    const membership = await db.membership.create({ data: { userId: targetUser.id, workspaceId, role } });

    await logAudit({ workspaceId, userId, action: "MEMBER_ADDED", entityType: "MEMBERSHIP", entityId: membership.id, metadata: { targetEmail: email, role } });

    return ok({ ...targetUser, role, membershipId: membership.id }, 201);
  });
}
