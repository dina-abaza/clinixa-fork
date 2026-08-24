/**
 * @fileoverview تحميل وفحص متغيرات البيئة
 * @description يُحمِّل الـ .env ويتحقق من وجود كل متغير حرج قبل تشغيل السيرفر
 *              أي متغير مطلوب غير موجود → استثناء فوري يمنع التشغيل
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// تحميل ملف .env من مجلد السيرفر
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * @description دالة مساعدة للحصول على متغير بيئة مطلوب
 * @param {string} key - اسم متغير البيئة
 * @param {string} [defaultValue] - قيمة افتراضية اختيارية
 * @returns {string} قيمة المتغير
 * @throws {Error} إذا كان المتغير غير موجود ولا توجد قيمة افتراضية
 */
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === '') {
    throw new Error(`[Config] متغير البيئة المطلوب غير موجود: ${key}`);
  }
  return value;
}

/**
 * @description كائن الإعدادات المُفحوص — يُستورد في كل الكود بدلاً من process.env مباشرة
 */
export const env = {
  // ── عام ──────────────────────────────────────────
  NODE_ENV:            process.env.NODE_ENV ?? 'development',
  PORT:                parseInt(process.env.PORT ?? '4321', 10),
  IS_PRODUCTION:       process.env.NODE_ENV === 'production',

  // ── قاعدة البيانات المحلية ────────────────────
  SQLITE_DB_PATH:      requireEnv('SQLITE_DB_PATH', './data/clinixa.db'),

  // ── المصادقة ──────────────────────────────────
  JWT_SECRET:          requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN:      process.env.JWT_EXPIRES_IN ?? '12h',
  BCRYPT_SALT_ROUNDS:  parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),

  // ── الملفات ───────────────────────────────────
  UPLOADS_DIR:         process.env.UPLOADS_DIR ?? './data/attachments',
  MAX_UPLOAD_SIZE_MB:  parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '20', 10),

  // ── النسخ الاحتياطي ───────────────────────────
  BACKUP_LOCAL_DIR:    process.env.BACKUP_LOCAL_DIR ?? './data/backups',

  // ── المزامنة (اختياري — فرع واحد = sync_mode: none) ──
  MONGODB_URI:         process.env.MONGODB_URI ?? '',
  SYNC_ENABLED:        process.env.SYNC_ENABLED === 'true',
  SYNC_POLL_INTERVAL:  parseInt(process.env.SYNC_POLL_INTERVAL_MS ?? '30000', 10),
  SYNC_MAX_ATTEMPTS:   parseInt(process.env.SYNC_MAX_ATTEMPTS ?? '5', 10),

  // ── CORS ──────────────────────────────────────
  CORS_ORIGIN:         process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const;
