import { describe, it, expect, vi, beforeEach } from 'vitest';
import { labelsService } from './labels.service';
import { labelsRepo } from './labels.repo';
import { ApiError } from '../../common/errors/ApiError';

// Mock dependencies
vi.mock('./labels.repo', () => ({
  labelsRepo: {
    findBoardMember: vi.fn(),
    listByBoard: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../../integrations/cache/redisCache', () => ({
  bumpBoardCacheVersion: vi.fn(),
}));

describe('Labels Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if user is not a board member', async () => {
      vi.mocked(labelsRepo.findBoardMember).mockResolvedValue(null);

      await expect(
        labelsService.create('u1', { boardId: 'b1', name: 'Bug' })
      ).rejects.toThrow('You are not a member of this board');
    });

    it('should throw error if user is only MEMBER (not ADMIN or OWNER)', async () => {
      vi.mocked(labelsRepo.findBoardMember).mockResolvedValue({ role: 'MEMBER' } as any);

      await expect(
        labelsService.create('u1', { boardId: 'b1', name: 'Bug' })
      ).rejects.toThrow('Insufficient board role to manage labels');
    });

    it('should create label successfully if user is ADMIN', async () => {
      vi.mocked(labelsRepo.findBoardMember).mockResolvedValue({ role: 'ADMIN' } as any);
      
      const mockLabel = { id: 'l1', name: 'Bug' };
      vi.mocked(labelsRepo.create).mockResolvedValue(mockLabel as any);

      const result = await labelsService.create('u1', { boardId: 'b1', name: 'Bug' });

      expect(labelsRepo.create).toHaveBeenCalledWith('b1', { name: 'Bug', color: null });
      expect(result.label.id).toBe('l1');
    });
  });

  describe('delete', () => {
    it('should throw error if label not found', async () => {
      vi.mocked(labelsRepo.findById).mockResolvedValue(null);

      await expect(
        labelsService.delete('u1', 'l1')
      ).rejects.toThrow('Label not found');
    });

    it('should delete label successfully if user is OWNER', async () => {
      vi.mocked(labelsRepo.findById).mockResolvedValue({ id: 'l1', boardId: 'b1' } as any);
      vi.mocked(labelsRepo.findBoardMember).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(labelsRepo.delete).mockResolvedValue({} as any);

      await expect(labelsService.delete('u1', 'l1')).resolves.toEqual({ ok: true });
      expect(labelsRepo.delete).toHaveBeenCalledWith('l1');
    });
  });
});
