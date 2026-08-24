/**
 * @fileoverview القوائم الثابتة لمشروع Clinixa
 * @description المصدر الوحيد للحقيقة لكل القوائم المرجعية — يُستورد في السيرفر والفرونت
 *              لا يوجد جدول database لهذه القوائم — هي ثوابت كود فقط
 */

// ─────────────────────────────────────────────────────────────
// أنواع الرسوم (Charge Types)
// ─────────────────────────────────────────────────────────────

/**
 * @description قائمة أنواع الرسوم الطبية المعتمدة
 */
export const CHARGE_TYPES = [
  { key: 'consultation',    label_ar: 'كشف'              },
  { key: 'follow_up_visit', label_ar: 'إعادة كشف'        },
  { key: 'procedure',       label_ar: 'إجراء / علاج'     },
  { key: 'radiology',       label_ar: 'أشعة'             },
  { key: 'labs',            label_ar: 'تحاليل'           },
  { key: 'follow_up',       label_ar: 'متابعة'           },
  { key: 'other',           label_ar: 'أخرى'             },
] as const;

/** @description النوع المشتق لمفاتيح أنواع الرسوم */
export type ChargeType = (typeof CHARGE_TYPES)[number]['key'];

// ─────────────────────────────────────────────────────────────
// طرق الدفع (Payment Methods)
// ─────────────────────────────────────────────────────────────

/**
 * @description قائمة طرق الدفع المقبولة
 */
export const PAYMENT_METHODS = [
  { key: 'cash',           label_ar: 'كاش'                },
  { key: 'card',           label_ar: 'فيزا (ماكينة)'      },
  { key: 'wallet',         label_ar: 'محفظة إلكترونية'    },
  { key: 'bank_transfer',  label_ar: 'تحويل بنكي'         },
] as const;

/** @description النوع المشتق لمفاتيح طرق الدفع */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['key'];

// ─────────────────────────────────────────────────────────────
// حالات الحضور (Attendance Statuses)
// ─────────────────────────────────────────────────────────────

/**
 * @description قائمة حالات الحضور المتاحة — الجدول Append-Only
 *              التسلسل الطبيعي: waiting → in_progress → done
 *              التسلسلات البديلة: waiting → noshow / waiting → left
 */
export const ATTENDANCE_STATUSES = [
  'waiting',
  'in_progress',
  'done',
  'noshow',
  'left',
] as const;

/** @description النوع المشتق لحالات الحضور */
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

// ─────────────────────────────────────────────────────────────
// أدوار الموظفين (Employee Roles)
// ─────────────────────────────────────────────────────────────

/**
 * @description أدوار الموظفين المتاحة — للعرض فقط، الصلاحيات الفعلية في employee_permissions
 */
export const ROLES = ['doctor', 'nurse', 'secretary'] as const;

/** @description النوع المشتق لأدوار الموظفين */
export type EmployeeRole = (typeof ROLES)[number];

// ─────────────────────────────────────────────────────────────
// أنواع المخزون (Inventory Types)
// ─────────────────────────────────────────────────────────────

/**
 * @description أنواع أصناف المخزون الطبي
 */
export const INVENTORY_TYPES = [
  { key: 'supplies',   label_ar: 'مستلزمات طبية' },
  { key: 'equipment',  label_ar: 'معدات طبية'     },
] as const;

/** @description النوع المشتق لأنواع المخزون */
export type InventoryType = (typeof INVENTORY_TYPES)[number]['key'];

// ─────────────────────────────────────────────────────────────
// التخصصات الطبية (Medical Specialties)
// ─────────────────────────────────────────────────────────────

/**
 * @description قائمة التخصصات الطبية المتاحة — ثوابت كود فقط، لا جدول DB
 */
export const SPECIALTIES = [
  { key: 'cardio',        label_ar: 'قلب وأوعية دموية',         group: 'أمراض مزمنة'       },
  { key: 'diabetes',      label_ar: 'سكر وغدد صماء',            group: 'أمراض مزمنة'       },
  { key: 'nephrology',    label_ar: 'كلى',                       group: 'أمراض مزمنة'       },
  { key: 'chest',         label_ar: 'صدر وجهاز تنفسي',          group: 'أمراض مزمنة'       },
  { key: 'neurology',     label_ar: 'مخ وأعصاب',                 group: 'أمراض مزمنة'       },
  { key: 'rheumatology',  label_ar: 'روماتيزم ومفاصل',           group: 'أمراض مزمنة'       },
  { key: 'gastro',        label_ar: 'جهاز هضمي وكبد',            group: 'أمراض مزمنة'       },
  { key: 'hematology',    label_ar: 'دم وأورام',                  group: 'أمراض مزمنة'       },
  { key: 'general',       label_ar: 'طب عام وعائلي',             group: 'طب عام'             },
  { key: 'internal',      label_ar: 'باطنة عامة',                group: 'طب عام'             },
  { key: 'ortho',         label_ar: 'عظام ومفاصل',               group: 'جراحة وتخصصات أخرى' },
  { key: 'surgery',       label_ar: 'جراحة عامة',                group: 'جراحة وتخصصات أخرى' },
  { key: 'urology',       label_ar: 'مسالك بولية وذكورة',        group: 'جراحة وتخصصات أخرى' },
  { key: 'gynecology',    label_ar: 'نساء وتوليد',               group: 'جراحة وتخصصات أخرى' },
  { key: 'pediatrics',    label_ar: 'أطفال',                     group: 'جراحة وتخصصات أخرى' },
  { key: 'dermatology',   label_ar: 'جلدية وتجميل',              group: 'جراحة وتخصصات أخرى' },
  { key: 'ent',           label_ar: 'أنف وأذن وحنجرة',           group: 'جراحة وتخصصات أخرى' },
  { key: 'ophthalmology', label_ar: 'عيون',                      group: 'جراحة وتخصصات أخرى' },
  { key: 'psychiatry',    label_ar: 'طب نفسي',                   group: 'جراحة وتخصصات أخرى' },
  { key: 'dentistry',     label_ar: 'أسنان',                     group: 'جراحة وتخصصات أخرى' },
] as const;

/** @description النوع المشتق لمفاتيح التخصصات */
export type Specialty = (typeof SPECIALTIES)[number]['key'];

// ─────────────────────────────────────────────────────────────
// حالات المتابعة (Follow-up Statuses)
// ─────────────────────────────────────────────────────────────

/** @description حالات موعد المتابعة */
export const FOLLOW_UP_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

// ─────────────────────────────────────────────────────────────
// فئات السجل الطبي (Medical Record Categories)
// ─────────────────────────────────────────────────────────────

/** @description أنواع التنبيهات الطبية */
export const MEDICAL_ALERT_TYPES = [
  'allergy',
  'chronic',
  'active_medication',
  'important_note',
] as const;
export type MedicalAlertType = (typeof MEDICAL_ALERT_TYPES)[number];

/** @description فئات التاريخ المرضي */
export const MEDICAL_HISTORY_CATEGORIES = [
  'chronic',
  'past',
  'surgery',
  'hospitalization',
  'allergy',
  'family',
  'risk_factor',
  'note',
] as const;
export type MedicalHistoryCategory = (typeof MEDICAL_HISTORY_CATEGORIES)[number];

/** @description حالات نتيجة التحاليل */
export const LAB_STATUSES = ['normal', 'abnormal', 'pending'] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

/** @description حالات الدواء */
export const MEDICATION_STATUSES = ['active', 'completed'] as const;
export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

/** @description أنواع وثائق المريض */
export const DOCUMENT_TYPES = ['pdf', 'jpg', 'png'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// حالات المزامنة (Sync Statuses)
// ─────────────────────────────────────────────────────────────

/** @description حالات صف المزامنة في sync_outbox */
export const SYNC_STATUSES = ['pending', 'syncing', 'synced', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/** @description الجداول القابلة للمزامنة مع MongoDB Atlas */
export const SYNCABLE_TABLES = [
  'patients',
  'patient_emergency_contacts',
  'patient_follow_ups',
  'medical_alerts',
  'medical_history',
  'diagnoses',
  'medications',
  'prescriptions',
  'prescription_items',
  'labs',
  'radiology',
  'documents',
  'attendance',
  'charges',
  'payments',
  'inventory_items',
  'branches',
] as const;
export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

// ─────────────────────────────────────────────────────────────
// الجنس وصلة القرابة (Gender & Emergency Contact Relation)
// ─────────────────────────────────────────────────────────────

/** @description خيارات الجنس للمريض */
export const GENDER = ['male', 'female'] as const;
export type Gender = (typeof GENDER)[number];

/** @description صلة القرابة لجهة الاتصال الطارئة */
export const EMERGENCY_CONTACT_RELATION = [
  'father',
  'mother',
  'spouse',
  'sibling',
  'other',
] as const;
export type EmergencyContactRelation = (typeof EMERGENCY_CONTACT_RELATION)[number];

// ─────────────────────────────────────────────────────────────
// تنبيهات النظام والنسخ الاحتياطي (System Alerts & Backups)
// ─────────────────────────────────────────────────────────────

/** @description أنواع تنبيهات النظام */
export const SYSTEM_ALERT_TYPES = ['backup_failed', 'low_stock'] as const;
export type SystemAlertType = (typeof SYSTEM_ALERT_TYPES)[number];

/** @description حالات عمليات النسخ الاحتياطي */
export const BACKUP_STATUS = ['ok', 'fail'] as const;
export type BackupStatus = (typeof BACKUP_STATUS)[number];

/** @description نوع عملية النسخ الاحتياطي (تلقائي / يدوي) */
export const BACKUP_KIND = ['auto', 'manual'] as const;
export type BackupKind = (typeof BACKUP_KIND)[number];

/** @description وجهة حفظ النسخة الاحتياطية */
export const BACKUP_DESTINATION = ['local_device', 'usb', 'google_drive'] as const;
export type BackupDestination = (typeof BACKUP_DESTINATION)[number];

/** @description سبب فشل عملية النسخ الاحتياطي */
export const BACKUP_FAIL_REASON = ['token', 'offline', 'device'] as const;
export type BackupFailReason = (typeof BACKUP_FAIL_REASON)[number];

// ─────────────────────────────────────────────────────────────
// أنماط المزامنة للعيادة (Sync Modes)
// ─────────────────────────────────────────────────────────────

/** @description أنماط المزامنة المتاحة للعيادة */
export const SYNC_MODES = ['none', 'local_server', 'external_hosting'] as const;
export type SyncMode = (typeof SYNC_MODES)[number];

