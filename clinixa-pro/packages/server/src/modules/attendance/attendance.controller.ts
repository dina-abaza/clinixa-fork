import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error-handler.middleware';
import { resolveBranchId } from '../../shared/utils/resolveBranch';
import {
  queryAttendanceSchema,
  checkInSchema,
  updateStatusSchema,
  finishAttendanceSchema,
} from './attendance.validation';
import {
  getAttendanceQueue,
  checkInPatient,
  callPatient,
  updateStatus,
  finishAttendance,
  getReadyForCheckout,
} from './attendance.service';

/**
 * @description جلب طابور الحضور لليوم (GET /api/attendance)
 */
export async function getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = queryAttendanceSchema.safeParse(req.query);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const branchId = await resolveBranchId(parsed.data.branch_id || req.employee?.branch_id);
    const items = await getAttendanceQueue(parsed.data.date, branchId);
    res.status(200).json({ ok: true, data: { items }, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description تسجيل دخول مريض للطابور (POST /api/attendance/check-in)
 */
export async function checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const employeeId = req.employee?.id;
    if (!employeeId) {
      throw new AppError('UNAUTHORIZED', 'يجب تسجيل الدخول أولاً', 401);
    }

    const branchId = await resolveBranchId(req.employee?.branch_id);
    const result = await checkInPatient(parsed.data.patient_id, branchId, employeeId);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description نداء المريض للكشف (PATCH /api/attendance/:id/call)
 */
export async function call(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attendanceId = req.params.id as string;
    const branchId = await resolveBranchId(req.employee?.branch_id);

    const result = await callPatient(attendanceId, branchId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description تغيير حالة الحضور إلى noshow أو left (PATCH /api/attendance/:id/status)
 */
export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attendanceId = req.params.id as string;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await updateStatus(attendanceId, parsed.data.status);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description الفعل المركّب عند إنهاء الكشف (POST /api/attendance/:id/finish)
 */
export async function finish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attendanceId = req.params.id as string;
    const parsed = finishAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const permissions = req.employee?.permissions || [];
    const employeeId = req.employee?.id || '';

    const result = await finishAttendance(attendanceId, permissions, employeeId, parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description جلب قائمة جاهزي التحصيل (GET /api/attendance/ready-for-checkout)
 */
export async function readyForCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = await resolveBranchId(req.employee?.branch_id);
    const items = await getReadyForCheckout(branchId);
    res.status(200).json({ ok: true, data: { items }, warning: null });
  } catch (err) {
    next(err);
  }
}
