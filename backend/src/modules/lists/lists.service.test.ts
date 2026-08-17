import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listsService } from './lists.service';
import { listsRepo } from './lists.repo';
import { ApiError } from '../../common/errors/ApiError';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('./lists.repo', () => ({
  listsRepo: {
    findBoard: vi.fn(),
    isWorkspaceMember: vi.fn(),
    isBoardMember: vi.fn(),
    create: vi.fn(),
    listByBoard: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    findListPosition: vi.fn(),
    updatePosition: vi.fn(),
    archiveCardsByList: vi.fn(),
  }
}));

vi.mock('../../integrations/cache/redisCache', () => ({
  bumpBoardCacheVersion: vi.fn(),
}));

describe('Lists Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if board not found', async () => {
      vi.mocked(listsRepo.findBoard).mockResolvedValue(null);

      await expect(
        listsService.create('u1', { boardId: 'b1', name: 'New List' })
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if user is not a board member', async () => {
      vi.mocked(listsRepo.findBoard).mockResolvedValue({ id: 'b1', workspaceId: 'w1' } as any);
      vi.mocked(listsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(listsRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        listsService.create('u1', { boardId: 'b1', name: 'New List' })
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should create list successfully', async () => {
      vi.mocked(listsRepo.findBoard).mockResolvedValue({ id: 'b1', workspaceId: 'w1' } as any);
      vi.mocked(listsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(listsRepo.isBoardMember).mockResolvedValue({} as any);
      
      const mockList = { id: 'l1', name: 'New List' };
      vi.mocked(listsRepo.create).mockResolvedValue(mockList as any);

      const result = await listsService.create('u1', { boardId: 'b1', name: 'New List' });

      expect(listsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        boardId: 'b1',
        name: 'New List',
      }));
      expect(result.list.id).toBe('l1');
    });
  });

  describe('move', () => {
    it('should move list and calculate new position', async () => {
      vi.mocked(listsRepo.findById).mockResolvedValue({ 
        id: 'l1', 
        boardId: 'b1',
        board: { workspaceId: 'w1' }
      } as any);
      vi.mocked(listsRepo.findBoard).mockResolvedValue({ id: 'b1', workspaceId: 'w1' } as any);
      vi.mocked(listsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(listsRepo.isBoardMember).mockResolvedValue({} as any);
      
      // Mocking prev and next lists
      vi.mocked(listsRepo.findListPosition)
        .mockResolvedValueOnce({ id: 'prev', boardId: 'b1', position: new Prisma.Decimal(100) } as any)
        .mockResolvedValueOnce({ id: 'next', boardId: 'b1', position: new Prisma.Decimal(200) } as any);

      vi.mocked(listsRepo.updatePosition).mockResolvedValue({ id: 'l1', position: new Prisma.Decimal(150) } as any);

      const result = await listsService.move('u1', 'l1', { prevId: 'prev', nextId: 'next' });
      
      // (100 + 200) / 2 = 150
      expect(listsRepo.updatePosition).toHaveBeenCalledWith('l1', new Prisma.Decimal(150));
      expect(result.list.position).toEqual(new Prisma.Decimal(150));
    });
  });
});
