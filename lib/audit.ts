import { db } from "@/lib/db";
import type { AuditAction, EntityType } from "@/types";

export type { AuditAction, EntityType };

export async function logAudit(params: {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: JSON.stringify(params.metadata ?? {}),
    },
  });
}
