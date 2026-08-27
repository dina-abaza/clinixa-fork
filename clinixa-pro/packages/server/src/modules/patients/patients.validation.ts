import { z } from 'zod';

/**
 * @description سكيمة الفلترة والترقيم عند استعلام المرضى
 */
export const queryPatientsSchema = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(25),
  include_inactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type QueryPatientsInput = z.infer<typeof queryPatientsSchema>;

/**
 * @description سكيمة إنشاء مريض جديد
 */
export const createPatientSchema = z.object({
  name_ar: z.string().min(3, 'الاسم لازم يكون أكتر من كلمتين أو ٣ أحرف'),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, 'رقم الهاتف غير صالح، يجب أن يكون ١١ رقم ويبدأ بـ 010/011/012/015'),
  age: z.coerce.number().min(0, 'العمر غير صالح').max(150, 'العمر غير صالح'),
  gender: z.enum(['male', 'female'], { message: 'النوع غير معروف' }),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  emergency_contact: z
    .object({
      name: z.string().nullable().optional(),
      relation: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/**
 * @description سكيمة تعديل بيانات مريض
 */
export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

/**
 * @description سكيمة تغيير حالة تفعيل المريض
 */
export const toggleActivePatientSchema = z.object({
  is_active: z.boolean(),
});

/**
 * @description سكيمة إضافة / تعديل جهة الاتصال الطارئة
 */
export const createEmergencyContactSchema = z.object({
  name: z.string().nullable().optional(),
  relation: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

/**
 * @description سكيمة إدراج موعد متابعة للمريض
 */
export const createFollowUpSchema = z.object({
  due_date: z.string().min(1, 'تاريخ المتابعة مطلوب'),
  reason: z.string().nullable().optional(),
  fee: z.coerce.number().nullable().optional(),
});

/**
 * @description سكيمة إضافة بند في التاريخ المرضي
 */
export const createMedicalHistorySchema = z.object({
  category: z.string().min(1, 'الفئة مطلوبة'),
  text_ar: z.string().min(1, 'النص العربي مطلوب'),
  text_en: z.string().nullable().optional(),
});

/**
 * @description سكيمة إضافة تشخيص طبي
 */
export const createDiagnosisSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  text_ar: z.string().min(1, 'تشخيص المرض مطلوب'),
  text_en: z.string().nullable().optional(),
});

/**
 * @description سكيمة إضافة دواء جديد للمريض
 */
export const createMedicationSchema = z.object({
  name: z.string().min(1, 'اسم الدواء مطلوب'),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  since: z.string().nullable().optional(),
  status: z.enum(['active', 'completed']).default('active'),
});

/**
 * @description سكيمة بند في الروشتة الطبية
 */
export const prescriptionItemSchema = z.object({
  drug: z.string().min(1, 'اسم الدواء مطلوب'),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
});

/**
 * @description سكيمة إنشاء روشتة طبية كاملة
 */
export const createPrescriptionSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  items: z.array(prescriptionItemSchema).min(1, 'يجب إضافة دواء واحد على الأقل للروشتة'),
});

/**
 * @description سكيمة إضافة تحليل طبي
 */
export const createLabSchema = z.object({
  name: z.string().min(1, 'اسم التحليل مطلوب'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  status: z.enum(['normal', 'abnormal', 'pending']).default('pending'),
  doctor_id: z.string().nullable().optional(),
  has_attachment: z.boolean().default(false),
});

/**
 * @description سكيمة إضافة أشعة طبية
 */
export const createRadiologySchema = z.object({
  type: z.string().min(1, 'نوع الأشعة مطلوب'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  report: z.string().nullable().optional(),
  has_attachment: z.boolean().default(false),
});

export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;
export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type CreateLabInput = z.infer<typeof createLabSchema>;
export type CreateRadiologyInput = z.infer<typeof createRadiologySchema>;


