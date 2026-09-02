import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import query from '../../db/sqlite/query';
import db from '../../db/sqlite/client';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error-handler.middleware';
import { normalizeArabicText } from '../../shared/utils/arabicNormalize';
import { detectWritableUsbDrive } from '../../shared/utils/detectUsbDrive';
import { createBackupZip, extractBackupZip } from '../../shared/utils/backupArchive';
import type { BackupDestination, BackupFailReason, BackupKind, BackupStatus } from '@clinixa/shared';
import type { RunBackupInput, RestoreBackupInput } from './backup.validation';

/** @description القيم المقبولة لكلمة تأكيد الاستعادة (عربي/إنجليزي)، بعد توحيد النص العربي */
const VALID_CONFIRMATIONS = new Set(['RESTORE', 'CONFIRM', normalizeArabicText('استعادة'), normalizeArabicText('تأكيد')]);

/**
 * @description يحسب التاريخ والوقت الحاليين بصيغة النظام المعتمدة (YYYY-MM-DD / HH:MM:SS)
 * @returns {{date: string, time: string}} التاريخ والوقت الحاليين
 */
function nowParts(): { date: string; time: string } {
  const now = new Date();
  return { date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 8) };
}

/**
 * @description يحدد المجلد الهدف الفعلي للنسخ المحلي أو USB، أو null لو مفيش محرك متاح
 * @param {'local_device' | 'usb'} destination - الوجهة المطلوبة
 * @returns {string | null} المسار الفعلي للمجلد الهدف
 */
function resolveLocalTargetDir(destination: 'local_device' | 'usb'): string | null {
  if (destination === 'local_device') return env.BACKUP_LOCAL_DIR;

  const usbRoot = detectWritableUsbDrive();
  return usbRoot ? path.join(usbRoot, 'ClinixaBackups') : null;
}

/**
 * @description ينفّذ عملية نسخ احتياطي حقيقية حسب الوجهة المطلوبة، ويسجّل النتيجة الفعلية في backup_history
 * local_device/usb: نسخة ZIP حقيقية لقاعدة البيانات والمرفقات. google_drive: Stub صريح لحين تكامل حقيقي
 * @param {RunBackupInput} input - الوجهة ونوع التشغيل (يدوي/تلقائي)
 * @returns {Promise<object>} سجل النسخة الاحتياطية كما يظهر في الاستجابة الموثقة
 * @throws {AppError} لا يطلق خطأ أبداً — الفشل يُسجَّل كحالة `fail` في السجل نفسه (مطابق للعقد الموثّق)
 */
export async function runBackup(input: RunBackupInput) {
  const { date, time } = nowParts();
  const id = `bkp_${crypto.randomUUID()}`;
  const kind: BackupKind = input.kind ?? 'manual';

  let status: BackupStatus = 'ok';
  let failReason: BackupFailReason | null = null;
  let sizeMb: number | null = null;
  let filePath: string | null = null;

  if (input.destination === 'google_drive') {
    // TODO: تكامل حقيقي مع Google Drive API (OAuth2 + رفع الملف) — غير مطبّق حالياً في المشروع.
    // لحد ما يتم التكامل، أي محاولة نسخ لـ google_drive بترجع فشل حقيقي مش نجاح وهمي.
    status = 'fail';
    failReason = 'token';
  } else {
    const targetDir = resolveLocalTargetDir(input.destination);

    if (!targetDir) {
      status = 'fail';
      failReason = 'device';
    } else {
      try {
        // ⭐ لازم قبل أي نسخ — الوضع WAL بيخلي أحدث الكتابات في ملف -wal لحد ما يتم تفريغه،
        // فلو نسخنا ملف الـ DB الأساسي من غيره ممكن ناخد نسخة قديمة ناقصة أحدث التعديلات
        db.pragma('wal_checkpoint(TRUNCATE)');
        filePath = createBackupZip(env.SQLITE_DB_PATH, env.UPLOADS_DIR, targetDir);
        sizeMb = Number((fs.statSync(filePath).size / (1024 * 1024)).toFixed(2));
      } catch (err) {
        console.error('❌ فشل إنشاء ملف النسخة الاحتياطية:', err);
        status = 'fail';
        failReason = 'device';
        filePath = null;
      }
    }
  }

  await query('backup_history').insert({
    id,
    date,
    time,
    status,
    fail_reason: failReason,
    size_mb: sizeMb,
    kind,
    destination: input.destination,
    file_path: filePath,
  });

  return { id, date, time, status, fail_reason: failReason, size_mb: sizeMb, kind, destination: input.destination };
}

/**
 * @description جلب سجل عمليات النسخ الاحتياطي كاملاً، الأحدث أولاً
 * @returns {Promise<{items: object[]}>} قائمة سجلات النسخ الاحتياطي بالشكل الموثّق فقط (بدون file_path الداخلي)
 */
export async function listBackupHistory() {
  const rows = await query('backup_history')
    .orderBy('date', 'desc')
    .orderBy('time', 'desc')
    .select('id', 'date', 'time', 'status', 'fail_reason', 'size_mb', 'kind', 'destination');

  return { items: rows.map((row) => ({ ...row, size_mb: row.size_mb === null ? null : Number(row.size_mb) })) };
}

/**
 * @description تعديل وجهة النسخ الاحتياطي الافتراضية المحفوظة في إعدادات العيادة
 * @param {BackupDestination} destination - الوجهة الافتراضية الجديدة
 * @returns {Promise<{destination: BackupDestination, message: string}>} تأكيد التحديث
 */
export async function setDefaultDestination(destination: BackupDestination) {
  await query('clinic_settings')
    .where({ id: 'singleton' })
    .update({ default_backup_destination: destination, updated_at: new Date().toISOString() });

  return { destination, message: 'تم تحديث وجهة النسخ الاحتياطي بنجاح' };
}

/**
 * @description يستعيد قاعدة البيانات والمرفقات فعلياً من نسخة احتياطية صالحة سابقة
 * بيقفل اتصالَي better-sqlite3 وknex قبل الكتابة فوق ملف الـ DB الحي، وبيُنهي العملية بعدها
 * عشان يُعاد تشغيل السيرفر بقاعدة البيانات المستعادة (ts-node-dev --respawn في التطوير)
 * @param {RestoreBackupInput} input - كلمة التأكيد ومعرّف النسخة الاحتياطية (اختياري)
 * @returns {Promise<{message: string}>} رسالة نجاح الاستعادة
 * @throws {AppError} 400 VALIDATION_ERROR لو كلمة التأكيد غلط، 404 NOT_FOUND لو مفيش نسخة صالحة أو الملف غير متاح فعلياً
 */
export async function restoreBackup(input: RestoreBackupInput): Promise<{ message: string }> {
  const trimmed = input.confirmation_text.trim();
  const isValid = VALID_CONFIRMATIONS.has(trimmed) || VALID_CONFIRMATIONS.has(normalizeArabicText(trimmed));

  if (!isValid) {
    throw new AppError('VALIDATION_ERROR', 'كلمة تأكيد الاستعادة غير صحيحة', 400, 'confirmation_text');
  }

  const backupRow = input.backup_id
    ? await query('backup_history').where({ id: input.backup_id }).first()
    : await query('backup_history').where({ status: 'ok' }).orderBy('date', 'desc').orderBy('time', 'desc').first();

  if (!backupRow) {
    throw new AppError('NOT_FOUND', 'لم يتم العثور على نسخة احتياطية صالحة للاستعادة', 404);
  }

  if (backupRow.status !== 'ok' || !backupRow.file_path || !fs.existsSync(backupRow.file_path)) {
    throw new AppError(
      'NOT_FOUND',
      'ملف النسخة الاحتياطية غير متاح حالياً — تأكد من توصيل الجهاز إذا كانت النسخة على USB',
      404,
    );
  }

  // تفريغ الـ WAL وإغلاق الاتصالات الحية قبل الكتابة فوق ملف قاعدة البيانات
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  await query.destroy();

  extractBackupZip(backupRow.file_path, env.SQLITE_DB_PATH, env.UPLOADS_DIR);

  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${env.SQLITE_DB_PATH}${suffix}`;
    if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
  }

  // TODO: في بيئة Electron، الـ main process المفروض يرصد إغلاق السيرفر ده ويعيد تشغيله تلقائياً بعد الاستعادة
  setTimeout(() => process.exit(0), 150);

  return { message: 'تمت استعادة النسخة الاحتياطية بنجاح' };
}
