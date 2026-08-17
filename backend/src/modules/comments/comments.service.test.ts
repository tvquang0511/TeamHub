import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commentsService } from './comments.service';
import { commentsRepo } from './comments.repo';
import { activitiesRepo } from '../activities/activities.repo';
import { ApiError } from '../../common/errors/ApiError';

// Mock dependencies
vi.mock('./comments.repo', () => ({
  commentsRepo: {
    findCardWorkspaceAndBoard: vi.fn(),
    isWorkspaceMember: vi.fn(),
    isBoardMember: vi.fn(),
    listByCard: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../activities/activities.repo', () => ({
  activitiesRepo: {
    createSafe: vi.fn(),
  }
}));

describe('Comments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if user is not a board member (cannot write)', async () => {
      vi.mocked(commentsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1', visibility: 'WORKSPACE' } } 
      } as any);
      vi.mocked(commentsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(commentsRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        commentsService.create('u1', { cardId: 'c1', content: 'Hello' })
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should create comment and log activity successfully', async () => {
      vi.mocked(commentsRepo.findCardWorkspaceAndBoard).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(commentsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(commentsRepo.isBoardMember).mockResolvedValue({} as any);
      
      const mockComment = { id: 'comment1', content: 'Hello' };
      vi.mocked(commentsRepo.create).mockResolvedValue(mockComment as any);
      vi.mocked(activitiesRepo.createSafe).mockResolvedValue({} as any);

      const result = await commentsService.create('u1', { cardId: 'c1', content: 'Hello' });

      expect(commentsRepo.create).toHaveBeenCalledWith('c1', 'u1', 'Hello');
      expect(activitiesRepo.createSafe).toHaveBeenCalledWith(expect.objectContaining({
        type: 'COMMENT_ADDED',
        payload: { commentId: 'comment1' }
      }));
      expect(result.comment.id).toBe('comment1');
    });
  });

  describe('delete', () => {
    it('should delete if user is author', async () => {
      vi.mocked(commentsRepo.findById).mockResolvedValue({
        id: 'comment1',
        authorId: 'u1', // Same as user
        card: { id: 'c1', list: { board: { id: 'b1', workspaceId: 'w1' } } }
      } as any);
      vi.mocked(commentsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(commentsRepo.isBoardMember).mockResolvedValue({ role: 'MEMBER' } as any);
      
      vi.mocked(commentsRepo.delete).mockResolvedValue({} as any);

      await expect(commentsService.delete('u1', 'comment1')).resolves.toEqual({ ok: true });
      expect(commentsRepo.delete).toHaveBeenCalledWith('comment1');
    });

    it('should throw error if user is not author and not admin', async () => {
      vi.mocked(commentsRepo.findById).mockResolvedValue({
        id: 'comment1',
        authorId: 'u2', // Different author
        card: { id: 'c1', list: { board: { id: 'b1', workspaceId: 'w1' } } }
      } as any);
      vi.mocked(commentsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(commentsRepo.isBoardMember).mockResolvedValue({ role: 'MEMBER' } as any); // Not Admin

      await expect(commentsService.delete('u1', 'comment1')).rejects.toThrow('You cannot delete this comment');
    });

    it('should delete if user is admin even if not author', async () => {
      vi.mocked(commentsRepo.findById).mockResolvedValue({
        id: 'comment1',
        authorId: 'u2', // Different author
        card: { id: 'c1', list: { board: { id: 'b1', workspaceId: 'w1' } } }
      } as any);
      vi.mocked(commentsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(commentsRepo.isBoardMember).mockResolvedValue({ role: 'ADMIN' } as any); // Admin

      vi.mocked(commentsRepo.delete).mockResolvedValue({} as any);

      await expect(commentsService.delete('admin1', 'comment1')).resolves.toEqual({ ok: true });
      expect(commentsRepo.delete).toHaveBeenCalledWith('comment1');
    });
  });
});
