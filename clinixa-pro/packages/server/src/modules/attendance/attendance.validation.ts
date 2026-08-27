import { z } from 'zod';

/**
 * @description سكيمة استعلام سجلات الحضور
 */
export const queryAttendanceSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  branch_id: z.string().optional(),
});

export type QueryAttendanceInput = z.infer<typeof queryAttendanceSchema>;

/**
 * @description سكيمة تسجيل دخول مريض للطابور (Check-in)
 */
export const checkInSchema = z.object({
  patient_id: z.string().min(1, 'معرّف المريض مطلوب'),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

/**
 * @description سكيمة تغيير حالة الحضور (noshow / left)
 */
export const updateStatusSchema = z.object({
  status: z.enum(['noshow', 'left'], { message: 'الحالة غير مسموح بها' }),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/**
 * @description بند خدمة/رسوم عند إنهاء الكشف
 */
export const finishChargeItemSchema = z.object({
  charge_type: z.string().min(1, 'نوع الرسم مطلوب'),
  amount: z.coerce.number().min(0, 'المبلغ يجب أن يكون أكبر من أو يساوي ٠'),
});

/**
 * @description بيانات المتابعة عند إنهاء الكشف
 */
export const finishFollowUpSchema = z.object({
  days: z.coerce.number().min(1, 'عدد الأيام مطلوب'),
  fee: z.coerce.number().min(0).nullable().optional(),
  reason: z.string().nullable().optional(),
});

/**
 * @description سكيمة الفعل المركّب عند إنهاء الكشف (Finish Attendance)
 */
export const finishAttendanceSchema = z.object({
  items: z.array(finishChargeItemSchema).optional().default([]),
  follow_up: finishFollowUpSchema.nullable().optional(),
});

export type FinishAttendanceInput = z.infer<typeof finishAttendanceSchema>;
