import { db } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";

// GET /api/workspaces — list all workspaces the current user belongs to (for switcher)
export async function GET() {
  return withAuth(async (userId) => {
    const memberships = await db.membership.findMany({
      where: { userId, deletedAt: null }, // Exclude soft-deleted memberships
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));

    return ok(workspaces);
  });
}
