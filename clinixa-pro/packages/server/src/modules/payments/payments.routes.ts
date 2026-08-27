import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import {
  listCharges,
  addCharge,
  listPayments,
  addPayment,
  listOutstanding,
  getDaySummaryInfo,
  closeDayInfo,
  reopenDayInfo,
} from './payments.controller';

// Router للمدوفوعات والرسوم المباشرة
export const paymentsRouter = Router();
paymentsRouter.use(authMiddleware);

paymentsRouter.get('/outstanding', requirePermission('pay.view'), listOutstanding);
paymentsRouter.get('/', requirePermission('pay.view'), listPayments);
paymentsRouter.post('/', requirePermission('pay.add'), addPayment);

// Router للرسوم الطبية
export const chargesRouter = Router();
chargesRouter.use(authMiddleware);

chargesRouter.get('/', requirePermission('pay.view'), listCharges);
chargesRouter.post('/', requirePermission('pay.add'), addCharge);

// Router لإقفال اليومية وملخص الإيرادات
export const daySummaryRouter = Router();
daySummaryRouter.use(authMiddleware);

daySummaryRouter.get('/', requirePermission('pay.view'), getDaySummaryInfo);
daySummaryRouter.post('/close', requirePermission('pay.edit'), closeDayInfo);
daySummaryRouter.post('/reopen', requirePermission('pay.edit'), reopenDayInfo);
