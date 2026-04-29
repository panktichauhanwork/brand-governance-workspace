import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { ok, err, withAuth } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  tone: z.string().min(1),
  dos: z.array(z.string()).min(1),
  donts: z.array(z.string()).min(1),
  writingSamples: z.array(z.string()),
});

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;
  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER", "CLIENT"]);

    const brand = await db.brand.findUnique({ where: { workspaceId } });
    if (!brand) return ok(null);

    return ok({
      ...brand,
      dos: JSON.parse(brand.dos),
      donts: JSON.parse(brand.donts),
      writingSamples: JSON.parse(brand.writingSamples),
    });
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;
  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400);

    const { tone, dos, donts, writingSamples } = parsed.data;

    const brand = await db.brand.upsert({
      where: { workspaceId },
      update: { tone, dos: JSON.stringify(dos), donts: JSON.stringify(donts), writingSamples: JSON.stringify(writingSamples) },
      create: { workspaceId, tone, dos: JSON.stringify(dos), donts: JSON.stringify(donts), writingSamples: JSON.stringify(writingSamples) },
    });

    await logAudit({ workspaceId, userId, action: "BRAND_UPDATED", entityType: "BRAND", entityId: brand.id, metadata: { tone } });

    return ok({
      ...brand,
      dos: JSON.parse(brand.dos),
      donts: JSON.parse(brand.donts),
      writingSamples: JSON.parse(brand.writingSamples),
    });
  });
}
