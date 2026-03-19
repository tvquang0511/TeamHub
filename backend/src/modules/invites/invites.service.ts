import { ApiError } from '../../common/errors/ApiError';
import { invitesRepo } from './invites.repo';

function publicInvite(invite: {
  id: string;
  workspaceId: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
  };
}

function publicWorkspace(ws: { id: string; name: string }) {
  return { id: ws.id, name: ws.name };
}

export const invitesService = {
  async getWorkspaceInviteByToken(userId: string, token: string) {
    const invite = await invitesRepo.findWorkspaceInviteByToken(token);
    if (!invite) throw new ApiError(404, 'WORKSPACE_INVITE_NOT_FOUND', 'Invite not found');

    // Only workspace members can view invite details
    const membership = await invitesRepo.findMembership(invite.workspaceId, userId);
    if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');

    return {
      invite: {
        ...publicInvite(invite),
        // Do not return token here.
      },
      workspace: publicWorkspace(invite.workspace),
    };
  },

  async listWorkspaceInvites(userId: string, workspaceId: string) {
    const membership = await invitesRepo.findMembership(workspaceId, userId);
    if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const invites = await invitesRepo.listWorkspaceInvites(workspaceId);
    return {
      invites: invites.map(publicInvite),
    };
  },

  async revokeWorkspaceInvite(userId: string, workspaceId: string, inviteId: string) {
    const membership = await invitesRepo.findMembership(workspaceId, userId);
    if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const invite = await invitesRepo.findWorkspaceInviteById(inviteId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new ApiError(404, 'WORKSPACE_INVITE_NOT_FOUND', 'Invite not found');
    }

    if (!invite.acceptedAt) {
      await invitesRepo.revokeWorkspaceInvite(inviteId);
    }

    return { ok: true };
  },

  async acceptWorkspaceInvite(userId: string, token: string) {
    const invite = await invitesRepo.findWorkspaceInviteByToken(token);
    if (!invite) {
      throw new ApiError(400, 'WORKSPACE_INVITE_INVALID', 'Invite token invalid');
    }

    if (invite.acceptedAt) {
      // Treat accepted as invalid to avoid leaking info
      throw new ApiError(400, 'WORKSPACE_INVITE_INVALID', 'Invite token invalid');
    }

    if (invite.expiresAt <= new Date()) {
      throw new ApiError(400, 'WORKSPACE_INVITE_EXPIRED', 'Invite token expired');
    }

    const user = await invitesRepo.findUserById(userId);
    if (!user) {
      throw new ApiError(401, 'AUTH_TOKEN_INVALID', 'User no longer exists');
    }

    // Strict policy: email must match
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ApiError(400, 'WORKSPACE_INVITE_INVALID', 'Invite token invalid');
    }

    const existingMembership = await invitesRepo.findMembership(invite.workspaceId, userId);
    if (existingMembership) {
      throw new ApiError(409, 'WORKSPACE_ALREADY_MEMBER', 'Already a workspace member');
    }

    await invitesRepo.markWorkspaceInviteAccepted(invite.id);
    await invitesRepo.createMember({
      workspaceId: invite.workspaceId,
      userId,
      role: 'MEMBER',
    });

    return { workspace: publicWorkspace(invite.workspace) };
  },
};
