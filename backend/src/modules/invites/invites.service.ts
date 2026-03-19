import { ApiError } from '../../common/errors/ApiError';
import { invitesRepo } from './invites.repo';

function publicWorkspace(ws: { id: string; name: string }) {
  return { id: ws.id, name: ws.name };
}

export const invitesService = {
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
