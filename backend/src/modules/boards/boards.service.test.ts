import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardsService } from './boards.service';
import { boardsRepo } from './boards.repo';
import { ApiError } from '../../common/errors/ApiError';
import { Prisma } from '@prisma/client';

// Mock the repository
vi.mock('./boards.repo', () => ({
  boardsRepo: {
    isWorkspaceMember: vi.fn(),
    create: vi.fn(),
    addBoardMember: vi.fn(),
    listByWorkspaceVisibleToUser: vi.fn(),
    findById: vi.fn(),
    isBoardMember: vi.fn(),
  }
}));

describe('Boards Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if user is not a workspace member', async () => {
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue(null);

      await expect(
        boardsService.create('u1', { workspaceId: 'w1', name: 'Board 1' })
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if user is not OWNER or ADMIN', async () => {
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({ role: 'MEMBER' } as any);

      await expect(
        boardsService.create('u1', { workspaceId: 'w1', name: 'Board 1' })
      ).rejects.toThrow('Insufficient workspace role');
    });

    it('should create board and add creator as OWNER', async () => {
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({ role: 'ADMIN' } as any);
      
      const mockBoard = { id: 'b1', name: 'Board 1' };
      vi.mocked(boardsRepo.create).mockResolvedValue(mockBoard as any);
      vi.mocked(boardsRepo.addBoardMember).mockResolvedValue({} as any);

      const result = await boardsService.create('u1', { workspaceId: 'w1', name: 'Board 1' });

      expect(boardsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'w1',
        name: 'Board 1',
        visibility: 'PRIVATE'
      }));
      expect(boardsRepo.addBoardMember).toHaveBeenCalledWith({
        boardId: 'b1',
        userId: 'u1',
        role: 'OWNER'
      });
      expect(result.board.id).toBe('b1');
    });
  });

  describe('list', () => {
    it('should attach actor permissions for each board', async () => {
      vi.mocked(boardsRepo.isWorkspaceMember).mockResolvedValue({ role: 'MEMBER' } as any);
      
      const mockBoards = [
        { id: 'b1', visibility: 'WORKSPACE', members: [] }, // Workspace board, no explicit role
        { id: 'b2', visibility: 'PRIVATE', members: [{ role: 'OWNER' }] } // Private board, user is OWNER
      ];
      vi.mocked(boardsRepo.listByWorkspaceVisibleToUser).mockResolvedValue(mockBoards as any);

      const result = await boardsService.list('u1', 'w1');
      
      expect(result.boards).toHaveLength(2);
      
      // Board 1 permissions (WORKSPACE vis, MEMBER role in workspace, no board role)
      expect(result.boards[0].actor.canReadBoard).toBe(true);
      expect(result.boards[0].actor.canWriteBoard).toBe(false);
      
      // Board 2 permissions (PRIVATE vis, MEMBER role in workspace, OWNER in board)
      expect(result.boards[1].actor.canReadBoard).toBe(true);
      expect(result.boards[1].actor.canWriteBoard).toBe(true);
      expect(result.boards[1].actor.canDeleteBoard).toBe(true);
    });
  });
});
