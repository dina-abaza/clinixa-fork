import { z } from 'zod';

/**
 * @description سكيمة إضافة رسم طبي مباشر (Charge)
 */
export const createChargeSchema = z.object({
  patient_id: z.string().min(1, 'معرّف المريض مطلوب'),
  type: z.string().min(1, 'نوع الرسم مطلوب'),
  amount: z.coerce.number().min(0, 'المبلغ غير صالح'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  time: z.string().default(() => new Date().toTimeString().split(' ')[0]),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;

/**
 * @description سكيمة تسجيل دفعة مالية (Payment)
 */
export const createPaymentSchema = z.object({
  patient_id: z.string().min(1, 'معرّف المريض مطلوب'),
  amount: z.coerce.number().min(0.01, 'مبلغ الدفع يجب أن يكون أكبر من ٠'),
  method: z.enum(['cash', 'card', 'wallet', 'bank_transfer']).default('cash'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * @description سكيمة الاستعلام عن ملخص اليوم
 */
export const daySummaryQuerySchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  branch_id: z.string().optional(),
});
