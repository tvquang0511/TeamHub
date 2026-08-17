import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspacesService } from './workspaces.service';
import { workspacesRepo } from './workspaces.repo';
import { ApiError } from '../../common/errors/ApiError';

// Mock the entire workspaces repository
vi.mock('./workspaces.repo', () => ({
  workspacesRepo: {
    createWorkspace: vi.fn(),
    createMember: vi.fn(),
    findMembership: vi.fn(),
    getWorkspaceById: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    listMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    countOwners: vi.fn(),
    listMyWorkspaces: vi.fn(),
  }
}));

// We also need to mock external dependencies like queue and storage to avoid side effects
vi.mock('../../integrations/queue/blobs.queue', () => ({
  enqueueDeleteObject: vi.fn()
}));
vi.mock('../../infrastructure/storage', () => ({
  presignPutObject: vi.fn(),
  buildPublicStorageUrl: vi.fn()
}));

describe('Workspaces Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a workspace and add user as OWNER', async () => {
      const mockUserId = 'user-123';
      const mockWorkspace = { 
        id: 'ws-123', 
        name: 'Test WS', 
        createdAt: new Date(), 
        updatedAt: new Date(),
        description: null,
        backgroundImageUrl: null 
      };
      
      vi.mocked(workspacesRepo.createWorkspace).mockResolvedValue(mockWorkspace as any);
      vi.mocked(workspacesRepo.createMember).mockResolvedValue({} as any);

      const result = await workspacesService.createWorkspace(mockUserId, { name: 'Test WS' });

      expect(workspacesRepo.createWorkspace).toHaveBeenCalledWith({ name: 'Test WS', description: null });
      expect(workspacesRepo.createMember).toHaveBeenCalledWith({ workspaceId: 'ws-123', userId: mockUserId, role: 'OWNER' });
      expect(result.workspace.id).toBe('ws-123');
    });
  });

  describe('getWorkspaceDetail', () => {
    it('should throw ApiError if user is not a member', async () => {
      vi.mocked(workspacesRepo.findMembership).mockResolvedValue(null);

      await expect(workspacesService.getWorkspaceDetail('user-1', 'ws-1'))
        .rejects.toThrow(ApiError);
        
      await expect(workspacesService.getWorkspaceDetail('user-1', 'ws-1'))
        .rejects.toThrow('Not a workspace member');
    });

    it('should return workspace details if user is member', async () => {
      const mockWs = { 
        id: 'ws-1', 
        name: 'Test WS', 
        createdAt: new Date(), 
        updatedAt: new Date(),
        description: null,
        backgroundImageUrl: null 
      };
      
      vi.mocked(workspacesRepo.findMembership).mockResolvedValue({} as any);
      vi.mocked(workspacesRepo.getWorkspaceById).mockResolvedValue(mockWs as any);

      const result = await workspacesService.getWorkspaceDetail('user-1', 'ws-1');
      
      expect(result.workspace.id).toBe('ws-1');
      expect(workspacesRepo.getWorkspaceById).toHaveBeenCalledWith('ws-1');
    });
  });
});
