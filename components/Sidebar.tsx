"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Palette, FileText, ClipboardCheck,
  ScrollText, Users, LogOut, ChevronDown, X,
} from "lucide-react";
import { useState } from "react";
import type { Role, Workspace } from "@/types";

type Props = {
  currentWorkspace: Workspace;
  allWorkspaces: Workspace[];
  userName: string;
  onClose?: () => void;
};

const ALL_NAV = (slug: string) => [
  { href: `/${slug}/dashboard`, label: "Dashboard",   icon: LayoutDashboard, roles: ["ADMIN", "REVIEWER", "CLIENT"] as Role[] },
  { href: `/${slug}/brand`,     label: "Brand Setup",  icon: Palette,         roles: ["ADMIN", "REVIEWER", "CLIENT"] as Role[] },
  { href: `/${slug}/drafts`,    label: "Drafts",       icon: FileText,        roles: ["ADMIN", "REVIEWER", "CLIENT"] as Role[] },
  { href: `/${slug}/review`,    label: "Review",       icon: ClipboardCheck,  roles: ["ADMIN", "REVIEWER"]           as Role[] },
  { href: `/${slug}/audit`,     label: "Audit Log",    icon: ScrollText,      roles: ["ADMIN", "REVIEWER"]           as Role[] },
  { href: `/${slug}/settings`,  label: "Members",      icon: Users,           roles: ["ADMIN"]                       as Role[] },
];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  REVIEWER: "Reviewer",
  CLIENT: "Client",
};

export default function Sidebar({ currentWorkspace, allWorkspaces, userName, onClose }: Props) {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const role = currentWorkspace.role as Role;
  const navItems = ALL_NAV(currentWorkspace.slug).filter((item) => item.roles.includes(role));

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="w-52 h-screen flex flex-col bg-[#2B2B2B]">
      {/* Logo + mobile close */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#B3B3B3] uppercase mb-1">Workspace</p>
          <p className="text-sm font-semibold text-white leading-tight truncate">{currentWorkspace.name}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="md:hidden ml-2 shrink-0 text-[#B3B3B3] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Workspace switcher */}
      {allWorkspaces.length > 1 && (
        <div className="relative border-b border-white/10">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-[#B3B3B3] hover:text-white transition-colors"
          >
            <span className="text-xs font-medium">Switch workspace</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>
          {switcherOpen && (
            <div className="absolute top-full left-0 w-full bg-[#1E1E1E] border border-white/10 z-50">
              {allWorkspaces
                .filter((w) => w.slug !== currentWorkspace.slug)
                .map((w) => (
                  <Link
                    key={w.id}
                    href={`/${w.slug}/dashboard`}
                    onClick={() => { setSwitcherOpen(false); onClose?.(); }}
                    className="flex items-center justify-between px-5 py-2.5 text-xs text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] ml-2 shrink-0">{ROLE_LABELS[w.role as Role]}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-[#2B2B2B]"
                  : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 bg-white flex items-center justify-center text-[10px] font-bold text-[#2B2B2B] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate leading-tight">{userName}</p>
            <p className="text-[10px] text-[#B3B3B3] tracking-wide">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-xs text-[#B3B3B3] hover:text-red-500 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
