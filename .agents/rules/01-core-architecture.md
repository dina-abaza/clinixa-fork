# 🏛️ Clinixa Rules — 01 Core Architecture & Monorepo Structure

> **قواعد معمارية النظام والمونوريبو لمشروع Clinixa**

## 1. Monorepo Organization
- المشروع يعتمد على Monorepo بـ PNPM Workspaces (`packages/*`).
- **`packages/shared` (`@clinixa/shared`):**
  - تحتوي على الثوابت (`constants.ts`) والصلاحيات الـ 17 (`permissions.ts`) والأنواع المشتركة (`types.ts`).
  - **يُمنع التكرار:** أي كود أو enum أو نوع مستخدم في السيرفر والفرونت يتم استيراده من `@clinixa/shared`.
- **`packages/server`:**
  - Express backend مدمج داخل Electron Main process يعمل محليًا على `localhost`.
  - يعتمد على SQLite (`better-sqlite3`) + Knex Migrations كقاعدة بيانات محلية أساسية.
  - يعتمد على MongoDB Atlas (عبر `mongoose`) كمرآة سحابية للمزامنة بين الفروع فقط.
- **`packages/client`:**
  - React 18 + Vite + TypeScript (SPA).
  - يُستحسن استخدام MSW (Mock Service Worker) في وضع التطوير أثناء بناء الواجهات المطابقة لـ `clinixa-api-reference.md`.
- **`packages/electron`:**
  - Electron Main Process + ContextBridge IPC للطباعة واختيار المجلدات وإدارة نصوص النافذة.

## 2. Server Layered Architecture
داخل `packages/server/src/modules/`, يجب تقسيم كل موديول (مثال: `patients`, `attendance`, `payments`) إلى الأجزاء التالية:
1. **`*.routes.ts`**: تعريف المسارات وحزم الميدلويرز المطلوبة (`auth`, `permission`, `validate`, `arabicNormalize`).
2. **`*.controller.ts`**: استقبال وإرجاع الـ HTTP Requests/Responses والتعامل مع التحقق التجميعي.
3. **`*.service.ts`**: المنطق التجاري الصافِ (Business Logic) وحساب المعاملات واستدعاء الـ repository أو التنبيهات.
4. **`*.repository.ts`**: تنفيذ عمليات قاعدة البيانات (Queries / Transactions).
5. **`*.validation.ts`**: تعريف سكيمات التحقق لـ Zod على الـ Body/Query/Params.

## 3. Sync Engine & Outbox Pattern
- **محرك المزامنة (`sync.engine.ts`):**
  - يعمل في الخلفية لمعالجة العمليات المعلقة في `sync_outbox`.
  - الجدول `sync_outbox` يحتوي على مؤشر Pointer فقط (`table_name`, `record_id`, `branch_id`, `status`).
  - قيد التفرد: التعديل التكراري على صف ما زال `pending` يُجري `UPDATE` للمؤشر الموجود دون إضافة صفوف جديدة `INSERT`.
- **الجداول القابلة للمزامنة (Syncable):**
  - `patients`, `patient_emergency_contacts`, `patient_follow_ups`, `medical_alerts`, `medical_history`, `diagnoses`, `medications`, `prescriptions`, `prescription_items`, `labs`, `radiology`, `documents`, `attendance`, `charges`, `payments`, `inventory_items`, `branches`.
- **الجداول غير القابلة للمزامنة (Local Only):**
  - `employees`, `employee_permissions`, `clinic_settings`, `system_alerts`, `backup_history`, `day_closures`, `sync_outbox`.
