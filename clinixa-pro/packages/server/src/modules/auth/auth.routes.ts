import { Router } from 'express';
import { login, logout, getSession, forgotPassword, getSecurityQuestionHandler } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// مسار تسجيل الدخول
router.post('/login', login);

// مسار تسجيل الخروج (يتطلب توكن صالح)
router.post('/logout', authMiddleware, logout);

// مسار جلب تفاصيل الجلسة الحالية (يتطلب توكن صالح)
router.get('/session', authMiddleware, getSession);

// مسار جلب سؤال الأمان للمستخدم
router.get('/security-question', getSecurityQuestionHandler);

// مسار نسيت كلمة السر واستعادتها
router.post('/forgot-password', forgotPassword);

export default router;
