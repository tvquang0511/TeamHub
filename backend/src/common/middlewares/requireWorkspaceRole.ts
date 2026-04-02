import { RequestHandler } from 'express';
import { ApiError } from '../errors/ApiError';
import { workspacesRepo } from '../../modules/workspaces/workspaces.repo';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

type Options = {
  param?: string;
};

function getWorkspaceId(req: any, param: string) {
  const workspaceId = String(req.params?.[param] ?? '').trim();
  if (!workspaceId) throw new ApiError(400, 'VALIDATION_ERROR', `Missing workspace id param: ${param}`);
  return workspaceId;
}

export function requireWorkspaceMember(options: Options = {}): RequestHandler {
  const param = options.param ?? 'id';

  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

      const workspaceId = getWorkspaceId(req, param);
      const membership = await workspacesRepo.findMembership(workspaceId, userId);
      if (!membership) {
        return next(new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireWorkspaceRole(allowed: WorkspaceRole[], options: Options = {}): RequestHandler {
  const param = options.param ?? 'id';

  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

      const workspaceId = getWorkspaceId(req, param);
      const membership = await workspacesRepo.findMembership(workspaceId, userId);
      if (!membership) {
        return next(new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member'));
      }

      if (!allowed.includes(membership.role as WorkspaceRole)) {
        return next(new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireWorkspaceAdmin(options: Options = {}): RequestHandler {
  return requireWorkspaceRole(['OWNER', 'ADMIN'], options);
}

export function requireWorkspaceOwner(options: Options = {}): RequestHandler {
  return requireWorkspaceRole(['OWNER'], options);
}
