import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createWorkspaceInputSchema,
  updateWorkspaceInputSchema,
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

const memberParamsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

const updateMemberRoleBodySchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const updateWorkspaceMemberRole = async (req: Request, res: Response) => {
  const { id: workspaceId, userId: targetUserId } = memberParamsSchema.parse(req.params);
  const body = updateMemberRoleBodySchema.parse(req.body);

  const result = await workspacesService.updateMemberRole(req.user!.id, workspaceId, targetUserId, body.role);
  return res.json(result);
};

export const removeWorkspaceMember = async (req: Request, res: Response) => {
  const { id: workspaceId, userId: targetUserId } = memberParamsSchema.parse(req.params);
  const result = await workspacesService.removeMember(req.user!.id, workspaceId, targetUserId);
  return res.json(result);
};

export const leaveWorkspace = async (req: Request, res: Response) => {
  const { id: workspaceId } = idParamSchema.parse(req.params);
  const result = await workspacesService.leave(req.user!.id, workspaceId);
  return res.json(result);
};

export const updateWorkspace = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const body = updateWorkspaceInputSchema.parse(req.body);
  const result = await workspacesService.updateWorkspace(req.user!.id, id, body);
  return res.json(result);
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await workspacesService.deleteWorkspace(req.user!.id, id);
  return res.json(result);
};
