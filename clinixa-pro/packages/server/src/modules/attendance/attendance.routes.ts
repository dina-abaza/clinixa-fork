import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import {
  getQueue,
  checkIn,
  call,
  setStatus,
  finish,
  readyForCheckout,
} from './attendance.controller';

const router = Router();

// جميع المسارات تحمي بواسطة authMiddleware
router.use(authMiddleware);

// ⚠️ الـ static routes يجب أن تأتي قبل الـ dynamic routes (:id)
// وإلا Express سيعامل "ready-for-checkout" و "check-in" كـ :id
router.get('/ready-for-checkout', requirePermission('pay.add'), readyForCheckout);
router.post('/check-in', requirePermission('att.add'), checkIn);

router.get('/', requirePermission('att.view'), getQueue);
router.patch('/:id/call', requirePermission('att.edit'), call);
router.patch('/:id/status', requirePermission('att.edit'), setStatus);
router.post('/:id/finish', requirePermission('att.done'), finish);

export default router;
