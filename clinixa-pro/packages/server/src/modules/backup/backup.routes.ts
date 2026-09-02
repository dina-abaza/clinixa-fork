import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import { runBackupInfo, getBackupHistory, updateBackupDestination, restoreBackupInfo } from './backup.controller';

const router = Router();

// تطبيق ميدلوير المصادقة على جميع مسارات النسخ الاحتياطي
router.use(authMiddleware);

router.post('/run', requirePermission('admin.edit'), runBackupInfo);
router.get('/history', requirePermission('admin.view'), getBackupHistory);
router.put('/destination', requirePermission('admin.edit'), updateBackupDestination);
router.post('/restore', requirePermission('admin.edit'), restoreBackupInfo);

export default router;
