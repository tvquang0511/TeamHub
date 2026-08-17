import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checklistsService } from './checklists.service';
import { checklistsRepo } from './checklists.repo';
import { cardsRepo } from '../cards/cards.repo';
import { boardsRepo } from '../boards/boards.repo';
import { ApiError } from '../../common/errors/ApiError';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('./checklists.repo', () => ({
  checklistsRepo: {
    listByCard: vi.fn(),
    createChecklist: vi.fn(),
    updateChecklist: vi.fn(),
    deleteChecklist: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
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

vi.mock('../../db/prisma', () => ({
  default: {
    checklists: {
      findUnique: vi.fn(),
    },
    checklist_items: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

describe('Checklists Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChecklist', () => {
    it('should throw error if card not found', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue(null);

      await expect(
        checklistsService.createChecklist('u1', 'c1', { title: 'New Checklist' })
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if user is not a board member', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        checklistsService.createChecklist('u1', 'c1', { title: 'New Checklist' })
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should create checklist successfully', async () => {
      vi.mocked(cardsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({} as any);
      
      vi.mocked(checklistsRepo.listByCard).mockResolvedValue([
        { id: 'chk1', position: new Prisma.Decimal(1) } as any
      ]);
      
      const mockChecklist = { id: 'chk2', title: 'New Checklist' };
      vi.mocked(checklistsRepo.createChecklist).mockResolvedValue(mockChecklist as any);

      const result = await checklistsService.createChecklist('u1', 'c1', { title: 'New Checklist' });

      expect(checklistsRepo.createChecklist).toHaveBeenCalledWith(expect.objectContaining({
        cardId: 'c1',
        title: 'New Checklist',
        position: expect.any(Object), // Prisma.Decimal
      }));
      expect(result.checklist.id).toBe('chk2');
    });
  });
});
