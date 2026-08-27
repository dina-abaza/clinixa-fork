import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import query from '../../db/sqlite/query';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error-handler.middleware';
import { PERMISSIONS, Permission } from '@clinixa/shared';
import type { LoginInput, ForgotPasswordInput } from './auth.validation';

/**
 * @description نتيجة تسجيل الدخول بنجاح
 */
export interface LoginResult {
  token: string;
  employee: {
    id: string;
    name_ar: string;
    username: string;
    role: string;
    is_owner: boolean;
    branch_id: string | null;
    permissions: Permission[];
  };
  active_branch: {
    id: string;
    name_ar: string;
  };
}

/**
 * @description نتيجة الاستعلام عن بيانات الجلسة الحالية
 */
export interface SessionResult {
  employee: {
    id: string;
    name_ar: string;
    username: string;
    role: string;
    is_owner: boolean;
    branch_id: string | null;
    permissions: Permission[];
  };
  active_branch: {
    id: string;
    name_ar: string;
  };
}

/**
 * @description تسجيل دخول الموظف، فحص كلمة السر المشفّرة، وجلب الصلاحيات والفرع وتوليد الـ JWT Token
 * @param {LoginInput} input - بيانات الدخول (اسم المستخدم وكلمة السر)
 * @returns {Promise<LoginResult>} بيانات التوكن والموظف والفرع النشط
 * @throws {AppError} 401 UNAUTHORIZED في حال خطأ بيانات الدخول أو تعطيل الحساب
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const employee = await query('employees').where({ username: input.username }).first();

  if (!employee || !employee.is_active) {
    throw new AppError('UNAUTHORIZED', 'اسم المستخدم أو كلمة السر غلط', 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, employee.password_hash);
  if (!isPasswordValid) {
    throw new AppError('UNAUTHORIZED', 'اسم المستخدم أو كلمة السر غلط', 401);
  }

  const isOwner = Boolean(employee.is_owner);
  let permissions: Permission[] = [];

  if (isOwner) {
    permissions = [...PERMISSIONS];
  } else {
    const permRows = await query('employee_permissions')
      .where({ employee_id: employee.id })
      .select('permission_key');
    permissions = permRows.map((r: { permission_key: Permission }) => r.permission_key);
  }

  let activeBranch: { id: string; name_ar: string } | undefined;

  if (employee.branch_id) {
    activeBranch = await query('branches')
      .where({ id: employee.branch_id, is_active: 1 })
      .select('id', 'name_ar')
      .first();
  }

  if (!activeBranch) {
    activeBranch = await query('branches')
      .where({ is_host: 1, is_active: 1 })
      .select('id', 'name_ar')
      .first();
  }

  if (!activeBranch) {
    activeBranch = await query('branches')
      .where({ is_active: 1 })
      .select('id', 'name_ar')
      .first();
  }

  if (!activeBranch) {
    throw new AppError('NOT_FOUND', 'لم يتم العثور على أي فرع نشط في النظام', 404);
  }

  const token = jwt.sign(
    {
      employee_id: employee.id,
      branch_id: employee.branch_id ?? activeBranch.id,
      is_owner: isOwner,
      permissions,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return {
    token,
    employee: {
      id: employee.id,
      name_ar: employee.name_ar,
      username: employee.username,
      role: employee.role,
      is_owner: isOwner,
      branch_id: employee.branch_id ?? null,
      permissions,
    },
    active_branch: {
      id: activeBranch.id,
      name_ar: activeBranch.name_ar,
    },
  };
}

/**
 * @description جلب تفاصيل الجلسة الحالية للموظف المسجّل
 * @param {string} employeeId - معرّف الموظف المستخرج من التوكن
 * @returns {Promise<SessionResult>} بيانات الموظف والصلاحيات والفرع النشط
 * @throws {AppError} 401 UNAUTHORIZED لو الموظف غير موجود أو معطّل
 */
export async function getUserSession(employeeId: string): Promise<SessionResult> {
  const employee = await query('employees').where({ id: employeeId }).first();

  if (!employee || !employee.is_active) {
    throw new AppError('UNAUTHORIZED', 'الجلسة غير صالحة أو الموظف غير نشط', 401);
  }

  const isOwner = Boolean(employee.is_owner);
  let permissions: Permission[] = [];

  if (isOwner) {
    permissions = [...PERMISSIONS];
  } else {
    const permRows = await query('employee_permissions')
      .where({ employee_id: employee.id })
      .select('permission_key');
    permissions = permRows.map((r: { permission_key: Permission }) => r.permission_key);
  }

  let activeBranch: { id: string; name_ar: string } | undefined;

  if (employee.branch_id) {
    activeBranch = await query('branches')
      .where({ id: employee.branch_id, is_active: 1 })
      .select('id', 'name_ar')
      .first();
  }

  if (!activeBranch) {
    activeBranch = await query('branches')
      .where({ is_host: 1, is_active: 1 })
      .select('id', 'name_ar')
      .first();
  }

  if (!activeBranch) {
    throw new AppError('NOT_FOUND', 'لم يتم العثور على الفرع الرئيسي', 404);
  }

  return {
    employee: {
      id: employee.id,
      name_ar: employee.name_ar,
      username: employee.username,
      role: employee.role,
      is_owner: isOwner,
      branch_id: employee.branch_id ?? null,
      permissions,
    },
    active_branch: {
      id: activeBranch.id,
      name_ar: activeBranch.name_ar,
    },
  };
}

/**
 * @description استعادة كلمة السر عبر إجابة سؤال الأمان وتعيين كلمة سر جديدة
 * @param {ForgotPasswordInput} input - اسم المستخدم، إجابة سؤال الأمان، وكلمة السر الجديدة
 * @returns {Promise<{ message: string }>} رسالة نجاح عملية التغيير
 * @throws {AppError} 400 VALIDATION_ERROR عند الخطأ في إجابة سؤال الأمان
 */
export async function resetPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  const employee = await query('employees').where({ username: input.username }).first();

  if (!employee) {
    throw new AppError('VALIDATION_ERROR', 'إجابة سؤال الأمان غلط', 400, 'security_answer');
  }

  let answerHash = employee.security_answer_hash;

  if (!answerHash && employee.is_owner) {
    const clinicSettings = await query('clinic_settings').where({ id: 'singleton' }).first();
    if (clinicSettings) {
      answerHash = clinicSettings.security_answer_hash;
    }
  }

  if (!answerHash) {
    throw new AppError('VALIDATION_ERROR', 'إجابة سؤال الأمان غلط', 400, 'security_answer');
  }

  const isAnswerValid = await bcrypt.compare(input.security_answer, answerHash);
  if (!isAnswerValid) {
    throw new AppError('VALIDATION_ERROR', 'إجابة سؤال الأمان غلط', 400, 'security_answer');
  }

  const newPasswordHash = await bcrypt.hash(input.new_password, env.BCRYPT_SALT_ROUNDS);

  await query('employees')
    .where({ id: employee.id })
    .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() });

  return { message: 'تم تغيير كلمة السر بنجاح' };
}

/**
 * @description جلب نص سؤال الأمان المسجل للموظف تمهيدًا لاستعادة كلمة السر
 * @param {string} username - اسم المستخدم المطلوب الاستعلام عن سؤال الأمان له
 * @returns {Promise<{ question: string }>} نص سؤال الأمان
 * @throws {AppError} 404 NOT_FOUND في حال عدم وجود المستخدم أو عدم وجود سؤال أمان
 */
export async function getSecurityQuestion(username: string): Promise<{ question: string }> {
  const employee = await query('employees').where({ username }).first();

  if (!employee) {
    throw new AppError('NOT_FOUND', 'المستخدم غير موجود', 404);
  }

  let question = employee.security_question;

  if (!question && employee.is_owner) {
    const clinicSettings = await query('clinic_settings').where({ id: 'singleton' }).first();
    if (clinicSettings) {
      question = clinicSettings.security_question;
    }
  }

  if (!question) {
    throw new AppError('NOT_FOUND', 'لم يتم تسجيل سؤال أمان لهذا الحساب', 404);
  }

  return { question };
}

