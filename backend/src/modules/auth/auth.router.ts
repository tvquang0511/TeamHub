import { Router } from 'express';
import { login, logout, refresh, register, me } from './auth.controller';
import { authJwt } from '../../common/middlewares/authJwt';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authJwt, me);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
