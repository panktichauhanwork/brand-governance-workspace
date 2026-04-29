import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ok, err, withAuth } from "@/lib/api";

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 25;
  const skip = (page - 1) * limit;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER"]);

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      db.auditLog.count({ where: { workspaceId } }),
    ]);

    return ok({
      logs: logs.map((l) => ({ ...l, metadata: JSON.parse(l.metadata) })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });
}
