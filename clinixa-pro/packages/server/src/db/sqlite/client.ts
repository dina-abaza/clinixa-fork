/**
 * @fileoverview اتصال SQLite — Singleton
 * @description يفتح اتصالاً واحداً بقاعدة البيانات المحلية ويُصدِّره للاستخدام في كل السيرفر
 *              ⭐ يُفعِّل PRAGMA foreign_keys فوراً — بدونها كل الـ REFERENCES تُتجاهَل في SQLite
 *              ⭐ يُفعِّل WAL mode لأداء أفضل في بيئة Electron
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { env } from '../../config/env';

/**
 * @description ينشئ مجلد قاعدة البيانات إذا لم يكن موجوداً
 * @param {string} dbPath - المسار الكامل لملف قاعدة البيانات
 */
function ensureDbDirectory(dbPath: string): void {
  // لا نعمل شيئاً للـ in-memory database في الاختبارات
  if (dbPath === ':memory:') return;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * @description يُنشئ ويُعيد اتصال قاعدة البيانات مُعدَّلاً بالـ PRAGMAs المطلوبة
 * @param {string} [dbPath] - مسار ملف DB (اختياري — يستخدم env.SQLITE_DB_PATH إذا لم يُمرَّر)
 * @returns {Database.Database} اتصال قاعدة البيانات الجاهز للاستخدام
 */
function createDbConnection(dbPath?: string): Database.Database {
  const filePath = dbPath ?? env.SQLITE_DB_PATH;

  ensureDbDirectory(filePath);

  const db = new Database(filePath);

  // ⭐ إلزامي — بدونه SQLite تتجاهل كل الـ FOREIGN KEY REFERENCES
  db.pragma('foreign_keys = ON');

  // ⭐ Write-Ahead Logging — أداء أفضل وأمان أكبر في بيئة الكتابة المتزامنة
  db.pragma('journal_mode = WAL');

  // حماية من الـ corruption عند قطع الكهرباء فجأة
  db.pragma('synchronous = NORMAL');

  return db;
}

// Singleton — اتصال واحد يُستخدم في كل الكود
const db: Database.Database = createDbConnection();

export default db;
export { createDbConnection };
