/**
 * @fileoverview الصلاحيات المعتمدة في مشروع Clinixa
 * @description المصدر الوحيد للحقيقة للـ 16 صلاحية — يُستورد من هنا في السيرفر والفرونت
 *              تم التحقق من العدد بمراجعة كل endpoint في clinixa-backend-architecture.md
 */

/**
 * @description قائمة الـ 16 صلاحية المعتمدة في المشروع
 * pat×4: عرض/إضافة/تعديل/تعطيل المرضى
 * att×4: عرض/إضافة/تعديل/إنهاء كشف الحضور
 * pay×3: عرض/إضافة/تعديل المدفوعات
 * inv×3: عرض/إضافة/تعديل المخزون
 * admin×2: عرض/تعديل الإدارة (موظفون، فروع، إعدادات)
 */
export const PERMISSIONS = [
  // ── المرضى (Patients) ──────────────────────────
  'pat.view',   // عرض قائمة المرضى والملف الشخصي
  'pat.add',    // إضافة مريض جديد
  'pat.edit',   // تعديل بيانات المريض والسجل الطبي
  'pat.off',    // تعطيل / تفعيل مريض

  // ── الحضور (Attendance) ────────────────────────
  'att.view',   // عرض قائمة الحضور اليومي
  'att.add',    // تسجيل حضور (check-in)
  'att.edit',   // تغيير حالة الحضور (call / noshow / left)
  'att.done',   // إنهاء الكشف وإنشاء الرسوم (الفعل المركّب)

  // ── المدفوعات (Payments) ────────────────────────
  'pay.view',   // عرض الرسوم والمدفوعات والمستحقات
  'pay.add',    // إضافة رسوم أو دفعة جديدة
  'pay.edit',   // إقفال / إعادة فتح يوم

  // ── المخزون (Inventory) ─────────────────────────
  'inv.view',   // عرض قائمة المخزون
  'inv.add',    // إضافة صنف جديد للمخزون
  'inv.edit',   // تعديل الصنف أو تعديل الكمية

  // ── الإدارة (Admin) ─────────────────────────────
  'admin.view', // عرض الموظفين / الفروع / الإعدادات / سجل النسخ الاحتياطي
  'admin.edit', // تعديل الموظفين / الفروع / الإعدادات / النسخ الاحتياطي / المزامنة
] as const;

/**
 * @description النوع المشتق من قائمة الصلاحيات — يُستخدم في كل مكان يحتاج صلاحية
 * @example const required: Permission = 'pat.add';
 */
export type Permission = (typeof PERMISSIONS)[number];

/**
 * @description دالة مساعدة للتحقق إذا كانت قيمة نصية هي صلاحية صحيحة
 * @param {string} value - القيمة المراد التحقق منها
 * @returns {boolean} true إذا كانت القيمة صلاحية معتمدة
 */
export function isValidPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
