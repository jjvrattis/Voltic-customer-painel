import { Router } from 'express';
import { createInviteHandler, getInviteHandler } from '../controllers/onboardingController';

const router = Router();

router.post('/invite', createInviteHandler);
router.get('/:token', getInviteHandler);

export default router;
