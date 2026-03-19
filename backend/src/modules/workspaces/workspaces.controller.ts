import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createWorkspaceInputSchema,
  createWorkspaceInviteInputSchema,
  workspacesService,
} from './workspaces.service';

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const createWorkspace = async (req: Request, res: Response) => {
  const body = createWorkspaceInputSchema.parse(req.body);
  const result = await workspacesService.createWorkspace(req.user!.id, body);
  return res.status(201).json(result);
};

export const listMyWorkspaces = async (req: Request, res: Response) => {
  const result = await workspacesService.listMyWorkspaces(req.user!.id);
  return res.json(result);
};

export const getWorkspaceDetail = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await workspacesService.getWorkspaceDetail(req.user!.id, id);
  return res.json(result);
};

export const listWorkspaceMembers = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await workspacesService.listMembers(req.user!.id, id);
  return res.json(result);
};

export const createWorkspaceInvite = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const body = createWorkspaceInviteInputSchema.parse(req.body);
  const result = await workspacesService.createInvite(req.user!.id, id, body);
  return res.status(201).json(result);
};
