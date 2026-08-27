import request from 'supertest';
import app from '../app';
import query from '../db/sqlite/query';

describe('Phase 3 — Daily Critical Path Integration Test', () => {
  let authToken = '';
  let patientId = '';
  let attendanceId = '';

  beforeAll(async () => {
    // تشغيل الـ Migrations والتأكد من نظافة الجداول
    await query.migrate.latest();

    // إعداد العيادة والمالك (Setup)
    const setupRes = await request(app)
      .post('/api/setup/first-run')
      .send({
        license_key: 'CLX-PHASE3-TEST-KEY',
        clinic: {
          name_ar: 'عيادة المسار الحرج',
          phone: '01012345678',
          address: 'القاهرة',
          specialty: 'cardio',
        },
        doctor_account: {
          name_ar: 'د. أحمد المسار',
          username: 'dr.critical',
          password: 'password123',
        },
        security: {
          question: 'سؤال المسار؟',
          answer: 'إجابة المسار',
        },
      });

    if (setupRes.body.ok) {
      authToken = setupRes.body.data.token;
    } else {
      // لو مسجل مسبقاً، نعمل login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'dr.critical', password: 'password123' });
      authToken = loginRes.body.data.token;
    }
  });

  afterAll(async () => {
    // تنظيف بيانات الاختبار وإغلاق الاتصال
    await query('patient_follow_ups').del();
    await query('day_closures').del();
    await query('payments').del();
    await query('charges').del();
    await query('attendance').del();
    await query('prescriptions').del();
    await query('medications').del();
    await query('diagnoses').del();
    await query('medical_history').del();
    await query('medical_alerts').del();
    await query('patient_emergency_contacts').del();
    await query('patients').del();
    await query('employee_permissions').del();
    await query('employees').del();
    await query('branches').del();
    await query('clinic_settings').del();
    await query.destroy();
  });

  it('1. يضيف مريضاً جديداً بنجاح ويرجع display_id و due = 0', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name_ar: 'محمد علي حسن',
        phone: '01099887766',
        age: 42,
        gender: 'male',
        address: 'المعادي',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.display_id).toMatch(/^P-/);
    expect(res.body.data.due).toBe(0);

    patientId = res.body.data.id;
  });

  it('2. يسجل دخول المريض بالطابور (Check-in) وتكون حالته waiting', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ patient_id: patientId });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('waiting');

    attendanceId = res.body.data.id;
  });

  it('3. ينادي المريض للدخول للكشف (Call) وتحول حالته لـ in_progress', async () => {
    const res = await request(app)
      .patch(`/api/attendance/${attendanceId}/call`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('4. يضيف روشتة طبية وتُرجع الحساسية والتنبهيات إن وجدت', async () => {
    const res = await request(app)
      .post(`/api/patients/${patientId}/prescriptions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [
          { drug: 'Concor 5mg', dose: '1 قرص', frequency: 'مرة يومياً', duration: 'شهر' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.prescription.items.length).toBe(1);
    expect(res.body.data.medical_alerts).toBeDefined();
  });

  it('5. ينفذ الفعل المركب لإنهاء الكشف (Finish) ويتشكل المستحق والرسوم', async () => {
    const res = await request(app)
      .post(`/api/attendance/${attendanceId}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [
          { charge_type: 'consultation', amount: 300 },
          { charge_type: 'procedure', amount: 100 },
        ],
        follow_up: { days: 14, fee: 50 },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.attendance.status).toBe('done');
    expect(res.body.data.charges_created.length).toBe(2);
    expect(res.body.data.final_due).toBe(400);
    expect(res.body.data.can_collect).toBe(true);
  });

  it('6. يستعلم عن المريض في المديونيات الجاهزة للتحصيل (Ready for Checkout)', async () => {
    const res = await request(app)
      .get('/api/attendance/ready-for-checkout')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].due).toBe(400);
  });

  it('7. يسجل دفعة سداد للمريض ويُرجع الإيصال والمستحق المتبقي', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patient_id: patientId,
        amount: 400,
        method: 'cash',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.remaining_due).toBe(0);
    expect(res.body.data.receipt.amount).toBe(400);
  });

  it('8. يستعلم عن ملخص اليوم المالي ويرجع إجمالي التحصيل', async () => {
    const res = await request(app)
      .get('/api/day-summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.total_collected).toBe(400);
    expect(res.body.data.total_charges).toBe(400);
    expect(res.body.data.is_closed).toBe(false);
  });

  it('9. يقفل اليوم المالي (Close Day) بنجاح', async () => {
    const res = await request(app)
      .post('/api/day-summary/close')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.closed_at).toBeDefined();

    // محاولة الإقفال مرة أخرى ترجع CONFLICT 409
    const retryRes = await request(app)
      .post('/api/day-summary/close')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(retryRes.status).toBe(409);
    expect(retryRes.body.error.code).toBe('CONFLICT');
  });
});
