import type { Knex } from 'knex';
import query from '../../db/sqlite/query';
import type { AttendanceStatus } from '@clinixa/shared';

/**
 * @description نوع سجل الحضور بعد الـ JOIN مع بيانات المريض
 */
export interface AttendanceRow {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_display_id: string;
  branch_id: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  items: string; // JSON string in DB
  created_by: string;
  updated_at: string;
}

/**
 * @description جلب سجلات الحضور ليوم وفرع محددين مع بيانات المريض بـ JOIN
 * @param {string} date - تاريخ اليوم (YYYY-MM-DD)
 * @param {string} branchId - معرّف الفرع
 * @param {Knex | Knex.Transaction} [db] - اتصال اختياري للمعاملات
 * @returns {Promise<AttendanceRow[]>} قائمة سجلات الحضور
 */
export async function findAttendanceByDateAndBranch(
  date: string,
  branchId: string,
  db: Knex | Knex.Transaction = query
): Promise<AttendanceRow[]> {
  const rows = await db('attendance')
    .join('patients', 'attendance.patient_id', 'patients.id')
    .where('attendance.date', date)
    .where('attendance.branch_id', branchId)
    .select(
      'attendance.id',
      'attendance.patient_id',
      'patients.name_ar as patient_name',
      'patients.display_id as patient_display_id',
      'attendance.branch_id',
      'attendance.date',
      'attendance.time',
      'attendance.status',
      'attendance.items',
      'attendance.created_by',
      'attendance.updated_at'
    )
    .orderBy('attendance.time', 'asc');

  return rows;
}

/**
 * @description البحث عن سجل حضور محدد بالـ ID
 */
export async function findAttendanceById(
  id: string,
  db: Knex | Knex.Transaction = query
): Promise<AttendanceRow | undefined> {
  const row = await db('attendance')
    .join('patients', 'attendance.patient_id', 'patients.id')
    .where('attendance.id', id)
    .select(
      'attendance.id',
      'attendance.patient_id',
      'patients.name_ar as patient_name',
      'patients.display_id as patient_display_id',
      'attendance.branch_id',
      'attendance.date',
      'attendance.time',
      'attendance.status',
      'attendance.items',
      'attendance.created_by',
      'attendance.updated_at'
    )
    .first();

  return row;
}

/**
 * @description إضافة سجل حضور جديد (Append-Only)
 */
export async function insertAttendance(
  data: {
    id: string;
    patient_id: string;
    branch_id: string;
    date: string;
    time: string;
    status: AttendanceStatus;
    items?: string;
    created_by: string;
  },
  db: Knex | Knex.Transaction = query
): Promise<void> {
  await db('attendance').insert({
    id: data.id,
    patient_id: data.patient_id,
    branch_id: data.branch_id,
    date: data.date,
    time: data.time,
    status: data.status,
    items: data.items ?? '[]',
    created_by: data.created_by,
  });
}

/**
 * @description التعديل الوحيد المسموح في سجل الحضور: تحديث حالة الكشف (status)
 * ⚠️ Append-Only — يُمنع منعًا باتًا وجود دالة delete أو تعديل عام للحقول
 */
export async function updateAttendanceStatus(
  id: string,
  status: AttendanceStatus,
  db: Knex | Knex.Transaction = query
): Promise<void> {
  await db('attendance')
    .where({ id })
    .update({
      status,
      updated_at: new Date().toISOString(),
    });
}
