import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth';
import { createInviteHandler, getInviteHandler } from '../controllers/onboardingController';

const router = Router();

router.post('/invite', adminAuth, createInviteHandler); // requer admin
router.get('/:token', getInviteHandler);                // público (seller acessa pelo link)

export default router;
