import { ApiError } from '../../common/errors/ApiError';
import { invitesRepo } from './invites.repo';
import crypto from 'crypto';

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

function publicBoard(b: { id: string; name: string; workspaceId: string }) {
  return { id: b.id, name: b.name, workspaceId: b.workspaceId };
}

function publicBoardInvite(invite: {
  id: string;
  boardId: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invite.id,
    boardId: invite.boardId,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
  };
}

export const invitesService = {
  async createBoardInvite(
    userId: string,
    boardId: string,
    input: { email: string; expiresAt?: string },
  ) {
    const member = await invitesRepo.findBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member');
    if (member.role !== 'ADMIN') {
      throw new ApiError(403, 'BOARD_FORBIDDEN', 'Insufficient board role');
    }

    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ApiError(400, 'BOARD_INVITE_INVALID', 'Invalid expiresAt');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await invitesRepo.createBoardInvite({
      boardId,
      email: input.email.toLowerCase(),
      token,
      expiresAt,
    });

    // MVP: return token for testing.
    return {
      invite: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  },

  async listBoardInvites(userId: string, boardId: string) {
    const member = await invitesRepo.findBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member');
    if (member.role !== 'ADMIN') {
      throw new ApiError(403, 'BOARD_FORBIDDEN', 'Insufficient board role');
    }

    const invites = await invitesRepo.listBoardInvites(boardId);
    return { invites: invites.map(publicBoardInvite) };
  },

  async revokeBoardInvite(userId: string, boardId: string, inviteId: string) {
    const member = await invitesRepo.findBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member');
    if (member.role !== 'ADMIN') {
      throw new ApiError(403, 'BOARD_FORBIDDEN', 'Insufficient board role');
    }

    const invite = await invitesRepo.findBoardInviteById(inviteId);
    if (!invite || invite.boardId !== boardId) {
      throw new ApiError(404, 'BOARD_INVITE_NOT_FOUND', 'Invite not found');
    }

    if (!invite.acceptedAt) {
      await invitesRepo.revokeBoardInvite(inviteId);
    }
    return { ok: true };
  },

  async getBoardInviteByToken(userId: string, token: string) {
    const invite = await invitesRepo.findBoardInviteByToken(token);
    if (!invite) throw new ApiError(404, 'BOARD_INVITE_NOT_FOUND', 'Invite not found');

    // Only board members can view invite details
    const member = await invitesRepo.findBoardMember(invite.boardId, userId);
    if (!member) throw new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member');

    return {
      invite: publicBoardInvite(invite),
      board: publicBoard(invite.board),
    };
  },

  async acceptBoardInvite(userId: string, token: string) {
    const invite = await invitesRepo.findBoardInviteByToken(token);
    if (!invite) throw new ApiError(400, 'BOARD_INVITE_INVALID', 'Invite token invalid');
    if (invite.acceptedAt) throw new ApiError(400, 'BOARD_INVITE_INVALID', 'Invite token invalid');
    if (invite.expiresAt <= new Date()) {
      throw new ApiError(400, 'BOARD_INVITE_EXPIRED', 'Invite token expired');
    }

    const user = await invitesRepo.findUserById(userId);
    if (!user) throw new ApiError(401, 'AUTH_TOKEN_INVALID', 'User no longer exists');

    // Strict policy: email must match
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ApiError(400, 'BOARD_INVITE_INVALID', 'Invite token invalid');
    }

    const existingBoardMembership = await invitesRepo.findBoardMember(invite.boardId, userId);
    if (existingBoardMembership) {
      throw new ApiError(409, 'BOARD_ALREADY_MEMBER', 'Already a board member');
    }

    // Ensure workspace membership too
    const wsMembership = await invitesRepo.findMembership(invite.board.workspaceId, userId);
    if (!wsMembership) {
      await invitesRepo.createWorkspaceMemberIfMissing({
        workspaceId: invite.board.workspaceId,
        userId,
        role: 'MEMBER',
      });
    }

    await invitesRepo.markBoardInviteAccepted(invite.id);
    await invitesRepo.createBoardMember({
      boardId: invite.boardId,
      userId,
      role: 'MEMBER',
    });

    return { board: publicBoard(invite.board) };
  },

  async createWorkspaceInvite(
    userId: string,
    workspaceId: string,
    input: { email: string; expiresAt?: string },
  ) {
    const membership = await invitesRepo.findMembership(workspaceId, userId);
    if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ApiError(400, 'WORKSPACE_INVITE_INVALID', 'Invalid expiresAt');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await invitesRepo.createWorkspaceInvite({
      workspaceId,
      email: input.email.toLowerCase(),
      token,
      expiresAt,
    });

    // MVP: return token for testing.
    return {
      invite: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  },
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
