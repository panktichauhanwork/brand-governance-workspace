import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateContent, evaluateContent } from "@/lib/ai";
import { ok, err, withAuth } from "@/lib/api";

type Params = { params: Promise<{ workspaceId: string; draftId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId, draftId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "REVIEWER", "CLIENT"]);

    const draft = await db.draft.findFirst({ where: { id: draftId, workspaceId } });
    if (!draft) return err("Draft not found", 404);

    const versions = await db.draftVersion.findMany({ where: { draftId }, orderBy: { versionNumber: "asc" } });

    type DraftVersion = typeof versions[number];

    return ok(versions.map((v: DraftVersion) => ({
      ...v,
      complianceJson: v.complianceJson ? JSON.parse(v.complianceJson) : null,
    })));
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId, draftId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "CLIENT"]);

    const draft = await db.draft.findFirst({ where: { id: draftId, workspaceId } });
    if (!draft) return err("Draft not found", 404);

    if (!["DRAFT", "REVISION_REQUESTED"].includes(draft.status)) {
      return err("Draft cannot be regenerated in its current status", 400);
    }

    const brandRow = await db.brand.findUnique({ where: { workspaceId } });
    if (!brandRow) return err("Brand not configured", 400);

    const brand = {
      tone: brandRow.tone,
      dos: JSON.parse(brandRow.dos) as string[],
      donts: JSON.parse(brandRow.donts) as string[],
      writingSamples: JSON.parse(brandRow.writingSamples) as string[],
    };

    const content = await generateContent({ channel: draft.channel, audience: draft.audience, topic: draft.topic, brand });
    const nextVersion = draft.currentVersionNumber + 1;

    const version = await db.$transaction(async (tx) => {
      const version = await tx.draftVersion.create({ data: { draftId, versionNumber: nextVersion, content, createdById: userId } });
      await tx.draft.update({ where: { id: draftId }, data: { currentVersionNumber: nextVersion, status: "DRAFT" } });
      return version;
    });

    let complianceScore: number | null = null;
    let complianceJson: string | null = null;
    try {
      const evaluation = await evaluateContent(content, brand);
      complianceScore = evaluation.score;
      complianceJson = JSON.stringify(evaluation);
      await db.draftVersion.update({ where: { id: version.id }, data: { complianceScore, complianceJson } });
    } catch (e) {
      console.error("Compliance evaluation failed (non-fatal):", e);
    }

    await logAudit({ workspaceId, userId, action: "DRAFT_REGENERATED", entityType: "DRAFT", entityId: draftId, metadata: { versionNumber: nextVersion } });

    return ok({ ...version, complianceScore, complianceJson }, 201);
  });
}
