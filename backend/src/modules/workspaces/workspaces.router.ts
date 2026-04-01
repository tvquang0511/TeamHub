import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import { workspacesRateLimit } from "../../common/middlewares/rateLimit";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from '../../common/middlewares/requireWorkspaceRole';
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
router.use(workspacesRateLimit);

router.post('/', createWorkspace);
router.get('/', listMyWorkspaces);
router.get('/:id', requireWorkspaceMember(), getWorkspaceDetail);
router.patch('/:id', requireWorkspaceAdmin(), updateWorkspace);
router.delete('/:id', requireWorkspaceOwner(), deleteWorkspace);
router.get('/:id/members', requireWorkspaceMember(), listWorkspaceMembers);

// Workspace background image upload (public)
router.post('/:id/background/init', requireWorkspaceAdmin(), initWorkspaceBackgroundUpload);
router.post('/:id/background/commit', requireWorkspaceAdmin(), commitWorkspaceBackgroundUpload);

// Workspace member management
router.patch('/:id/members/:userId', requireWorkspaceAdmin(), updateWorkspaceMemberRole);
router.delete('/:id/members/:userId', requireWorkspaceAdmin(), removeWorkspaceMember);
router.post('/:id/leave', requireWorkspaceMember(), leaveWorkspace);

export default router;
