# 📊 Clinixa Rules — 04 Database & Strict Business Rules

> **القواعد المعمارية الثابتة لقاعدة البيانات والمنطق التجاري لمشروع Clinixa**

## 1. Non-stored Patient Due (عدم تخزين المستحق)
- **ممنوع مطلقاً** إضافة عمود باسم `due` أو ما يماثله في جدول `patients`.
- المستحق المالي هو قيمة محسوبة ديناميكياً ولحظياً في الوقت الفعلي باستدعاء الدالة الموحدة `recalcDue.ts`:
  $$\text{Due} = \sum \text{Charges} - \sum \text{Payments}$$
- الباك إند يقوم بإلحاق هذا الحقل المنطقي `due` في استجابات الـ API للـ GET الخاصة بالمرضى لتسهيل العرض على الفرونت دون حسابه على الواجهة.

## 2. Append-Only Attendance Log (عدم حذف الحضور)
- جدول الحضور `attendance` يعتبر سجل تاريخي تراكمي (Append-Only).
- **لا توجد دالة `delete` أو حذف عام** في `attendance.repository.ts`.
- التعديل الوحيد المسموح به هو تعديل حالة الحضور `status` عبر `updateStatus` (مثال: `waiting` ← `in_progress` ← `done` / `noshow` / `left`).

## 3. Mandatory Charge Time & Day Closures
- جدول الرسوم `charges` وجدول المدفوعات `payments` يتطلبان تسجيل الحقلين `date` (YYYY-MM-DD) و `time` (HH:MM:SS) إجبارياً.
- عند إقفال اليوم عبر `POST /api/day-summary/close`:
  - أي محاولة لتعديل دفعات يوم مقفول ترجع الخطأ `423 LOCKED`.
  - إضافة مدفوعات جديدة بعد الإقفال مسموحة وتسجل بشرط `after_day_close = 1`.

## 4. Multi-branch & Data Isolation
- عند استعلام البيانات من السيرفر المحلي للفرع، يتم تصفية السجلات حسب `branch_id` الخاص بالجلسة باستثناء جدول المرضى `patients` والسجل الطبي المرتبط بهم لكون بيانات المرضى مشتركة بين كافة الفروع.
