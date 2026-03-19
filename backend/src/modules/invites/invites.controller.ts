import { Request, Response } from 'express';
import { invitesService } from './invites.service';

export const acceptInvite = async (req: Request, res: Response) => {
  const token = String(req.params.token);
  const userId = req.user!.id;

  const result = await invitesService.acceptWorkspaceInvite(userId, token);
  res.json(result);
};
