# 🧹 Clinixa Rules — 02 Code Quality & Arabic Comments Standard

> **معايير جودة الكود والنظافة والتوسعية والتوصيف باللغة العربية لمشروع Clinixa**

## 1. Arabic Comments Standard (إلزامي لجميع الدوال)
يجب وضع توثيق JSDoc/TSDoc باللغة العربية الشاملة فوق كل دالة، واصفًا المدخلات والمخرجات وأهم الأخطاء المحتملة.

### مثال على التوثيق القياسي:
```typescript
/**
 * @description يقوم بحساب المستحق المالي الإجمالي لمريض معين بناءً على مجموع الخصومات والمدفوعات
 * @param {string} patientId - المعرف الفريد للمريض (مثل pat_01HABC)
 * @returns {Promise<number>} يرجع إجمالي المبلغ المستحق (الموجب يعني مديونية، الصفر يعني مسدد بالكامل)
 * @throws {NotFoundError} إذا لم يتم العثور على المريض في قاعدة البيانات
 */
export async function calculatePatientDue(patientId: string): Promise<number> {
  // 1. التأكد من وجود المريض
  const patient = await patientRepository.findById(patientId);
  if (!patient) {
    throw new NotFoundError('المريض غير موجود');
  }

  // 2. حساب مجموع البنود المستحقة ومجموع المدفوعات
  const totalCharges = await chargesRepository.sumByPatientId(patientId);
  const totalPayments = await paymentsRepository.sumByPatientId(patientId);

  return totalCharges - totalPayments;
}
```

## 2. Modularity & DRY (منع التكرار والتجزئة)
- **ممنوع الملفات المتضخمة:** حد أقصى ~250 سطرًا للملف الواحد. إذا تجاوز الملف هذا الحد، يجب تجزئته إلى موديولات وفرعيات مساعدة.
- **ممنوع الكود المكرر (DRY):** منطق المعالجة المكرر (مثل حساب العمر من تاريخ الميلاد، أو تنسيق المعرفات Display ID) يُستخرج فورًا إلى دالة مساعدة داخل `shared/utils/`.
- **مبدأ المسؤولية الواحدة (Single Responsibility Principle):** كل دالة تنفذ خطوة منطقية واحدة فقط بوضوح.

## 3. Strict TypeScript & Validation
- **ممنوع استخدام `any`:** يجب تعريف الأنواع بوضوح في `@clinixa/shared` أو الاستفادة من التوليد الآلي لـ Zod (`z.infer<typeof schema>`).
- **تطبيق Zod Validation:** جميع المدخلات الآتية من `req.body` أو `req.query` أو `req.params` تجتاز التحقق بواسطة Zod Schemas عبر `validate.middleware.ts`.
- **التعامل الأنيق مع الأخطاء (Error Handling):** استخدام فئات الأخطاء المخصصة (`AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `LockedError`).

## 4. Strict Type Schema Verification (المطابقة الحرفية للسكيمة الموثقة)
- **المطابقة التامة لأعمدة الجداول والـ API:** أي `interface` يُكتب في `@clinixa/shared/types.ts` يجب أن يُراجع حرفياً عموداً بعمود وحقلاً بحقل مع تعريف الجدول في `clinixa-backend-architecture.md` وأمثلة الـ Response في `clinixa-api-reference.md` قبل اعتماده، يمنع منعاً باتاً تغيير أسماء الحقول أو أنواعها أو اختراع هياكل غير موثقة.
