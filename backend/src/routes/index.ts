import { Router } from 'express';
import authRoutes from '../modules/auth/auth.router';
import workspacesRoutes from '../modules/workspaces/workspaces.router';
import invitesRoutes from '../modules/invites/invites.router';
import { boardsRoutes } from '../modules/boards/boards.router';
import { listsRoutes } from '../modules/lists/lists.router';
import { cardsRoutes } from '../modules/cards/cards.router';
import usersRoutes from '../modules/users/users.router';
import { attachmentsRoutes } from '../modules/attachments/attachments.router';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspacesRoutes);
router.use('/invites', invitesRoutes);
router.use('/boards', boardsRoutes);
router.use('/lists', listsRoutes);
router.use('/cards', cardsRoutes);
router.use('/users', usersRoutes);
router.use('/attachments', attachmentsRoutes);

export default router;
