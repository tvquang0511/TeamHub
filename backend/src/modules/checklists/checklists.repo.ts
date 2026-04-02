import prisma from "../../db/prisma";

export class ChecklistsRepo {
  async listByCard(cardId: string) {
    return prisma.checklists.findMany({
      where: { cardId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  async createChecklist(data: { cardId: string; title: string; position: any }) {
    return prisma.checklists.create({
      data: {
        cardId: data.cardId,
        title: data.title,
        position: data.position,
      },
      include: { items: true },
    });
  }

  async updateChecklist(id: string, data: { title?: string; position?: any }) {
    return prisma.checklists.update({
      where: { id },
      data: {
        title: data.title,
        position: data.position,
      },
      include: { items: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    });
  }

  async deleteChecklist(id: string) {
    return prisma.checklists.delete({ where: { id } });
  }

  async createItem(data: { checklistId: string; title: string; position: any }) {
    return prisma.checklist_items.create({
      data: {
        checklistId: data.checklistId,
        title: data.title,
        position: data.position,
      },
    });
  }

  async updateItem(id: string, data: { title?: string; isDone?: boolean; position?: any }) {
    return prisma.checklist_items.update({
      where: { id },
      data: {
        title: data.title,
        isDone: data.isDone,
        position: data.position,
      },
    });
  }

  async deleteItem(id: string) {
    return prisma.checklist_items.delete({ where: { id } });
  }
}

export const checklistsRepo = new ChecklistsRepo();
