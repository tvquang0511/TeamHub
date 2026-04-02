import { Request, Response } from 'express';
import { z } from 'zod';
import { invitesService } from './invites.service';

const createWorkspaceInviteParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

const createWorkspaceInviteBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  expiresAt: z.string().datetime().optional(),
});

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

export const createWorkspaceInvite = async (req: Request, res: Response) => {
  const { workspaceId } = createWorkspaceInviteParamSchema.parse(req.params);
  const userId = req.user!.id;
  const body = createWorkspaceInviteBodySchema.parse(req.body);

  const result = await invitesService.createWorkspaceInvite(userId, workspaceId, body);
  return res.status(201).json(result);
};

// Inbox (user-centric) workspace invites
export const listMyWorkspaceInvites = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await invitesService.listMyWorkspaceInvites(userId);
  res.json(result);
};

const inviteIdParamSchema = z.object({
  inviteId: z.string().uuid(),
});

export const acceptMyWorkspaceInvite = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { inviteId } = inviteIdParamSchema.parse(req.params);
  const result = await invitesService.acceptMyWorkspaceInvite(userId, inviteId);
  res.json(result);
};

export const declineMyWorkspaceInvite = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { inviteId } = inviteIdParamSchema.parse(req.params);
  const result = await invitesService.declineMyWorkspaceInvite(userId, inviteId);
  res.json(result);
};

// Board invites are deprecated. Use:
// POST /boards/:id/members
// POST /boards/:id/members/by-email
