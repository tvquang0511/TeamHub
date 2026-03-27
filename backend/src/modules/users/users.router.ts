import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import { getMe, searchUsers, updateMe, uploadAvatarCommit, uploadAvatarInit } from './users.controller';

const router = Router();
router.use(authJwt);

// GET /users/me
router.get('/me', getMe);

// PATCH /users/me
router.patch('/me', updateMe);

// POST /users/me/avatar/init
router.post('/me/avatar/init', uploadAvatarInit);

// POST /users/me/avatar/commit
router.post('/me/avatar/commit', uploadAvatarCommit);

// GET /users/search?q=inv&workspaceId=...&limit=10
router.get('/search', searchUsers);

export default router;
