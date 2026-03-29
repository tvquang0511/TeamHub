import { Router } from 'express';
import { forgotPassword, login, logout, refresh, register, resetPassword, me } from './auth.controller';
import { authJwt } from '../../common/middlewares/authJwt';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authJwt, me);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
