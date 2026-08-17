import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitesService } from './invites.service';
import { invitesRepo } from './invites.repo';
import { ApiError } from '../../common/errors/ApiError';
import crypto from 'crypto';

// Mock dependencies
vi.mock('./invites.repo', () => ({
  invitesRepo: {
    findUserById: vi.fn(),
    findMembership: vi.fn(),
    createWorkspaceInvite: vi.fn(),
    findActiveInviteByWorkspaceAndEmail: vi.fn(),
    refreshWorkspaceInvite: vi.fn(),
    findWorkspaceInviteByToken: vi.fn(),
    markWorkspaceInviteAccepted: vi.fn(),
    createMember: vi.fn(),
  }
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({ toString: () => 'mocktoken' }),
  }
}));

describe('Invites Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspaceInvite', () => {
    it('should throw error if user is not ADMIN or OWNER', async () => {
      vi.mocked(invitesRepo.findMembership).mockResolvedValue({ role: 'MEMBER' } as any);

      await expect(
        invitesService.createWorkspaceInvite('u1', 'w1', { email: 'test@example.com' })
      ).rejects.toThrow('Insufficient workspace role');
    });

    it('should create new invite if no active invite exists', async () => {
      vi.mocked(invitesRepo.findMembership).mockResolvedValue({ role: 'ADMIN' } as any);
      vi.mocked(invitesRepo.findActiveInviteByWorkspaceAndEmail).mockResolvedValue(null);
      
      const mockInvite = { 
        id: 'inv1', 
        email: 'test@example.com', 
        token: 'mocktoken',
        expiresAt: new Date(Date.now() + 100000),
        role: 'MEMBER'
      };
      vi.mocked(invitesRepo.createWorkspaceInvite).mockResolvedValue(mockInvite as any);

      const result = await invitesService.createWorkspaceInvite('u1', 'w1', { email: 'test@example.com' });

      expect(invitesRepo.createWorkspaceInvite).toHaveBeenCalled();
      expect(result.invite.token).toBe('mocktoken');
    });
  });

  describe('acceptWorkspaceInvite', () => {
    it('should throw error if invite is expired', async () => {
      vi.mocked(invitesRepo.findWorkspaceInviteByToken).mockResolvedValue({
        id: 'inv1',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 10000), // Expired
        acceptedAt: null,
      } as any);

      await expect(
        invitesService.acceptWorkspaceInvite('u1', 'mocktoken')
      ).rejects.toThrow('Invite token expired');
    });

    it('should throw error if email does not match user email', async () => {
      vi.mocked(invitesRepo.findWorkspaceInviteByToken).mockResolvedValue({
        id: 'inv1',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 100000), 
        acceptedAt: null,
      } as any);
      vi.mocked(invitesRepo.findUserById).mockResolvedValue({ id: 'u1', email: 'other@example.com' } as any);

      await expect(
        invitesService.acceptWorkspaceInvite('u1', 'mocktoken')
      ).rejects.toThrow('Invite token invalid'); // Treated as invalid to obscure reasoning
    });

    it('should accept invite successfully', async () => {
      vi.mocked(invitesRepo.findWorkspaceInviteByToken).mockResolvedValue({
        id: 'inv1',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 100000), 
        acceptedAt: null,
        workspaceId: 'w1',
        workspace: { id: 'w1', name: 'WS' }
      } as any);
      vi.mocked(invitesRepo.findUserById).mockResolvedValue({ id: 'u1', email: 'test@example.com' } as any);
      vi.mocked(invitesRepo.findMembership).mockResolvedValue(null); // Not already a member

      vi.mocked(invitesRepo.markWorkspaceInviteAccepted).mockResolvedValue({} as any);
      vi.mocked(invitesRepo.createMember).mockResolvedValue({} as any);

      const result = await invitesService.acceptWorkspaceInvite('u1', 'mocktoken');

      expect(invitesRepo.markWorkspaceInviteAccepted).toHaveBeenCalledWith('inv1');
      expect(invitesRepo.createMember).toHaveBeenCalledWith({
        workspaceId: 'w1',
        userId: 'u1',
        role: 'MEMBER'
      });
      expect(result.workspace.id).toBe('w1');
    });
  });
});
