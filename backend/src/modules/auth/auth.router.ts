import { Router } from 'express';
import { forgotPassword, login, logout, refresh, register, resetPassword, me } from './auth.controller';
import { authJwt } from '../../common/middlewares/authJwt';
import { authRateLimit, passwordRateLimit } from "../../common/middlewares/rateLimit";

const router = Router();

// Default auth rate limit (per IP) for all auth endpoints.
router.use(authRateLimit);

router.post('/register', register);
router.post('/login', login);
router.get('/me', authJwt, me);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', passwordRateLimit, forgotPassword);
router.post('/reset-password', passwordRateLimit, resetPassword);

export default router;
