import { RequestHandler } from 'express';
import { ApiError } from '../errors/ApiError';
import { boardsRepo } from '../../modules/boards/boards.repo';

type BoardRole = 'OWNER' | 'ADMIN' | 'MEMBER';

type Options = {
  param?: string;
};

function getBoardId(req: any, param: string) {
  const boardId = String(req.params?.[param] ?? '').trim();
  if (!boardId) throw new ApiError(400, 'VALIDATION_ERROR', `Missing board id param: ${param}`);
  return boardId;
}

export function requireBoardMember(options: Options = {}): RequestHandler {
  const param = options.param ?? 'id';

  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

      const boardId = getBoardId(req, param);
      const membership = await boardsRepo.isBoardMember(boardId, userId);
      if (!membership) {
        return next(new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireBoardRole(allowed: BoardRole[], options: Options = {}): RequestHandler {
  const param = options.param ?? 'id';

  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

      const boardId = getBoardId(req, param);
      const membership = await boardsRepo.isBoardMember(boardId, userId);
      if (!membership) {
        return next(new ApiError(403, 'BOARD_FORBIDDEN', 'Not a board member'));
      }

      if (!allowed.includes(membership.role as BoardRole)) {
        return next(new ApiError(403, 'BOARD_FORBIDDEN', 'Insufficient board role'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireBoardAdmin(options: Options = {}): RequestHandler {
  return requireBoardRole(['OWNER', 'ADMIN'], options);
}

export function requireBoardOwner(options: Options = {}): RequestHandler {
  return requireBoardRole(['OWNER'], options);
}
