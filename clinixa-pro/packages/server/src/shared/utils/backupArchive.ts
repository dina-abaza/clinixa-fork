import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * @description ينشئ ملف ZIP حقيقي يحتوي على قاعدة بيانات SQLite ومجلد المرفقات كاملَين، ويكتبه في المجلد الهدف
 * @param {string} dbPath - مسار ملف قاعدة البيانات الحالي (env.SQLITE_DB_PATH)
 * @param {string} uploadsDir - مسار مجلد المرفقات الحالي (env.UPLOADS_DIR)
 * @param {string} destDir - المجلد الهدف لحفظ ملف الـ ZIP بداخله (محلي أو USB)
 * @returns {string} المسار الكامل لملف الـ ZIP المُنشأ فعلياً على القرص
 */
export function createBackupZip(dbPath: string, uploadsDir: string, destDir: string): string {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const zip = new AdmZip();
  zip.addLocalFile(dbPath, '', 'clinixa.db');

  if (fs.existsSync(uploadsDir)) {
    zip.addLocalFolder(uploadsDir, 'attachments');
  }

  const fileName = `clinixa-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
  const zipPath = path.join(destDir, fileName);
  zip.writeZip(zipPath);

  return zipPath;
}

/**
 * @description يستخرج ملف ZIP خاص بنسخة احتياطية سابقة، ويعيد قاعدة البيانات والمرفقات فعلياً لمكانهم الحالي
 * @param {string} zipPath - مسار ملف الـ ZIP المطلوب استعادته
 * @param {string} dbPath - المسار المستهدف لملف قاعدة البيانات (env.SQLITE_DB_PATH)
 * @param {string} uploadsDir - المسار المستهدف لمجلد المرفقات (env.UPLOADS_DIR)
 * @throws {Error} لو ملف الـ ZIP تالف أو لا يحتوي على قاعدة بيانات صالحة
 */
export function extractBackupZip(zipPath: string, dbPath: string, uploadsDir: string): void {
  const zip = new AdmZip(zipPath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinixa-restore-'));

  try {
    zip.extractAllTo(tempDir, true);

    const extractedDbPath = path.join(tempDir, 'clinixa.db');
    if (!fs.existsSync(extractedDbPath)) {
      throw new Error('ملف النسخة الاحتياطية تالف — قاعدة البيانات غير موجودة داخل الأرشيف');
    }
    fs.copyFileSync(extractedDbPath, dbPath);

    const extractedUploadsPath = path.join(tempDir, 'attachments');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
    if (fs.existsSync(extractedUploadsPath)) {
      fs.cpSync(extractedUploadsPath, uploadsDir, { recursive: true });
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
