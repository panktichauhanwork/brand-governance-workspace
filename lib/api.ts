import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isForbiddenError } from "@/lib/rbac";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Wraps a route handler: checks auth, catches forbidden/validation errors
export async function withAuth(
  handler: (userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorized", 401);

  try {
    return await handler(session.user.id);
  } catch (e) {
    if (isForbiddenError(e)) return err((e as Error).message, 403);
    console.error(e);
    return err("Internal server error", 500);
  }
}
