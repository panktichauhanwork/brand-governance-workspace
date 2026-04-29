import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// URL params can be either a slug or a cuid — resolve to actual workspace ID
export async function resolveWorkspaceId(slugOrId: string): Promise<string | null> {
  const workspace = await db.workspace.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true },
  });
  return workspace?.id ?? null;
}
