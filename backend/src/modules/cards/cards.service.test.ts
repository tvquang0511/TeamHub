import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cardsService } from './cards.service';
import { cardsRepo } from './cards.repo';
import { activitiesRepo } from '../activities/activities.repo';
import { ApiError } from '../../common/errors/ApiError';
import { Prisma } from '@prisma/client';

// Mock the dependencies
vi.mock('./cards.repo', () => ({
  cardsRepo: {
    findList: vi.fn(),
    isWorkspaceMember: vi.fn(),
    isBoardMember: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    listByList: vi.fn(),
    findCardWorkspaceAndBoard: vi.fn(),
  }
}));

vi.mock('../activities/activities.repo', () => ({
  activitiesRepo: {
    createSafe: vi.fn(),
  }
}));

vi.mock('../../integrations/cache/redisCache', () => ({
  bumpBoardCacheVersion: vi.fn(),
  cacheDel: vi.fn(),
  cacheGetJson: vi.fn(),
  cacheKey: vi.fn(),
  cacheSetJson: vi.fn(),
}));

describe('Cards Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if list not found', async () => {
      vi.mocked(cardsRepo.findList).mockResolvedValue(null);

      await expect(
        cardsService.create('u1', { listId: 'l1', title: 'New Card' })
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if user is not a board member', async () => {
      vi.mocked(cardsRepo.findList).mockResolvedValue({ 
        id: 'l1', 
        board: { id: 'b1', workspaceId: 'w1' } 
      } as any);
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(cardsRepo.isBoardMember).mockResolvedValue(null); // Not a board member

      await expect(
        cardsService.create('u1', { listId: 'l1', title: 'New Card' })
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should create card and record activity successfully', async () => {
      vi.mocked(cardsRepo.findList).mockResolvedValue({ 
        id: 'l1', 
        board: { id: 'b1', workspaceId: 'w1' } 
      } as any);
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(cardsRepo.isBoardMember).mockResolvedValue({} as any);
      
      const mockCard = { id: 'c1', title: 'New Card' };
      vi.mocked(cardsRepo.create).mockResolvedValue(mockCard as any);
      vi.mocked(activitiesRepo.createSafe).mockResolvedValue({} as any);

      const result = await cardsService.create('u1', { listId: 'l1', title: 'New Card' });

      expect(cardsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        listId: 'l1',
        title: 'New Card',
      }));
      
      expect(activitiesRepo.createSafe).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'u1',
        cardId: 'c1',
        type: 'CARD_CREATED'
      }));
      
      expect(result.card.id).toBe('c1');
    });
  });

  describe('get', () => {
    it('should return card if user has permissions', async () => {
      vi.mocked(cardsRepo.findById).mockResolvedValue({
        id: 'c1',
        title: 'C1',
        list: { board: { id: 'b1', workspaceId: 'w1', visibility: 'WORKSPACE' } }
      } as any);
      
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any); // Member of workspace
      
      const result = await cardsService.get('u1', 'c1');
      expect(result.card.id).toBe('c1');
    });
  });
});
