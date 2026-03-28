import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import {
  commitWorkspaceBackgroundUpload,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetail,
  initWorkspaceBackgroundUpload,
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

// Workspace background image upload (public)
router.post('/:id/background/init', initWorkspaceBackgroundUpload);
router.post('/:id/background/commit', commitWorkspaceBackgroundUpload);

// Workspace member management
router.patch('/:id/members/:userId', updateWorkspaceMemberRole);
router.delete('/:id/members/:userId', removeWorkspaceMember);
router.post('/:id/leave', leaveWorkspace);

export default router;
