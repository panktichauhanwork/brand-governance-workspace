import type { DraftStatus } from "@/types";

export const CHANNEL_LABELS: Record<string, string> = {
  LINKEDIN:      "LinkedIn",
  TWITTER:       "Twitter/X",
  EMAIL:         "Email",
  BLOG:          "Blog",
  PRESS_RELEASE: "Press Release",
};

export const STATUS_CONFIG: Record<DraftStatus, { label: string; badge: string; dot: string }> = {
  DRAFT:              { label: "Draft",          badge: "border border-[#D4D4D4] text-[#B3B3B3]",                             dot: "bg-[#D4D4D4]" },
  IN_REVIEW:          { label: "In Review",      badge: "bg-[#FEF8EC] text-[#92600A] border border-[#E8D08A]",               dot: "bg-[#92600A]" },
  APPROVED:           { label: "Approved",       badge: "bg-[#EDF7F1] text-[#1A6B3A] border border-[#A8D8B8]",               dot: "bg-[#1A6B3A]" },
  REJECTED:           { label: "Rejected",       badge: "bg-[#FDF0F0] text-[#8B1A1A] border border-[#D8AAAA]",               dot: "bg-[#8B1A1A]" },
  REVISION_REQUESTED: { label: "Needs Revision", badge: "bg-[#FEF5ED] text-[#8B3A0A] border border-[#E0B88A]",               dot: "bg-[#8B3A0A]" },
};
