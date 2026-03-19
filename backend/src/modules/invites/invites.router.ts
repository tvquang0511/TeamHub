import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
	acceptInvite,
	getInviteByToken,
	listWorkspaceInvites,
	revokeWorkspaceInvite,
} from './invites.controller';

const router = Router();

router.use(authJwt);

// Workspace invites management
router.get('/workspaces/:workspaceId', listWorkspaceInvites);
router.delete('/workspaces/:workspaceId/:inviteId', revokeWorkspaceInvite);

// Invite lookup + accept
router.get('/:token', getInviteByToken);
router.post('/:token/accept', acceptInvite);

export default router;
