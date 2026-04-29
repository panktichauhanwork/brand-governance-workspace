import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Users ────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", name: "Alice Admin", passwordHash: hash("password123") },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@demo.com" },
    update: {},
    create: { email: "reviewer@demo.com", name: "Bob Reviewer", passwordHash: hash("password123") },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@demo.com" },
    update: {},
    create: { email: "client@demo.com", name: "Carol Client", passwordHash: hash("password123") },
  });

  // ─── Workspace ────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: "edifice-demo" },
    update: {},
    create: { name: "EdificePowerAI Demo", slug: "edifice-demo" },
  });

  // ─── Memberships ──────────────────────────────────────────────────────────
  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: admin.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: admin.id, workspaceId: workspace.id, role: "ADMIN" },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: reviewer.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: reviewer.id, workspaceId: workspace.id, role: "REVIEWER" },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: client.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: client.id, workspaceId: workspace.id, role: "CLIENT" },
  });

  // ─── Brand ────────────────────────────────────────────────────────────────
  await prisma.brand.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      tone: "Professional, forward-thinking, concise. Confident but not arrogant. Use active voice.",
      dos: JSON.stringify([
        "Lead with value and outcomes",
        "Use data and specifics when possible",
        "Keep sentences under 20 words",
        "Use industry-standard terminology",
        "Address the reader directly using 'you'",
      ]),
      donts: JSON.stringify([
        "Use jargon or buzzwords like 'synergy' or 'disruptive'",
        "Use passive voice",
        "Make unsubstantiated claims",
        "Use exclamation marks excessively",
        "Write paragraphs longer than 3 sentences",
      ]),
      writingSamples: JSON.stringify([
        "EdificePowerAI helps construction teams reduce rework by 40% through real-time AI-driven quality checks. No paperwork. No delays. Just accurate data when your team needs it.",
        "Your project timeline matters. Our platform integrates with your existing workflows to flag risks before they become delays — giving your team the clarity to act fast.",
      ]),
    },
  });

  // ─── Draft 1: approved ────────────────────────────────────────────────────
  const existingDraft1 = await prisma.draft.findFirst({
    where: { workspaceId: workspace.id, title: "Q4 LinkedIn Campaign: AI in Construction" },
  });

  let draft1 = existingDraft1;
  if (!draft1) {
    draft1 = await prisma.draft.create({
      data: {
        workspaceId: workspace.id,
        title: "Q4 LinkedIn Campaign: AI in Construction",
        channel: "LINKEDIN",
        audience: "Construction project managers and site supervisors",
        topic: "How AI reduces rework on large construction sites",
        status: "APPROVED",
        currentVersionNumber: 1,
        createdById: client.id,
      },
    });

    await prisma.draftVersion.create({
      data: {
        draftId: draft1.id,
        versionNumber: 1,
        content: `Construction rework costs the industry $625 billion annually. Your site doesn't have to contribute to that number.\n\nEdificePowerAI's real-time quality checks catch errors before they become costly fixes. Your team gets accurate data at the point of work — not after the fact.\n\nThe result: 40% less rework. Projects that finish on time. Budgets that stay intact.\n\nReady to see it in action? Drop a comment or DM me to book a 20-minute walkthrough.`,
        complianceScore: 91,
        complianceJson: JSON.stringify({
          score: 91,
          tone_match: "Excellent",
          violations: [],
          suggestions: ["Consider adding a specific customer success story in future posts"],
        }),
        createdById: client.id,
      },
    });

    await prisma.auditLog.createMany({
      data: [
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_CREATED", entityType: "DRAFT", entityId: draft1.id, metadata: JSON.stringify({ title: draft1.title }) },
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_SUBMITTED", entityType: "DRAFT", entityId: draft1.id, metadata: "{}" },
        { workspaceId: workspace.id, userId: reviewer.id, action: "DRAFT_APPROVED", entityType: "DRAFT", entityId: draft1.id, metadata: "{}" },
      ],
    });
  }

  // ─── Draft 2: in_review with 2 versions ───────────────────────────────────
  const existingDraft2 = await prisma.draft.findFirst({
    where: { workspaceId: workspace.id, title: "Email Campaign: Project Risk Management" },
  });

  if (!existingDraft2) {
    const draft2 = await prisma.draft.create({
      data: {
        workspaceId: workspace.id,
        title: "Email Campaign: Project Risk Management",
        channel: "EMAIL",
        audience: "C-suite executives in mid-size construction firms",
        topic: "Proactive risk identification using AI",
        status: "IN_REVIEW",
        currentVersionNumber: 2,
        createdById: client.id,
      },
    });

    await prisma.draftVersion.create({
      data: {
        draftId: draft2.id,
        versionNumber: 1,
        content: `Subject: Stop reacting to risks. Start predicting them.\n\nDear [Name],\n\nMost construction teams discover risks when it's already too late to avoid them. The result is delays, cost overruns, and frustrated stakeholders.\n\nEdificePowerAI changes that. Our AI analyzes your project data continuously — flagging risks weeks before they surface. Your team can act proactively, not reactively.\n\nI'd love to show you how three firms similar to yours reduced unexpected costs by 35% in their first quarter using our platform.\n\nAre you available for a brief call next week?\n\nBest regards,\nThe EdificePowerAI Team`,
        complianceScore: 74,
        complianceJson: JSON.stringify({
          score: 74,
          tone_match: "Good",
          violations: ["Opening uses passive construction ('discover risks')"],
          suggestions: ["Start with a stronger active statement", "Add specific data point in opening"],
        }),
        createdById: client.id,
      },
    });

    await prisma.draftVersion.create({
      data: {
        draftId: draft2.id,
        versionNumber: 2,
        content: `Subject: Your next project risk is already visible — are you?\n\nDear [Name],\n\nYour competitors identify risks weeks before they occur. You can too.\n\nEdificePowerAI continuously analyzes project data and flags emerging risks before they become delays or cost overruns. Three firms your size reduced unexpected costs by 35% in their first quarter.\n\nYou get clear risk visibility. Your team acts before problems arrive. Your stakeholders see consistent delivery.\n\nBook a 20-minute call to see your project data through a different lens.\n\nBest regards,\nThe EdificePowerAI Team`,
        complianceScore: 88,
        complianceJson: JSON.stringify({
          score: 88,
          tone_match: "Excellent",
          violations: [],
          suggestions: ["Consider personalizing the subject line with recipient's company name"],
        }),
        createdById: client.id,
      },
    });

    await prisma.auditLog.createMany({
      data: [
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_CREATED", entityType: "DRAFT", entityId: draft2.id, metadata: JSON.stringify({ title: "Email Campaign: Project Risk Management" }) },
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_SUBMITTED", entityType: "DRAFT", entityId: draft2.id, metadata: "{}" },
        { workspaceId: workspace.id, userId: reviewer.id, action: "DRAFT_REVISION_REQUESTED", entityType: "DRAFT", entityId: draft2.id, metadata: JSON.stringify({ reason: "Opening is passive. Rework to lead with impact." }) },
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_REGENERATED", entityType: "DRAFT", entityId: draft2.id, metadata: JSON.stringify({ version: 2 }) },
        { workspaceId: workspace.id, userId: client.id, action: "DRAFT_SUBMITTED", entityType: "DRAFT", entityId: draft2.id, metadata: "{}" },
      ],
    });
  }

  console.log("✅ Seed complete.");
  console.log("\nDemo credentials:");
  console.log("  Admin:    admin@demo.com    / password123");
  console.log("  Reviewer: reviewer@demo.com / password123");
  console.log("  Client:   client@demo.com   / password123");
  console.log(`\nWorkspace slug: edifice-demo`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
