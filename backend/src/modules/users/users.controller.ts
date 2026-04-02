import { Request, Response } from 'express';

import { usersService } from './users.service';

export const searchUsers = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.search(userId, req.query);
  return res.json(result);
};

export const getMe = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.getMe(userId);
  return res.json(result);
};

export const updateMe = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.updateMe(userId, req.body);
  return res.json(result);
};

export const uploadAvatarInit = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.initAvatarUpload(userId, req.body);
  return res.json(result);
};

export const uploadAvatarCommit = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.commitAvatarUpload(userId, req.body);
  return res.json(result);
};
