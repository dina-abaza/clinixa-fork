import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error-handler.middleware';
import { resolveBranchId } from '../../shared/utils/resolveBranch';
import {
  createChargeSchema,
  createPaymentSchema,
  daySummaryQuerySchema,
} from './payments.validation';
import {
  getChargesByPatient,
  createCharge,
  getPaymentsByPatient,
  createPayment,
  getOutstandingPatients,
  getDaySummary,
  closeDay,
  reopenDay,
} from './payments.service';

/**
 * @description جلب الرسوم لمريض (GET /api/charges?patient_id=xxx)
 */
export async function listCharges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.query.patient_id as string;
    if (!patientId) {
      throw new AppError('VALIDATION_ERROR', 'معرّف المريض مطلوب', 400, 'patient_id');
    }

    const items = await getChargesByPatient(patientId);
    res.status(200).json({ ok: true, data: { items }, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة رسم طبي (POST /api/charges)
 */
export async function addCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createChargeSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const branchId = await resolveBranchId(req.employee?.branch_id);
    const employeeId = req.employee?.id || '';

    const { data, warning } = await createCharge(parsed.data, branchId, employeeId);
    res.status(201).json({ ok: true, data, warning });
  } catch (err) {
    next(err);
  }
}

/**
 * @description جلب المدفوعات لمريض (GET /api/payments?patient_id=xxx)
 */
export async function listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.query.patient_id as string;
    if (!patientId) {
      throw new AppError('VALIDATION_ERROR', 'معرّف المريض مطلوب', 400, 'patient_id');
    }

    const items = await getPaymentsByPatient(patientId);
    res.status(200).json({ ok: true, data: { items }, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description تسجيل دفعة مالية (POST /api/payments)
 */
export async function addPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const branchId = await resolveBranchId(req.employee?.branch_id);
    const employeeId = req.employee?.id || '';

    const result = await createPayment(parsed.data, branchId, employeeId);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description جلب قائمة المديونيات والمستحقات (GET /api/payments/outstanding)
 */
export async function listOutstanding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = await resolveBranchId((req.query.branch_id as string) || req.employee?.branch_id);
    const result = await getOutstandingPatients(branchId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description جلب ملخص إيرادات اليوم (GET /api/day-summary)
 */
export async function getDaySummaryInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = daySummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const branchId = await resolveBranchId(parsed.data.branch_id || req.employee?.branch_id);
    const result = await getDaySummary(parsed.data.date, branchId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إقفال اليوم المالي (POST /api/day-summary/close)
 */
export async function closeDayInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = (req.body.date as string) || new Date().toISOString().split('T')[0];
    const branchId = await resolveBranchId(req.employee?.branch_id);
    const employeeId = req.employee?.id || '';

    const result = await closeDay(date, branchId, employeeId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إعادة فتح اليوم المالي (POST /api/day-summary/reopen)
 */
export async function reopenDayInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = (req.body.date as string) || new Date().toISOString().split('T')[0];
    const branchId = await resolveBranchId(req.employee?.branch_id);
    const employeeId = req.employee?.id || '';

    const result = await reopenDay(date, branchId, employeeId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}
