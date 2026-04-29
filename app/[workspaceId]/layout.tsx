import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import WorkspaceShell from "@/components/WorkspaceShell";
import type { Workspace } from "@/types";

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await db.workspace.findFirst({
    where: { OR: [{ slug: workspaceId }, { id: workspaceId }] },
  });
  if (!workspace) redirect("/");

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: workspace.id } },
  });
  if (!membership || membership.deletedAt) redirect("/");

  const allMemberships = await db.membership.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  type MembershipWithWorkspace = typeof allMemberships[number];

  const currentWorkspace: Workspace = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: membership.role as Workspace["role"],
  };

  const allWorkspaces: Workspace[] = allMemberships.map((m: MembershipWithWorkspace) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role as Workspace["role"],
  }));

  return (
    <WorkspaceProvider role={membership.role}>
      <WorkspaceShell
        currentWorkspace={currentWorkspace}
        allWorkspaces={allWorkspaces}
        userName={session.user.name ?? session.user.email ?? ""}
      >
        {children}
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}
