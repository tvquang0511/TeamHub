import { Router } from 'express';
import authRoutes from '../modules/auth/auth.router';
import workspacesRoutes from '../modules/workspaces/workspaces.router';
import invitesRoutes from '../modules/invites/invites.router';
import { boardsRoutes } from '../modules/boards/boards.router';
import { listsRoutes } from '../modules/lists/lists.router';
import { cardsRoutes } from '../modules/cards/cards.router';
import usersRoutes from '../modules/users/users.router';
import { attachmentsRoutes } from '../modules/attachments/attachments.router';
import { labelsRoutes } from '../modules/labels/labels.router';
import { checklistsRoutes } from '../modules/checklists/checklists.router';
import { assigneesRoutes } from '../modules/assignees/assignees.router';
import { commentsRoutes } from '../modules/comments/comments.router';
import { analyticsRoutes } from '../modules/analytics/analytics.router';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspacesRoutes);
router.use('/invites', invitesRoutes);
router.use('/boards', boardsRoutes);
router.use('/lists', listsRoutes);
router.use('/cards', cardsRoutes);
router.use('/users', usersRoutes);
router.use('/attachments', attachmentsRoutes);
router.use('/labels', labelsRoutes);
router.use('/checklists', checklistsRoutes);
router.use('/assignees', assigneesRoutes);
router.use('/comments', commentsRoutes);
router.use('/', analyticsRoutes);

export default router;
