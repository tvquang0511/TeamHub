import prisma from "../../src/db/prisma";
import type { users } from "@prisma/client";

export async function seedWorkspaces(usersList: users[]) {
  const [owner, admin, dev, designer, qa, member] = usersList;

  // Workspace 1: Engineering
  const wsEngineering = await prisma.workspaces.create({
    data: {
      name: "TeamHub Core Engineering",
      description: "Không gian làm việc phát triển hệ thống lõi & các tính năng cho TeamHub Platform",
    },
  });

  const engMembers = [
    { userId: owner!.id, role: "OWNER" as const },
    { userId: admin!.id, role: "ADMIN" as const },
    { userId: dev!.id, role: "ADMIN" as const },
    { userId: designer!.id, role: "MEMBER" as const },
    { userId: qa!.id, role: "MEMBER" as const },
    { userId: member!.id, role: "MEMBER" as const },
  ];

  for (const m of engMembers) {
    await prisma.workspace_members.create({
      data: { workspaceId: wsEngineering.id, userId: m.userId, role: m.role },
    });
  }

  // Workspace 2: Marketing & Growth
  const wsMarketing = await prisma.workspaces.create({
    data: {
      name: "Marketing & Growth Operations",
      description: "Không gian làm việc cho các chiến dịch Marketing, Branding & Tăng trưởng người dùng",
    },
  });

  const mktMembers = [
    { userId: owner!.id, role: "OWNER" as const },
    { userId: admin!.id, role: "ADMIN" as const },
    { userId: designer!.id, role: "ADMIN" as const },
    { userId: member!.id, role: "MEMBER" as const },
  ];

  for (const m of mktMembers) {
    await prisma.workspace_members.create({
      data: { workspaceId: wsMarketing.id, userId: m.userId, role: m.role },
    });
  }

  return { wsEngineering, wsMarketing };
}
