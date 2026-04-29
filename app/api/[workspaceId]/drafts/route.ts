import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ok, err, withAuth } from "@/lib/api";

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    const membership = await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER", "CLIENT"]);

    const where =
      membership.role === "CLIENT"
        ? { workspaceId, createdById: userId }
        : { workspaceId };

    const [drafts, total] = await Promise.all([
      db.draft.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { complianceScore: true, versionNumber: true },
          },
        },
      }),
      db.draft.count({ where }),
    ]);

    return ok({ drafts, total, page, pages: Math.ceil(total / limit) });
  });
}
