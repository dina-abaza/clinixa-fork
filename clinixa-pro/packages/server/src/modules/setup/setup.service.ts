import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import query from '../../db/sqlite/query';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error-handler.middleware';
import { PERMISSIONS } from '@clinixa/shared';
import type { FirstRunInput } from './setup.validation';

/**
 * @description ينفّذ إعداد أول مرة (first-run) — clinic_settings + الفرع الرئيسي + حساب الطبيب المالك
 *              كل الإدراجات في transaction واحدة — لو أي جزء فشل، كله بيترجع (rollback)
 * ⚠️ ملحوظة: التحقق من إن license_key "مستخدم من قبل على جهاز تاني" (409) بيتطلب تحقق أونلاين
 *    ده قرار مفتوح لسه (روضماب - يوم ٢٤) — دلوقتي بنكتفي بفحص محلي: هل الجهاز ده اتعمله setup قبل كده
 */
export async function firstRunSetup(input: FirstRunInput) {
  const existingSettings = await query('clinic_settings').where({ id: 'singleton' }).first();

  if (existingSettings) {
    throw new AppError(
      'CONFLICT',
      'التطبيق ده متظبّط بالفعل على جهاز تاني بنفس المفتاح ده',
      409
    );
  }

  const branchId = `br_${crypto.randomUUID()}`;
  const employeeId = `emp_${crypto.randomUUID()}`;

  const passwordHash = await bcrypt.hash(input.doctor_account.password, env.BCRYPT_SALT_ROUNDS);
  const securityAnswerHash = await bcrypt.hash(input.security.answer, env.BCRYPT_SALT_ROUNDS);

  await query.transaction(async (trx) => {
    await trx('clinic_settings').insert({
      id: 'singleton',
      name_ar: input.clinic.name_ar,
      specialty: input.clinic.specialty,
      phone: input.clinic.phone,
      address: input.clinic.address ?? null,
      license_key: input.license_key,
      security_question: input.security.question,
      security_answer_hash: securityAnswerHash,
      sync_mode: 'none',
    });

    await trx('branches').insert({
      id: branchId,
      name_ar: 'الفرع الرئيسي',
      address_ar: input.clinic.address ?? null,
      phone: input.clinic.phone,
      opens_at: '09:00',
      closes_at: '21:00',
      is_host: 1,
      is_active: 1,
    });

    await trx('employees').insert({
      id: employeeId,
      name_ar: input.doctor_account.name_ar,
      username: input.doctor_account.username,
      password_hash: passwordHash,
      role: 'doctor',
      branch_id: null, // المالك متاح لكل الفروع، مش مربوط بفرع واحد
      is_owner: 1,
      is_active: 1,
      security_question: input.security.question,
      security_answer_hash: securityAnswerHash,
    });

    const permissionRows = PERMISSIONS.map((permission_key) => ({
      id: `eperm_${crypto.randomUUID()}`,
      employee_id: employeeId,
      permission_key,
    }));

    await trx('employee_permissions').insert(permissionRows);
  });

  const token = jwt.sign(
    {
      employee_id: employeeId,
      branch_id: null,
      is_owner: true,
      permissions: PERMISSIONS,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return {
    clinic: {
      name_ar: input.clinic.name_ar,
      specialty: input.clinic.specialty,
      sync_mode: 'none' as const,
    },
    main_branch: {
      id: branchId,
      name_ar: 'الفرع الرئيسي',
      is_host: true,
    },
    employee: {
      id: employeeId,
      name_ar: input.doctor_account.name_ar,
      username: input.doctor_account.username,
      is_owner: true,
    },
    token,
  };
}