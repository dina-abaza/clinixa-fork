import request from 'supertest';
import app from '../../app';
import query from '../../db/sqlite/query';

describe('Auth & Setup Integration Tests (Phase 2)', () => {
  beforeAll(async () => {
    // تشغيل الـ Migrations على قاعدة البيانات لتجهيز الجدول
    await query.migrate.latest();
  });

  afterAll(async () => {
    // تنظيف البيانات وإغلاق الاتصال بعد انتهاء الاختبارات
    await query('employee_permissions').del();
    await query('employees').del();
    await query('branches').del();
    await query('clinic_settings').del();
    await query.destroy();
  });

  let authToken = '';

  describe('POST /api/setup/first-run', () => {
    it('ينفّذ إعداد أول مرة بنجاح ويرجع 201', async () => {
      const res = await request(app)
        .post('/api/setup/first-run')
        .send({
          license_key: 'CLX-TEST-1234-5678',
          clinic: {
            name_ar: 'عيادة الاختبارات',
            phone: '01012345678',
            address: 'القاهرة',
            specialty: 'cardio',
          },
          doctor_account: {
            name_ar: 'د. أحمد علي',
            username: 'dr.ahmed',
            password: 'password123',
          },
          security: {
            question: 'اسم أول مدرسة؟',
            answer: 'الأندلس',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.clinic.name_ar).toBe('عيادة الاختبارات');
      expect(res.body.data.main_branch.name_ar).toBe('الفرع الرئيسي');
      expect(res.body.data.employee.username).toBe('dr.ahmed');
      expect(res.body.data.token).toBeDefined();

      authToken = res.body.data.token;
    });

    it('يرفض الإعداد الثاني ويرجع 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/setup/first-run')
        .send({
          license_key: 'CLX-TEST-1234-5678',
          clinic: {
            name_ar: 'عيادة ثانية',
            phone: '01012345678',
            specialty: 'cardio',
          },
          doctor_account: {
            name_ar: 'د. محمود',
            username: 'dr.mahmoud',
            password: 'password123',
          },
          security: {
            question: 'سؤال؟',
            answer: 'إجابة',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/auth/login', () => {
    it('يسجل الدخول بنجاح مع اسم مستخدم وكلمة سر صحيحة', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dr.ahmed',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.employee.username).toBe('dr.ahmed');
      expect(res.body.data.employee.is_owner).toBe(true);
      expect(res.body.data.active_branch.name_ar).toBe('الفرع الرئيسي');
    });

    it('يرفض الدخول بكلمة سر خاطئة ويرجع 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dr.ahmed',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/auth/session', () => {
    it('يجلب تفاصيل الجلسة بنجاح باستخدام Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.employee.username).toBe('dr.ahmed');
      expect(res.body.data.active_branch.name_ar).toBe('الفرع الرئيسي');
    });

    it('يرفض الجلسة بدون Authorization header ويرجع 401', async () => {
      const res = await request(app).get('/api/auth/session');

      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/auth/security-question', () => {
    it('يرجع نص سؤال الأمان المسجل للمستخدم بنجاح', async () => {
      const res = await request(app)
        .get('/api/auth/security-question?username=dr.ahmed');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.question).toBe('اسم أول مدرسة؟');
    });

    it('يرجع 404 إذا كان اسم المستخدم غير موجود', async () => {
      const res = await request(app)
        .get('/api/auth/security-question?username=nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('يرفض التغيير بإجابة سؤال أمان خاطئة ويرجع 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          username: 'dr.ahmed',
          security_answer: 'إجابة غلط',
          new_password: 'newpassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('يغير كلمة السر بنجاح عند إدخال إجابة سؤال الأمان الصحيحة', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          username: 'dr.ahmed',
          security_answer: 'الأندلس',
          new_password: 'newpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // التأكد من إمكانية تسجيل الدخول بكلمة السر الجديدة
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dr.ahmed',
          password: 'newpassword123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.ok).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('يسجل الخروج بنجاح مع Authorization header ويرجع 200', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.message).toBe('تم تسجيل الخروج بنجاح');
    });
  });
});
