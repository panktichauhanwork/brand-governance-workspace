import { NextRequest } from "next/server";
import { db, resolveWorkspaceId } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateContent, evaluateContent } from "@/lib/ai";
import { ok, err, withAuth } from "@/lib/api";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const schema = z.object({
  title: z.string().min(1),
  channel: z.enum(["LINKEDIN", "TWITTER", "EMAIL", "BLOG", "PRESS_RELEASE"]),
  audience: z.string().min(1),
  topic: z.string().min(1),
});

type Params = { params: Promise<{ workspaceId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId: slugOrId } = await params;

  return withAuth(async (userId) => {
    const workspaceId = await resolveWorkspaceId(slugOrId);
    if (!workspaceId) return err("Workspace not found", 404);

    await requireRole(userId, workspaceId, ["ADMIN", "CLIENT"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid input: " + parsed.error.message, 400);

    const { title, channel, audience, topic } = parsed.data;

    const brandRow = await db.brand.findUnique({ where: { workspaceId } });
    if (!brandRow) return err("Brand not configured for this workspace", 400);

    const brand = {
      tone: brandRow.tone,
      dos: JSON.parse(brandRow.dos) as string[],
      donts: JSON.parse(brandRow.donts) as string[],
      writingSamples: JSON.parse(brandRow.writingSamples) as string[],
    };

    let content: string;
    try {
      content = await generateContent({ channel, audience, topic, brand });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("insufficient_quota")) {
        return err("AI service quota exceeded. Please check your OpenAI billing at platform.openai.com.", 503);
      }
      throw e;
    }

    const { draft, version } = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const draft = await tx.draft.create({
        data: { workspaceId, title, channel, audience, topic, status: "DRAFT", currentVersionNumber: 1, createdById: userId },
      });
      const version = await tx.draftVersion.create({
        data: { draftId: draft.id, versionNumber: 1, content, createdById: userId },
      });
      return { draft, version };
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

    await logAudit({ workspaceId, userId, action: "DRAFT_CREATED", entityType: "DRAFT", entityId: draft.id, metadata: { title, channel, versionNumber: 1 } });

    return ok({ draft, version: { ...version, complianceScore, complianceJson } }, 201);
  });
}
