import { z } from 'zod';

/**
 * @description سكيمة التحقق من البيانات عند تسجيل الدخول
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة السر مطلوبة'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * @description سكيمة التحقق من البيانات عند نسيت كلمة السر
 */
export const forgotPasswordSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  security_answer: z.string().min(1, 'إجابة سؤال الأمان مطلوبة'),
  new_password: z.string().min(6, 'كلمة السر الجديدة يجب أن تكون ٦ أحرف على الأقل'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * @description سكيمة التحقق من البيانات عند طلب سؤال الأمان
 */
export const getSecurityQuestionSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
});

export type GetSecurityQuestionInput = z.infer<typeof getSecurityQuestionSchema>;
