import { Request, Response } from 'express';
import { z } from 'zod';
import { invitesService } from './invites.service';

export const acceptInvite = async (req: Request, res: Response) => {
  const token = String(req.params.token);
  const userId = req.user!.id;

  const result = await invitesService.acceptWorkspaceInvite(userId, token);
  res.json(result);
};

const tokenParamSchema = z.object({
  token: z.string().min(1),
});

const listWorkspaceInvitesParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

const revokeWorkspaceInviteParamSchema = z.object({
  workspaceId: z.string().uuid(),
  inviteId: z.string().uuid(),
});

export const getInviteByToken = async (req: Request, res: Response) => {
  const { token } = tokenParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.getWorkspaceInviteByToken(userId, token);
  res.json(result);
};

export const listWorkspaceInvites = async (req: Request, res: Response) => {
  const { workspaceId } = listWorkspaceInvitesParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.listWorkspaceInvites(userId, workspaceId);
  res.json(result);
};

export const revokeWorkspaceInvite = async (req: Request, res: Response) => {
  const { workspaceId, inviteId } = revokeWorkspaceInviteParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.revokeWorkspaceInvite(userId, workspaceId, inviteId);
  res.json(result);
};
