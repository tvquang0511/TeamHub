import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
	acceptInvite,
	acceptBoardInvite,
	createBoardInvite,
	createWorkspaceInvite,
	getBoardInviteByToken,
	getInviteByToken,
	listBoardInvites,
	listWorkspaceInvites,
	revokeBoardInvite,
	revokeWorkspaceInvite,
} from './invites.controller';

const router = Router();

router.use(authJwt);

// Workspace invites management
router.post('/workspaces/:workspaceId', createWorkspaceInvite);
router.get('/workspaces/:workspaceId', listWorkspaceInvites);
router.delete('/workspaces/:workspaceId/:inviteId', revokeWorkspaceInvite);

// Board invites management
router.post('/boards/:boardId', createBoardInvite);
router.get('/boards/:boardId', listBoardInvites);
router.delete('/boards/:boardId/:inviteId', revokeBoardInvite);

// Board invite lookup + accept (must be before generic /:token)
router.get('/boards/token/:token', getBoardInviteByToken);
router.post('/boards/token/:token/accept', acceptBoardInvite);

// Invite lookup + accept
router.get('/:token', getInviteByToken);
router.post('/:token/accept', acceptInvite);

export default router;
