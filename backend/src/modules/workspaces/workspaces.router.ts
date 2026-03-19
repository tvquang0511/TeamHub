import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
  createWorkspace,
  createWorkspaceInvite,
  getWorkspaceDetail,
  listMyWorkspaces,
  listWorkspaceMembers,
} from './workspaces.controller';

const router = Router();

router.use(authJwt);

router.post('/', createWorkspace);
router.get('/', listMyWorkspaces);
router.get('/:id', getWorkspaceDetail);
router.get('/:id/members', listWorkspaceMembers);
router.post('/:id/invites', createWorkspaceInvite);

export default router;
