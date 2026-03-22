import { Request, Response } from "express";
import { z } from "zod";

import { boardsService } from "./boards.service";

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
});

const addMemberByEmailSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
});

export class BoardMembersController {
  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const result = await boardsService.listMembers(userId, boardId);
    res.status(200).json(result);
  };

  add = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const boardId = String(req.params.id);
    const input = addMemberSchema.parse(req.body);
    const result = await boardsService.addMember(actorId, boardId, input);
    res.status(201).json(result);
  };

  addByEmail = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const boardId = String(req.params.id);
    const input = addMemberByEmailSchema.parse(req.body);
    const result = await boardsService.addMemberByEmail(actorId, boardId, input);
    res.status(201).json(result);
  };

  remove = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const boardId = String(req.params.id);
    const memberUserId = String(req.params.userId);
    const result = await boardsService.removeMember(actorId, boardId, memberUserId);
    res.status(200).json(result);
  };

  updateRole = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const boardId = String(req.params.id);
    const memberUserId = String(req.params.userId);
    const input = z
      .object({ role: z.enum(["ADMIN", "MEMBER"]) })
      .parse(req.body);

    const result = await boardsService.updateMemberRole(actorId, boardId, memberUserId, input.role);
    res.status(200).json(result);
  };
}

export const boardMembersController = new BoardMembersController();
