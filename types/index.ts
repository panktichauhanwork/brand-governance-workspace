export type Role = "ADMIN" | "REVIEWER" | "CLIENT";

export type DraftStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";

export type Channel =
  | "LINKEDIN"
  | "TWITTER"
  | "EMAIL"
  | "BLOG"
  | "PRESS_RELEASE";

export type AuditAction =
  | "DRAFT_CREATED"
  | "DRAFT_REGENERATED"
  | "DRAFT_SUBMITTED"
  | "DRAFT_APPROVED"
  | "DRAFT_REJECTED"
  | "DRAFT_REVISION_REQUESTED"
  | "BRAND_UPDATED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "MEMBER_RESTORED";

export type EntityType = "DRAFT" | "BRAND" | "MEMBERSHIP";

export interface ComplianceJson {
  score: number;
  tone_match: string;
  violations: string[];
  suggestions: string[];
}

export interface DraftVersion {
  id: string;
  versionNumber: number;
  content: string;
  complianceScore: number | null;
  complianceJson: ComplianceJson | null;
  createdAt: string;
}

export interface Draft {
  id: string;
  title: string;
  channel: Channel;
  audience: string;
  topic: string;
  status: DraftStatus;
  currentVersionNumber: number;
  reviewNote: string | null;
  versions: DraftVersion[];
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  membershipId: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: Role;
}
