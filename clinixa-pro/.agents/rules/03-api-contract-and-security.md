# 🔐 Clinixa Rules — 03 API Contract & Security Standard

> **قواعد الأمان وعقد الـ API واستجابات النظام لمشروع Clinixa**

## 1. Unified Standard API Responses
تلتزم جميع الـ APIs بالشكل الموحد المحدد في `clinixa-api-reference.md`:

### النجاح (Success Response):
```json
{
  "ok": true,
  "data": { ... },
  "warning": null
}
```

### الأخطاء (Error Response - HTTP Status 4xx/5xx):
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | LOCKED | SERVER_ERROR",
    "message": "رسالة واضحة للمستخدم بالعربية",
    "field": "field_name_if_validation_error"
  }
}
```

### التحذير غير المانع (Warning Response):
يحصل الحفظ بنجاح، وتستجيب القيمة بـ `ok: true` مع كائن `warning`:
```json
{
  "ok": true,
  "data": { ... },
  "warning": {
    "code": "DUPLICATE_PHONE",
    "message": "رقم الهاتف ده مسجّل بالفعل لمريض تاني",
    "meta": { "existing_patient_id": "pat_01HABC" }
  }
}
```

## 2. Authentication & Authorization Security
- **سحب الهوية والفرع من التوكن حصراً:**
  - `employee_id` و `branch_id` **يُحظر** استقبالهما في الـ request body أو الـ query params من الواجهة.
  - يستخرجهما الباك إند دائمًا من الـ Token المشفر داخل `auth.middleware.ts`.
- **التحقق المركزي من الصلاحيات (RBAC Middleware):**
  - كل route يتطلب صلاحية مخصصة من الـ 17 صلاحيات (`pat.view`, `pat.add`, `pat.edit`, `pat.off`, `att.view`, `att.add`, `att.edit`, `att.done`, `pay.view`, `pay.add`, `pay.edit`, `inv.view`, `inv.add`, `inv.edit`, `admin.view`, `admin.edit`).
  - تطبيق قاعدة الميدلوير: سحب صلاحية `view` يرفض ألقائياً بقية الأفعال الخاصة بذات الموديول.

## 3. Account Protection Rules
- **حماية المالك (`is_owner = true`):**
  - تُرفض أي محاولة لـ `toggle-active` أو تعديل صلاحيات المالك `PUT /api/employees/:id/permissions` بترجيع `403 FORBIDDEN`.
- **كلمة السر المؤقتة:**
  - ترجع فقط في استجابة الإنشاء الأولية `POST /api/employees` وتكون غير مخزنة بنص عادي في قاعدة البيانات.

## 4. Arabic Input Normalization
- يجب استخدام `arabic-normalize.middleware.ts` على جميع المدخلات العربية لتوحيد الأشكال المتقاربة قبل الحفظ أو البحث في قاعدة البيانات:
  - `أ`, `إ`, `آ` ← `ا`
  - `ة` ← `ه`
  - `ى` ← `ي`
