import crypto from 'crypto';
import query from '../../db/sqlite/query';
import { AppError } from '../../middlewares/error-handler.middleware';
import { calculatePatientDue } from '../../shared/utils/recalcDue';
import type { CreateChargeInput, CreatePaymentInput } from './payments.validation';
import type { ApiWarning } from '@clinixa/shared';

/**
 * @description جلب جميع الرسوم الطبية لمريض
 */
export async function getChargesByPatient(patientId: string) {
  return await query('charges').where({ patient_id: patientId }).orderBy('created_at', 'desc');
}

/**
 * @description إضافة رسم طبي جديد لمريض مع فحص المديونية السابقة وإرجاع Warning إن وجدت
 */
export async function createCharge(
  input: CreateChargeInput,
  branchId: string,
  employeeId: string
) {
  const priorDue = await calculatePatientDue(query, input.patient_id);

  const chargeId = `chg_${crypto.randomUUID()}`;
  await query('charges').insert({
    id: chargeId,
    patient_id: input.patient_id,
    branch_id: branchId,
    type: input.type,
    amount: input.amount,
    date: input.date,
    time: input.time,
    created_by: employeeId,
  });

  const newDue = await calculatePatientDue(query, input.patient_id);

  let warning: ApiWarning | null = null;
  if (priorDue > 0) {
    warning = {
      code: 'PATIENT_HAS_OUTSTANDING',
      message: 'المريض عليه مستحقات سابقة',
      meta: { current_due: newDue },
    };
  }

  return {
    data: {
      id: chargeId,
      patient_id: input.patient_id,
      type: input.type,
      amount: input.amount,
      date: input.date,
      time: input.time,
    },
    warning,
  };
}

/**
 * @description جلب جميع الدفعات المسددة لمريض
 */
export async function getPaymentsByPatient(patientId: string) {
  return await query('payments').where({ patient_id: patientId }).orderBy('created_at', 'desc');
}

/**
 * @description تسجيل دفعة مالية جديدة وتحديد ما إذا كانت بعد إقفال اليوم وإعادة بيانات الإيصال
 */
export async function createPayment(
  input: CreatePaymentInput,
  branchId: string,
  employeeId: string
) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  // فحص ما إذا كان اليوم المالي مغلقاً بالفرع
  const closure = await query('day_closures')
    .where({ branch_id: branchId, date: dateStr })
    .whereNull('reopened_at')
    .first();

  const afterDayClose = Boolean(closure);
  const paymentId = `pmt_${crypto.randomUUID()}`;

  await query('payments').insert({
    id: paymentId,
    patient_id: input.patient_id,
    branch_id: branchId,
    amount: input.amount,
    method: input.method,
    date: dateStr,
    time: timeStr,
    recorded_by: employeeId,
    after_day_close: afterDayClose ? 1 : 0,
  });

  const remainingDue = await calculatePatientDue(query, input.patient_id);

  const patient = await query('patients').where({ id: input.patient_id }).first();
  const branch = await query('branches').where({ id: branchId }).first();
  const clinic = await query('clinic_settings').where({ id: 'singleton' }).first();

  const methodLabelMap: Record<string, string> = {
    cash: 'كاش',
    card: 'فيزا (ماكينة)',
    wallet: 'محفظة إلكترونية',
    bank_transfer: 'تحويل بنكي',
  };

  const receipt = {
    clinic_name: clinic?.name_ar || 'Clinixa',
    branch_name: branch?.name_ar || '',
    branch_phone: branch?.phone || '',
    patient_name: patient?.name_ar || '',
    amount: input.amount,
    method: methodLabelMap[input.method] || input.method,
    date: dateStr,
    remaining_line_visible: remainingDue > 0,
    remaining_amount: remainingDue > 0 ? remainingDue : 0,
  };

  return {
    payment: {
      id: paymentId,
      patient_id: input.patient_id,
      amount: input.amount,
      method: input.method,
      date: dateStr,
      time: timeStr,
      recorded_by: employeeId,
      after_day_close: afterDayClose,
    },
    remaining_due: remainingDue,
    receipt,
  };
}

/**
 * @description جلب شاشة المستحقات والمديونيات للفرع (Outstanding)
 */
export async function getOutstandingPatients(branchId: string) {
  const patientIds = await query('charges')
    .where({ branch_id: branchId })
    .distinct('patient_id')
    .pluck('patient_id');

  const items: any[] = [];
  let totalOutstanding = 0;

  for (const pid of patientIds) {
    const due = await calculatePatientDue(query, pid);
    if (due > 0) {
      const patient = await query('patients').where({ id: pid }).first();
      const lastVisit = await query('attendance')
        .where({ patient_id: pid, status: 'done' })
        .orderBy('date', 'desc')
        .first();

      items.push({
        patient_id: pid,
        patient_name: patient?.name_ar || '',
        patient_display_id: patient?.display_id || '',
        due,
        last_visit_date: lastVisit?.date || null,
      });

      totalOutstanding += due;
    }
  }

  return {
    items,
    total_outstanding: totalOutstanding,
  };
}

/**
 * @description ملخص حركة الإيرادات والرسوم لليوم
 */
export async function getDaySummary(date: string, branchId: string) {
  const paymentsResult = await query('payments')
    .where({ branch_id: branchId, date })
    .sum('amount as total')
    .first();

  const chargesResult = await query('charges')
    .where({ branch_id: branchId, date })
    .sum('amount as total')
    .first();

  const closure = await query('day_closures')
    .where({ branch_id: branchId, date })
    .whereNull('reopened_at')
    .first();

  return {
    date,
    branch_id: branchId,
    total_collected: Number(paymentsResult?.total ?? 0),
    total_charges: Number(chargesResult?.total ?? 0),
    is_closed: Boolean(closure),
    closed_at: closure?.closed_at ?? null,
  };
}

/**
 * @description إقفال اليوم المالي بالفرع (Close Day)
 */
export async function closeDay(date: string, branchId: string, employeeId: string) {
  const existing = await query('day_closures')
    .where({ branch_id: branchId, date })
    .whereNull('reopened_at')
    .first();

  if (existing) {
    throw new AppError('CONFLICT', 'اليوم ده مقفول بالفعل', 409);
  }

  const summary = await getDaySummary(date, branchId);
  const now = new Date().toISOString();
  const id = `dc_${crypto.randomUUID()}`;

  await query('day_closures').insert({
    id,
    branch_id: branchId,
    date,
    closed_by: employeeId,
    closed_at: now,
  });

  return {
    date,
    closed_by: employeeId,
    closed_at: now,
    total_collected: summary.total_collected,
    total_charges: summary.total_charges,
  };
}

/**
 * @description إعادة فتح اليوم المالي (Reopen Day)
 */
export async function reopenDay(date: string, branchId: string, employeeId: string) {
  const existing = await query('day_closures')
    .where({ branch_id: branchId, date })
    .whereNull('reopened_at')
    .first();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'اليوم غير مقفول أصلاً', 404);
  }

  const now = new Date().toISOString();

  await query('day_closures')
    .where({ id: existing.id })
    .update({
      reopened_by: employeeId,
      reopened_at: now,
    });

  return {
    date,
    reopened_by: employeeId,
    reopened_at: now,
    message: 'تم إعادة فتح اليوم المالي بنجاح',
  };
}
