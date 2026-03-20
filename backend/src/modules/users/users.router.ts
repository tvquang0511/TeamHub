import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import { searchUsers } from './users.controller';

const router = Router();
router.use(authJwt);

// GET /users/search?q=inv&workspaceId=...&limit=10
router.get('/search', searchUsers);

export default router;
