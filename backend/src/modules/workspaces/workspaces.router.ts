import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetail,
  listMyWorkspaces,
  listWorkspaceMembers,
  leaveWorkspace,
  removeWorkspaceMember,
  updateWorkspace,
  updateWorkspaceMemberRole,
} from './workspaces.controller';

const router = Router();

router.use(authJwt);

router.post('/', createWorkspace);
router.get('/', listMyWorkspaces);
router.get('/:id', getWorkspaceDetail);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.get('/:id/members', listWorkspaceMembers);

// Workspace member management
router.patch('/:id/members/:userId', updateWorkspaceMemberRole);
router.delete('/:id/members/:userId', removeWorkspaceMember);
router.post('/:id/leave', leaveWorkspace);

export default router;
