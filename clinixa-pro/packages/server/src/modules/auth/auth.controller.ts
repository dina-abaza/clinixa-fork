import type { Request, Response, NextFunction } from 'express';
import { loginSchema, forgotPasswordSchema, getSecurityQuestionSchema } from './auth.validation';
import { loginUser, getUserSession, resetPassword, getSecurityQuestion } from './auth.service';
import { AppError } from '../../middlewares/error-handler.middleware';

/**
 * @description معالجة طلب تسجيل الدخول (POST /api/auth/login)
 * @param {Request} req - طلب الـ HTTP المتضمن اسم المستخدم وكلمة السر
 * @param {Response} res - استجابة الـ HTTP
 * @param {NextFunction} next - دالة تمرير الأخطاء للميدلوير الرئيسي
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await loginUser(parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب تسجيل الخروج (POST /api/auth/logout)
 * @param {Request} _req - طلب الـ HTTP
 * @param {Response} res - استجابة الـ HTTP
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    ok: true,
    data: { message: 'تم تسجيل الخروج بنجاح' },
    warning: null,
  });
}

/**
 * @description معالجة طلب جلب تفاصيل الجلسة الحالية (GET /api/auth/session)
 * @param {Request} req - طلب الـ HTTP المحتوي على req.employee الموثّق
 * @param {Response} res - استجابة الـ HTTP
 * @param {NextFunction} next - دالة تمرير الأخطاء
 */
export async function getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = req.employee?.id;

    if (!employeeId) {
      throw new AppError('UNAUTHORIZED', 'يجب تسجيل الدخول أولاً', 401);
    }

    const result = await getUserSession(employeeId);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب نسيت كلمة السر واستعادتها (POST /api/auth/forgot-password)
 * @param {Request} req - طلب الـ HTTP المتضمن اسم المستخدم وإجابة سؤال الأمان وكلمة السر الجديدة
 * @param {Response} res - استجابة الـ HTTP
 * @param {NextFunction} next - دالة تمرير الأخطاء
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await resetPassword(parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description معالجة طلب جلب سؤال الأمان للمستخدم (GET /api/auth/security-question?username=xxx)
 * @param {Request} req - طلب الـ HTTP المتضمن اسم المستخدم في الـ query params
 * @param {Response} res - استجابة الـ HTTP
 * @param {NextFunction} next - دالة تمرير الأخطاء
 */
export async function getSecurityQuestionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = getSecurityQuestionSchema.safeParse(req.query);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await getSecurityQuestion(parsed.data.username);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

