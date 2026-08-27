import crypto from 'crypto';
import query from '../../db/sqlite/query';
import { AppError } from '../../middlewares/error-handler.middleware';
import { calculatePatientDue } from '../../shared/utils/recalcDue';
import {
  findAttendanceByDateAndBranch,
  findAttendanceById,
  insertAttendance,
  updateAttendanceStatus,
} from './attendance.repository';
import type { FinishAttendanceInput } from './attendance.validation';
import type { Permission } from '@clinixa/shared';

/**
 * @description جلب طابور الحضور لفرع وتاريخ محددين
 */
export async function getAttendanceQueue(date: string, branchId: string) {
  const rows = await findAttendanceByDateAndBranch(date, branchId);
  return rows.map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    patient_name: r.patient_name,
    patient_display_id: r.patient_display_id,
    date: r.date,
    time: r.time,
    status: r.status,
    items: JSON.parse(r.items || '[]'),
  }));
}

/**
 * @description تسجيل دخول مريض للطابور (Check-in)
 */
export async function checkInPatient(patientId: string, branchId: string, employeeId: string) {
  const patient = await query('patients').where({ id: patientId }).first();

  if (!patient || !patient.is_active) {
    throw new AppError('VALIDATION_ERROR', 'المريض ده معطّل، لازم تفعّله الأول', 400, 'patient_id');
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const id = `att_${crypto.randomUUID()}`;

  await insertAttendance({
    id,
    patient_id: patientId,
    branch_id: branchId,
    date: dateStr,
    time: timeStr,
    status: 'waiting',
    created_by: employeeId,
  });

  return {
    id,
    patient_id: patientId,
    status: 'waiting' as const,
    date: dateStr,
    time: timeStr,
  };
}

/**
 * @description نداء المريض للدخول للكشف (Call) — يحوّل الحالة لـ in_progress ويقفل أي كشف نشط آخر بالفرع
 */
export async function callPatient(attendanceId: string, branchId: string) {
  const attendance = await findAttendanceById(attendanceId);

  if (!attendance) {
    throw new AppError('NOT_FOUND', 'سجل الحضور غير موجود', 404);
  }

  const today = new Date().toISOString().split('T')[0];

  await query.transaction(async (trx) => {
    // إقفال أي كشف نشط آخر بنفس الفرع لليوم
    const activeOthers = await trx('attendance')
      .where({ branch_id: branchId, date: today, status: 'in_progress' })
      .whereNot({ id: attendanceId });

    for (const other of activeOthers) {
      await updateAttendanceStatus(other.id, 'done', trx);
    }

    await updateAttendanceStatus(attendanceId, 'in_progress', trx);
  });

  return { id: attendanceId, status: 'in_progress' as const };
}

/**
 * @description تغيير حالة الحضور إلى لم يحضر (noshow) أو غادر (left)
 */
export async function updateStatus(attendanceId: string, status: 'noshow' | 'left') {
  const attendance = await findAttendanceById(attendanceId);

  if (!attendance) {
    throw new AppError('NOT_FOUND', 'سجل الحضور غير موجود', 404);
  }

  await updateAttendanceStatus(attendanceId, status);
  return { id: attendanceId, status };
}

/**
 * @description الفعل المركّب عند إنهاء الكشف (Finish Attendance)
 * ينشئ بنود الرسوم والمتابعة ويحسب المستحق النهائي بـ Transaction واحدة
 */
export async function finishAttendance(
  attendanceId: string,
  employeePermissions: Permission[],
  employeeId: string,
  input: FinishAttendanceInput
) {
  const attendance = await findAttendanceById(attendanceId);

  if (!attendance) {
    throw new AppError('NOT_FOUND', 'سجل الحضور غير موجود', 404);
  }

  const hasPayAddPermission = employeePermissions.includes('pay.add');

  if (input.items && input.items.length > 0 && !hasPayAddPermission) {
    throw new AppError('FORBIDDEN', 'مفيش صلاحية لإضافة بنود رسوم', 403);
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const chargesCreated: any[] = [];
  let followUpCreated: any = null;

  await query.transaction(async (trx) => {
    await updateAttendanceStatus(attendanceId, 'done', trx);

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const chargeId = `chg_${crypto.randomUUID()}`;
        await trx('charges').insert({
          id: chargeId,
          patient_id: attendance.patient_id,
          branch_id: attendance.branch_id,
          type: item.charge_type,
          amount: item.amount,
          date: dateStr,
          time: timeStr,
          attendance_id: attendance.id,
          created_by: employeeId,
        });

        chargesCreated.push({
          id: chargeId,
          type: item.charge_type,
          amount: item.amount,
          date: dateStr,
          time: timeStr,
        });
      }
    }

    if (input.follow_up) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + input.follow_up.days);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const followUpId = `fu_${crypto.randomUUID()}`;

      await trx('patient_follow_ups').insert({
        id: followUpId,
        patient_id: attendance.patient_id,
        branch_id: attendance.branch_id,
        due_date: dueDateStr,
        reason: input.follow_up.reason ?? null,
        fee: input.follow_up.fee ?? null,
        status: 'scheduled',
      });

      followUpCreated = {
        id: followUpId,
        due_date: dueDateStr,
        fee: input.follow_up.fee ?? 0,
        status: 'scheduled',
      };
    }
  });

  const finalDue = await calculatePatientDue(query, attendance.patient_id);
  const canCollect = finalDue > 0 && hasPayAddPermission;

  return {
    attendance: { id: attendance.id, status: 'done' as const },
    charges_created: chargesCreated,
    follow_up_created: followUpCreated,
    final_due: finalDue,
    can_collect: canCollect,
  };
}

/**
 * @description جلب قائمة المرضى جاهزي التحصيل (Ready for Checkout)
 */
export async function getReadyForCheckout(branchId: string) {
  const today = new Date().toISOString().split('T')[0];
  const rows = await query('attendance')
    .join('patients', 'attendance.patient_id', 'patients.id')
    .where('attendance.branch_id', branchId)
    .where('attendance.date', today)
    .where('attendance.status', 'done')
    .select(
      'attendance.id as attendance_id',
      'patients.id as patient_id',
      'patients.name_ar as patient_name',
      'patients.display_id as patient_display_id'
    );

  const readyList = await Promise.all(
    rows.map(async (r) => {
      const due = await calculatePatientDue(query, r.patient_id);
      return {
        ...r,
        due,
      };
    })
  );

  return readyList.filter((item) => item.due > 0);
}
