import { Request, Response } from 'express';

import { usersService } from './users.service';

export const searchUsers = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await usersService.search(userId, req.query);
  return res.json(result);
};
