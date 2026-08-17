import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assigneesService } from './assignees.service';
import { assigneesRepo } from './assignees.repo';
import { cardsRepo } from '../cards/cards.repo';
import { boardsRepo } from '../boards/boards.repo';
import { activitiesRepo } from '../activities/activities.repo';
import { notificationsService } from '../notifications/notifications.service';
import { ApiError } from '../../common/errors/ApiError';

// Mock dependencies
vi.mock('./assignees.repo', () => ({
  assigneesRepo: {
    listByCard: vi.fn(),
    assign: vi.fn(),
    unassign: vi.fn(),
  }
}));

vi.mock('../cards/cards.repo', () => ({
  cardsRepo: {
    findCardWorkspaceAndBoard: vi.fn(),
  }
}));

vi.mock('../boards/boards.repo', () => ({
  boardsRepo: {
    isWorkspaceMember: vi.fn(),
    isBoardMember: vi.fn(),
  }
}));

vi.mock('../activities/activities.repo', () => ({
  activitiesRepo: {
    createSafe: vi.fn(),
  }
}));

vi.mock('../notifications/notifications.service', () => ({
  notificationsService: {
    createAndPushNotification: vi.fn(),
  }
}));

describe('Assignees Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignSelf', () => {
    it('should throw error if user is not a board member', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        assigneesService.assignSelf('u1', 'c1')
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should assign self and record activity', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({} as any);
      
      const mockCreated = { user: { id: 'u1', email: 'x@x.com', displayName: 'X' } };
      vi.mocked(assigneesRepo.assign).mockResolvedValue(mockCreated as any);
      vi.mocked(activitiesRepo.createSafe).mockResolvedValue({} as any);

      const result = await assigneesService.assignSelf('u1', 'c1');

      expect(assigneesRepo.assign).toHaveBeenCalledWith('c1', 'u1');
      expect(activitiesRepo.createSafe).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ASSIGNEE_ADDED',
        payload: { userId: 'u1' }
      }));
      expect(result.assignee?.id).toBe('u1');
    });
  });

  describe('addByAdmin', () => {
    it('should throw error if actor is not OWNER or ADMIN', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({ role: 'MEMBER' } as any); // Not Admin

      await expect(
        assigneesService.addByAdmin('u1', 'c1', 'u2')
      ).rejects.toThrow('Only board OWNER/ADMIN can assign others');
    });

    it('should assign another user and send notification', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        title: 'Task 1',
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      // Actor is ADMIN
      vi.mocked(boardsRepo.isBoardMember).mockImplementation(async (boardId, userId) => {
        if (userId === 'admin1') return { role: 'ADMIN' } as any;
        if (userId === 'u2') return { role: 'MEMBER' } as any; // Target is board member
        return null;
      });
      
      const mockCreated = { user: { id: 'u2', email: 'x@x.com', displayName: 'X' } };
      vi.mocked(assigneesRepo.assign).mockResolvedValue(mockCreated as any);

      const result = await assigneesService.addByAdmin('admin1', 'c1', 'u2');

      expect(assigneesRepo.assign).toHaveBeenCalledWith('c1', 'u2');
      expect(notificationsService.createAndPushNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u2',
        actorId: 'admin1',
        type: 'CARD_ASSIGNED'
      }));
      expect(result.assignee?.id).toBe('u2');
    });
  });
});
