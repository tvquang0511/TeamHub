import { activitiesRepo } from "./activities.repo";

export const activitiesService = {
  async listByBoard(boardId: string) {
    const items = await activitiesRepo.listByBoard(boardId);
    return { activities: items };
  },

  async listByCard(cardId: string) {
    const items = await activitiesRepo.listByCard(cardId);
    return { activities: items };
  },

  async listByWorkspace(workspaceId: string) {
    const items = await activitiesRepo.listByWorkspace(workspaceId);
    return { activities: items };
  },

  async pruneOldActivities(daysAgo = 30) {
    const result = await activitiesRepo.pruneOldActivities(daysAgo);
    return { deletedCount: result.count };
  },
};
