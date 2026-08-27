import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error-handler.middleware';
import {
  queryPatientsSchema,
  createPatientSchema,
  updatePatientSchema,
  toggleActivePatientSchema,
  createMedicalHistorySchema,
  createDiagnosisSchema,
  createMedicationSchema,
  createPrescriptionSchema,
  createLabSchema,
  createRadiologySchema,
} from './patients.validation';
import { z } from 'zod';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  togglePatientActive,
  getMedicalRecord,
  addMedicalAlert,
  addMedicalHistory,
  addDiagnosis,
  addMedication,
  stopMedication,
  refillMedication,
  addPrescription,
  addLab,
  addRadiology,
} from './patients.service';
import { calculatePatientDue } from '../../shared/utils/recalcDue';
import query from '../../db/sqlite/query';

/**
 * @description سكيمة إضافة التنبيه الطبي محلياً في الكنترولر
 */
const createMedicalAlertSchema = z.object({
  type: z.enum(['allergy', 'warning', 'chronic', 'other'], { message: 'النوع غير صالح' }),
  text_ar: z.string().min(1, 'النص العربي مطلوب'),
  text_en: z.string().nullable().optional(),
});

/**
 * @description معالجة طلب جلب قائمة المرضى المصفحة (GET /api/patients)
 */
export async function listPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = queryPatientsSchema.safeParse(req.query);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await getPatients(parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب جلب مريض محدد بـ ID (GET /api/patients/:id)
 */
export async function getPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const result = await getPatientById(patientId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب إنشاء مريض جديد (POST /api/patients)
 */
export async function createNewPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const branchId = req.employee?.branch_id ?? null;
    const { data, warning } = await createPatient(parsed.data, branchId);
    res.status(201).json({ ok: true, data, warning });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب تعديل بيانات مريض (PUT /api/patients/:id)
 */
export async function updatePatientInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const { data, warning } = await updatePatient(patientId, parsed.data);
    res.status(200).json({ ok: true, data, warning });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب تفعيل / تعطيل مريض (PATCH /api/patients/:id/toggle-active)
 */
export async function toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = toggleActivePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await togglePatientActive(patientId, parsed.data.is_active);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب جلب المستحق اللحظي لمريض (GET /api/patients/:id/due)
 */
export async function getDue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const due = await calculatePatientDue(query, patientId);
    res.status(200).json({ ok: true, data: { patient_id: patientId, due }, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب جلب السجل الطبي الكامل (GET /api/patients/:id/medical-record)
 */
export async function getMedicalRecordInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const result = await getMedicalRecord(patientId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة تنبيه طبي للمريض (POST /api/patients/:id/medical-alerts)
 * الأنواع المدعومة: allergy | warning | chronic | other
 */
export async function addMedicalAlertInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createMedicalAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addMedicalAlert(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة بند في التاريخ المرضي (POST /api/patients/:id/medical-history)
 */
export async function addHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createMedicalHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addMedicalHistory(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة تشخيص (POST /api/patients/:id/diagnoses)
 */
export async function addDiagnosisInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createDiagnosisSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addDiagnosis(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة دواء (POST /api/patients/:id/medications)
 */
export async function addMedicationInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addMedication(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إيقاف دواء (PATCH /api/medications/:id/stop)
 */
export async function stopMedicationInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const medicationId = req.params.id as string;
    const result = await stopMedication(medicationId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description تجديد دواء (PATCH /api/medications/:id/refill)
 */
export async function refillMedicationInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const medicationId = req.params.id as string;
    const result = await refillMedication(medicationId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة روشتة (POST /api/patients/:id/prescriptions)
 */
export async function addPrescriptionInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createPrescriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const doctorId = req.employee?.id ?? null;
    const result = await addPrescription(patientId, doctorId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة تحليل (POST /api/patients/:id/labs)
 */
export async function addLabInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createLabSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addLab(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description إضافة أشعة (POST /api/patients/:id/radiology)
 */
export async function addRadiologyInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.params.id as string;
    const parsed = createRadiologySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await addRadiology(patientId, parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}
