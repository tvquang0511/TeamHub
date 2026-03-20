import { Request, Response } from 'express';
import { z } from 'zod';
import { invitesService } from './invites.service';

const createWorkspaceInviteParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

const createWorkspaceInviteBodySchema = z.object({
  email: z.string().email(),
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

const createBoardInviteParamSchema = z.object({
  boardId: z.string().uuid(),
});

const createBoardInviteBodySchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
});

export const createBoardInvite = async (req: Request, res: Response) => {
  const { boardId } = createBoardInviteParamSchema.parse(req.params);
  const userId = req.user!.id;
  const body = createBoardInviteBodySchema.parse(req.body);

  const result = await invitesService.createBoardInvite(userId, boardId, body);
  return res.status(201).json(result);
};

const listBoardInvitesParamSchema = z.object({
  boardId: z.string().uuid(),
});

export const listBoardInvites = async (req: Request, res: Response) => {
  const { boardId } = listBoardInvitesParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.listBoardInvites(userId, boardId);
  res.json(result);
};

const revokeBoardInviteParamSchema = z.object({
  boardId: z.string().uuid(),
  inviteId: z.string().uuid(),
});

export const revokeBoardInvite = async (req: Request, res: Response) => {
  const { boardId, inviteId } = revokeBoardInviteParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.revokeBoardInvite(userId, boardId, inviteId);
  res.json(result);
};

export const getBoardInviteByToken = async (req: Request, res: Response) => {
  const { token } = tokenParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await invitesService.getBoardInviteByToken(userId, token);
  res.json(result);
};

export const acceptBoardInvite = async (req: Request, res: Response) => {
  const token = String(req.params.token);
  const userId = req.user!.id;

  const result = await invitesService.acceptBoardInvite(userId, token);
  res.json(result);
};
