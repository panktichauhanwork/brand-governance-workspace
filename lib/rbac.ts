import { db } from "@/lib/db";
import type { Role } from "@/types";

export type { Role };

export async function getMembership(userId: string, workspaceId: string) {
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  // Exclude soft-deleted memberships
  if (membership?.deletedAt) return null;
  return membership;
}

export async function requireWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) {
    const error = new Error("Access denied: not a workspace member");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }
  return membership;
}

export async function requireRole(userId: string, workspaceId: string, allowedRoles: Role[]) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (!allowedRoles.includes(membership.role as Role)) {
    const error = new Error(`Access denied: role ${membership.role} not in [${allowedRoles.join(", ")}]`);
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }
  return membership;
}

export function isForbiddenError(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === "FORBIDDEN";
}
