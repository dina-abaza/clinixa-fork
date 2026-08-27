import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import { stopMedicationInfo, refillMedicationInfo } from '../patients/patients.controller';

const router = Router();
router.use(authMiddleware);

/**
 * @description إيقاف دواء بالـ ID (PATCH /api/medications/:id/stop)
 */
router.patch('/:id/stop', requirePermission('pat.edit'), stopMedicationInfo);

/**
 * @description تجديد دواء بالـ ID (PATCH /api/medications/:id/refill)
 */
router.patch('/:id/refill', requirePermission('pat.edit'), refillMedicationInfo);

export default router;
