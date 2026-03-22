import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
	acceptInvite,
	acceptMyWorkspaceInvite,
	createWorkspaceInvite,
	declineMyWorkspaceInvite,
	getInviteByToken,
	listMyWorkspaceInvites,
	listWorkspaceInvites,
	revokeWorkspaceInvite,
} from './invites.controller';

const router = Router();

router.use(authJwt);

// Inbox (topbar notifications)
router.get('/inbox/workspaces', listMyWorkspaceInvites);
router.post('/inbox/workspaces/:inviteId/accept', acceptMyWorkspaceInvite);
router.post('/inbox/workspaces/:inviteId/decline', declineMyWorkspaceInvite);

// Workspace invites management
router.post('/workspaces/:workspaceId', createWorkspaceInvite);
router.get('/workspaces/:workspaceId', listWorkspaceInvites);
router.delete('/workspaces/:workspaceId/:inviteId', revokeWorkspaceInvite);

// Board invites management
// Board invites are deprecated: adding members to a board is now direct via
// POST /boards/:id/members or POST /boards/:id/members/by-email

// Invite lookup + accept
router.get('/:token', getInviteByToken);
router.post('/:token/accept', acceptInvite);

export default router;
