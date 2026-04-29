import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
});

function slugify(name: string) {
  return (
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid input", 400);

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return err("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);

  // Auto-create workspace and assign Admin role
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });

    const workspace = await tx.workspace.create({
      data: { name: `${name}'s Workspace`, slug: slugify(name) },
    });

    await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "ADMIN" },
    });

    return { user, workspace };
  });

  return ok(
    { userId: result.user.id, workspaceId: result.workspace.id, slug: result.workspace.slug },
    201
  );
}
