import crypto from 'crypto';
import query from '../../db/sqlite/query';
import { AppError } from '../../middlewares/error-handler.middleware';
import { normalizeArabicText } from '../../shared/utils/arabicNormalize';
import { generatePatientDisplayId } from '../../shared/utils/idGenerator';
import { mapArabicNameToEnglish } from '../../shared/utils/nameMap';
import { calculatePatientDue } from '../../shared/utils/recalcDue';
import type {
  QueryPatientsInput,
  CreatePatientInput,
  UpdatePatientInput,
  CreateEmergencyContactInput,
  CreateFollowUpInput,
  CreateMedicalHistoryInput,
  CreateDiagnosisInput,
  CreateMedicationInput,
  CreatePrescriptionInput,
  CreateLabInput,
  CreateRadiologyInput,
} from './patients.validation';
import type { ApiWarning } from '@clinixa/shared';

/**
 * @description جلب قائمة المرضى المصفحة مع حساب المستحق اللحظي وإمكانيات البحث
 * @param {QueryPatientsInput} input - خيارات البحث والصفحات
 * @returns {Promise<{ items: any[]; page: number; page_size: number; total_items: number; total_pages: number }>} قائمة المرضى وبيانات الترقيم
 */
export async function getPatients(input: QueryPatientsInput) {
  let builder = query('patients');

  if (!input.include_inactive) {
    builder = builder.where('is_active', 1);
  }

  if (input.search) {
    const norm = normalizeArabicText(input.search);
    builder = builder.where((q) => {
      q.where('name_ar_normalized', 'like', `%${norm}%`)
        .orWhere('phone', 'like', `%${input.search}%`)
        .orWhere('display_id', 'like', `%${input.search}%`);
    });
  }

  const countResult = await builder.clone().count('id as total').first();
  const totalItems = Number(countResult?.total ?? 0);
  const totalPages = Math.ceil(totalItems / input.page_size) || 1;
  const offset = (input.page - 1) * input.page_size;

  const rows = await builder
    .clone()
    .select(
      'id',
      'display_id',
      'name_ar',
      'name_en',
      'phone',
      'age',
      'gender',
      'home_branch_id',
      'is_active'
    )
    .orderBy('created_at', 'desc')
    .limit(input.page_size)
    .offset(offset);

  // حساب المستحق اللحظي لكل مريض في القائمة
  const items = await Promise.all(
    rows.map(async (p) => {
      const due = await calculatePatientDue(query, p.id);
      return {
        ...p,
        is_active: Boolean(p.is_active),
        due,
      };
    })
  );

  return {
    items,
    page: input.page,
    page_size: input.page_size,
    total_items: totalItems,
    total_pages: totalPages,
  };
}

/**
 * @description جلب تفاصيل مريض محدد بالـ ID مع بيانات الطوارئ والمستحق المحسوب
 * @param {string} patientId - معرف المريض
 * @returns {Promise<any>} بيانات المريض الكاملة
 * @throws {AppError} 404 NOT_FOUND لو المريض غير موجود
 */
export async function getPatientById(patientId: string) {
  const patient = await query('patients').where({ id: patientId }).first();

  if (!patient) {
    throw new AppError('NOT_FOUND', 'المريض غير موجود', 404);
  }

  const emergencyContact = await query('patient_emergency_contacts')
    .where({ patient_id: patientId })
    .select('name', 'relation', 'phone')
    .first();

  const due = await calculatePatientDue(query, patientId);

  return {
    id: patient.id,
    display_id: patient.display_id,
    name_ar: patient.name_ar,
    name_en: patient.name_en,
    phone: patient.phone,
    age: patient.age,
    gender: patient.gender,
    address: patient.address,
    notes: patient.notes,
    home_branch_id: patient.home_branch_id,
    is_active: Boolean(patient.is_active),
    due,
    emergency_contact: emergencyContact
      ? {
          name: emergencyContact.name,
          relation: emergencyContact.relation,
          phone: emergencyContact.phone,
        }
      : null,
    created_at: patient.created_at,
  };
}

/**
 * @description إنشاء مريض جديد مع فحص تكرار رقم الهاتف وتوليد المعرف والترجمات
 * @param {CreatePatientInput} input - بيانات المريض الجديد
 * @param {string | null} branchId - فرع الجلسة الحالي لتسجيله كفرع رئيسي للمريض
 * @returns {Promise<{ data: any; warning: ApiWarning | null }>} المريض الجديد وملاحظة التكرار إن وجدت
 */
export async function createPatient(input: CreatePatientInput, branchId: string | null) {
  const patientId = `pat_${crypto.randomUUID()}`;
  const normalizedName = normalizeArabicText(input.name_ar);
  const englishName = mapArabicNameToEnglish(input.name_ar);

  // فحص تكرار رقم الهاتف لإرجاع تحذير غير مانع (Warning Case)
  const existingPatient = await query('patients')
    .where({ phone: input.phone, is_active: 1 })
    .first();

  let warning: ApiWarning | null = null;
  if (existingPatient) {
    warning = {
      code: 'DUPLICATE_PHONE',
      message: 'رقم الهاتف ده مسجّل بالفعل لمريض تاني',
      meta: {
        existing_patient_id: existingPatient.id,
        existing_patient_name: existingPatient.name_ar,
      },
    };
  }

  let displayId = '';

  await query.transaction(async (trx) => {
    displayId = await generatePatientDisplayId(trx);

    await trx('patients').insert({
      id: patientId,
      display_id: displayId,
      name_ar: input.name_ar,
      name_ar_normalized: normalizedName,
      name_en: englishName,
      phone: input.phone,
      age: input.age,
      gender: input.gender,
      address: input.address ?? null,
      notes: input.notes ?? null,
      home_branch_id: branchId,
      is_active: 1,
    });

    if (input.emergency_contact) {
      await trx('patient_emergency_contacts').insert({
        id: `pec_${crypto.randomUUID()}`,
        patient_id: patientId,
        name: input.emergency_contact.name ?? null,
        relation: input.emergency_contact.relation ?? null,
        phone: input.emergency_contact.phone ?? null,
      });
    }
  });

  return {
    data: {
      id: patientId,
      display_id: displayId,
      name_ar: input.name_ar,
      name_en: englishName,
      phone: input.phone,
      age: input.age,
      gender: input.gender,
      due: 0,
      is_active: true,
    },
    warning,
  };
}

/**
 * @description تعديل بيانات مريض موجود
 * @param {string} patientId - معرف المريض
 * @param {UpdatePatientInput} input - البيانات المراد تحديثها
 * @returns {Promise<{ data: any; warning: ApiWarning | null }>} بيانات المريض بعد التحديث
 * @throws {AppError} 404 NOT_FOUND لو المريض غير موجود
 */
export async function updatePatient(patientId: string, input: UpdatePatientInput) {
  const patient = await query('patients').where({ id: patientId }).first();

  if (!patient) {
    throw new AppError('NOT_FOUND', 'المريض غير موجود', 404);
  }

  let warning: ApiWarning | null = null;
  if (input.phone && input.phone !== patient.phone) {
    const existingPatient = await query('patients')
      .where({ phone: input.phone, is_active: 1 })
      .whereNot({ id: patientId })
      .first();

    if (existingPatient) {
      warning = {
        code: 'DUPLICATE_PHONE',
        message: 'رقم الهاتف ده مسجّل بالفعل لمريض تاني',
        meta: {
          existing_patient_id: existingPatient.id,
          existing_patient_name: existingPatient.name_ar,
        },
      };
    }
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name_ar) {
    updatePayload.name_ar = input.name_ar;
    updatePayload.name_ar_normalized = normalizeArabicText(input.name_ar);
    updatePayload.name_en = mapArabicNameToEnglish(input.name_ar);
  }
  if (input.phone) updatePayload.phone = input.phone;
  if (input.age !== undefined) updatePayload.age = input.age;
  if (input.gender) updatePayload.gender = input.gender;
  if (input.address !== undefined) updatePayload.address = input.address;
  if (input.notes !== undefined) updatePayload.notes = input.notes;

  await query.transaction(async (trx) => {
    await trx('patients').where({ id: patientId }).update(updatePayload);

    if (input.emergency_contact) {
      const existingContact = await trx('patient_emergency_contacts')
        .where({ patient_id: patientId })
        .first();

      if (existingContact) {
        await trx('patient_emergency_contacts')
          .where({ patient_id: patientId })
          .update({
            name: input.emergency_contact.name ?? existingContact.name,
            relation: input.emergency_contact.relation ?? existingContact.relation,
            phone: input.emergency_contact.phone ?? existingContact.phone,
            updated_at: new Date().toISOString(),
          });
      } else {
        await trx('patient_emergency_contacts').insert({
          id: `pec_${crypto.randomUUID()}`,
          patient_id: patientId,
          name: input.emergency_contact.name ?? null,
          relation: input.emergency_contact.relation ?? null,
          phone: input.emergency_contact.phone ?? null,
        });
      }
    }
  });

  const updatedPatient = await getPatientById(patientId);
  return { data: updatedPatient, warning };
}

/**
 * @description تفعيل أو تعطيل حساب مريض
 * @param {string} patientId - معرف المريض
 * @param {boolean} isActive - الحالة الجديدة
 * @returns {Promise<{ id: string; is_active: boolean }>} النتيجة
 * @throws {AppError} 404 NOT_FOUND لو المريض غير موجود
 */
export async function togglePatientActive(patientId: string, isActive: boolean) {
  const patient = await query('patients').where({ id: patientId }).first();

  if (!patient) {
    throw new AppError('NOT_FOUND', 'المريض غير موجود', 404);
  }

  await query('patients')
    .where({ id: patientId })
    .update({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString() });

  return { id: patientId, is_active: isActive };
}

/**
 * @description جلب السجل الطبي الكامل لمريض شامل التنبيهات والأدوية والروشتات والتحاليل والوثائق
 * @param {string} patientId - معرف المريض
 * @returns {Promise<any>} السجل الطبي الشامل
 * @throws {AppError} 404 NOT_FOUND لو المريض غير موجود
 */
export async function getMedicalRecord(patientId: string) {
  const patient = await query('patients').where({ id: patientId }).first();

  if (!patient) {
    throw new AppError('NOT_FOUND', 'المريض غير موجود', 404);
  }

  const medicalAlerts = await query('medical_alerts').where({ patient_id: patientId });
  const medicalHistory = await query('medical_history').where({ patient_id: patientId });
  const diagnoses = await query('diagnoses').where({ patient_id: patientId });
  const medications = await query('medications').where({ patient_id: patientId });
  const labs = await query('labs').where({ patient_id: patientId });
  const radiology = await query('radiology').where({ patient_id: patientId });
  const documents = await query('documents').where({ patient_id: patientId });

  return {
    medical_alerts: medicalAlerts.map((a: any) => ({
      id: a.id,
      type: a.type,
      text_ar: a.text_ar,
      text_en: a.text_en,
    })),
    medical_history: medicalHistory.map((h: any) => ({
      id: h.id,
      category: h.category,
      text_ar: h.text_ar,
      text_en: h.text_en,
    })),
    diagnoses: diagnoses.map((d: any) => ({
      id: d.id,
      date: d.date,
      text_ar: d.text_ar,
      text_en: d.text_en,
    })),
    medications: medications.map((m: any) => ({
      id: m.id,
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      status: m.status,
    })),
    labs: labs.map((l: any) => ({
      id: l.id,
      name: l.name,
      date: l.date,
      status: l.status,
      has_attachment: Boolean(l.has_attachment),
    })),
    radiology: radiology.map((r: any) => ({
      id: r.id,
      type: r.type,
      date: r.date,
      report: r.report,
      has_attachment: Boolean(r.has_attachment),
    })),
    documents: documents.map((doc: any) => ({
      id: doc.id,
      file_name: doc.file_name,
      type: doc.type,
      date: doc.date,
    })),
  };
}

/**
 * @description إضافة بند تاريخ مرضي لمريض
 */
export async function addMedicalHistory(patientId: string, input: CreateMedicalHistoryInput) {
  const id = `mh_${crypto.randomUUID()}`;
  await query('medical_history').insert({
    id,
    patient_id: patientId,
    category: input.category,
    text_ar: input.text_ar,
    text_en: input.text_en ?? null,
  });
  return { id, category: input.category, text_ar: input.text_ar };
}

/**
 * @description إضافة تشخيص طبي لمريض
 */
export async function addDiagnosis(patientId: string, input: CreateDiagnosisInput) {
  const id = `dx_${crypto.randomUUID()}`;
  await query('diagnoses').insert({
    id,
    patient_id: patientId,
    date: input.date,
    text_ar: input.text_ar,
    text_en: input.text_en ?? null,
  });
  return { id, date: input.date, text_ar: input.text_ar };
}

/**
 * @description إضافة دواء لمريض
 */
export async function addMedication(patientId: string, input: CreateMedicationInput) {
  const id = `med_${crypto.randomUUID()}`;
  await query('medications').insert({
    id,
    patient_id: patientId,
    name: input.name,
    dose: input.dose ?? null,
    frequency: input.frequency ?? null,
    since: input.since ?? null,
    status: input.status,
  });
  return { id, name: input.name, status: input.status };
}

/**
 * @description إيقاف دواء حالي لمريض
 */
export async function stopMedication(medicationId: string) {
  await query('medications')
    .where({ id: medicationId })
    .update({ status: 'completed', updated_at: new Date().toISOString() });
  return { id: medicationId, status: 'completed' };
}

/**
 * @description تجديد دواء لمريض
 */
export async function refillMedication(medicationId: string) {
  await query('medications')
    .where({ id: medicationId })
    .update({ status: 'active', updated_at: new Date().toISOString() });
  return { id: medicationId, status: 'active' };
}

/**
 * @description إضافة روشتة طبية وإرجاع التنبيهات الطبية (الحساسيات) دائماً مع الاستجابة (قرار ١١١)
 */
export async function addPrescription(
  patientId: string,
  doctorId: string | null,
  input: CreatePrescriptionInput
) {
  const prescriptionId = `rx_${crypto.randomUUID()}`;

  await query.transaction(async (trx) => {
    await trx('prescriptions').insert({
      id: prescriptionId,
      patient_id: patientId,
      date: input.date,
      doctor_id: doctorId,
    });

    const items = input.items.map((item: any) => ({
      id: `rxi_${crypto.randomUUID()}`,
      prescription_id: prescriptionId,
      drug: item.drug,
      dose: item.dose ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    }));

    await trx('prescription_items').insert(items);
  });

  const alerts = await query('medical_alerts')
    .where({ patient_id: patientId, type: 'allergy' })
    .select('type', 'text_ar');

  return {
    prescription: {
      id: prescriptionId,
      date: input.date,
      doctor_id: doctorId,
      items: input.items,
    },
    medical_alerts: alerts,
  };
}

/**
 * @description إضافة تحليل طبي
 */
export async function addLab(patientId: string, input: CreateLabInput) {
  const id = `lab_${crypto.randomUUID()}`;
  await query('labs').insert({
    id,
    patient_id: patientId,
    name: input.name,
    date: input.date,
    status: input.status,
    doctor_id: input.doctor_id ?? null,
    has_attachment: input.has_attachment ? 1 : 0,
  });
  return { id, name: input.name, status: input.status };
}

/**
 * @description إضافة تنبيه طبي للمريض (حساسية، تحذير دواء، تاريخ مرضي مهم)
 * @param {string} patientId - معرّف المريض
 * @param {{ type: string; text_ar: string; text_en?: string | null }} input - بيانات التنبيه
 * @returns {Promise<{ id: string; type: string; text_ar: string }>} التنبيه الجديد
 * @throws {AppError} 404 NOT_FOUND لو المريض غير موجود
 */
export async function addMedicalAlert(
  patientId: string,
  input: { type: string; text_ar: string; text_en?: string | null }
) {
  const patient = await query('patients').where({ id: patientId }).first();
  if (!patient) {
    throw new AppError('NOT_FOUND', 'المريض غير موجود', 404);
  }

  const id = `ma_${crypto.randomUUID()}`;
  await query('medical_alerts').insert({
    id,
    patient_id: patientId,
    type: input.type,
    text_ar: input.text_ar,
    text_en: input.text_en ?? null,
  });
  return { id, type: input.type, text_ar: input.text_ar };
}

/**
 * @description إضافة أشعة طبية
 */
export async function addRadiology(patientId: string, input: CreateRadiologyInput) {
  const id = `rad_${crypto.randomUUID()}`;
  await query('radiology').insert({
    id,
    patient_id: patientId,
    type: input.type,
    date: input.date,
    report: input.report ?? null,
    has_attachment: input.has_attachment ? 1 : 0,
  });
  return { id, type: input.type, date: input.date };
}
