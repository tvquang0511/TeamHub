import { Router } from 'express';
import { authJwt } from '../../common/middlewares/authJwt';
import { acceptInvite } from './invites.controller';

const router = Router();

router.use(authJwt);
router.post('/:token/accept', acceptInvite);

export default router;
