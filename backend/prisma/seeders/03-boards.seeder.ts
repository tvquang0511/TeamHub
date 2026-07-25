import { Prisma } from "@prisma/client";
import prisma from "../../src/db/prisma";
import type { users, workspaces } from "@prisma/client";

export async function seedBoards(
  workspaces: { wsEngineering: workspaces; wsMarketing: workspaces },
  usersList: users[]
) {
  const [owner, admin, dev, designer, qa, member] = usersList;

  // Board 1: Sprint 1 (Engineering)
  const boardSprint = await prisma.boards.create({
    data: {
      workspaceId: workspaces.wsEngineering.id,
      name: "Sprint 1 — Core Features & UI Refactoring",
      description: "Bảng Kanban theo dõi tiến độ phát triển các tính năng Sprint 1",
      visibility: "WORKSPACE",
      backgroundLeftColor: "#3b82f6",
      backgroundRightColor: "#8b5cf6",
      backgroundSplitPct: 50,
      position: new Prisma.Decimal(1024),
    },
  });

  // Board 2: Product Roadmap (Engineering)
  const boardRoadmap = await prisma.boards.create({
    data: {
      workspaceId: workspaces.wsEngineering.id,
      name: "Product Roadmap Q3/Q4 — System Architecture",
      description: "Lộ trình định hướng sản phẩm & kiến trúc hệ thống 6 tháng cuối năm",
      visibility: "WORKSPACE",
      backgroundLeftColor: "#10b981",
      backgroundRightColor: "#06b6d4",
      backgroundSplitPct: 40,
      position: new Prisma.Decimal(2048),
    },
  });

  // Board 3: Growth Campaign (Marketing)
  const boardGrowth = await prisma.boards.create({
    data: {
      workspaceId: workspaces.wsMarketing.id,
      name: "Growth & Product Launch Campaign 2026",
      description: "Chiến dịch ra mắt sản phẩm và thu hút 10.000 người dùng đầu tiên",
      visibility: "WORKSPACE",
      backgroundLeftColor: "#f59e0b",
      backgroundRightColor: "#ef4444",
      backgroundSplitPct: 60,
      position: new Prisma.Decimal(1024),
    },
  });

  // Add members to Board 1
  for (const u of usersList) {
    await prisma.board_members.create({
      data: {
        boardId: boardSprint.id,
        userId: u.id,
        role: u.id === owner!.id ? "OWNER" : u.id === admin!.id ? "ADMIN" : "MEMBER",
      },
    });
  }

  // Labels for Board 1
  const labelsData = [
    { name: "Frontend", color: "#3B82F6" },
    { name: "Backend", color: "#10B981" },
    { name: "UI/UX", color: "#8B5CF6" },
    { name: "High Priority", color: "#EF4444" },
    { name: "Bug Fix", color: "#F59E0B" },
    { name: "AI/ML", color: "#EC4899" },
  ];

  const labels = [];
  for (const l of labelsData) {
    const label = await prisma.labels.create({
      data: { boardId: boardSprint.id, name: l.name, color: l.color },
    });
    labels.push(label);
  }

  // Lists for Board 1 (Sprint 1)
  const sprintListsData = [
    { name: "Backlog 📋", position: 1024, isDoing: false, isDone: false },
    { name: "In Progress ⚙️", position: 2048, isDoing: true, isDone: false },
    { name: "Code Review 🔍", position: 3072, isDoing: true, isDone: false },
    { name: "Done 🎉", position: 4096, isDoing: false, isDone: true },
  ];

  const sprintListsMap: Record<string, any> = {};
  for (const ld of sprintListsData) {
    const list = await prisma.lists.create({
      data: {
        boardId: boardSprint.id,
        name: ld.name,
        position: new Prisma.Decimal(ld.position),
        isDoing: ld.isDoing,
        isDone: ld.isDone,
      },
    });
    sprintListsMap[ld.name] = list;
  }

  return {
    boardSprint,
    boardRoadmap,
    boardGrowth,
    labels,
    sprintListsMap,
  };
}
