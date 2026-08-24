import type { Knex } from 'knex';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @description التحقق من وجود مسار قاعدة البيانات في بيئة الإنتاج (Fail-Fast)
 * يُطلق خطأ فورياً إذا لم يُمرَّر المسار من Electron
 */
if (process.env.NODE_ENV === 'production' && !process.env.SQLITE_DB_PATH) {
  throw new Error('SQLITE_DB_PATH is required in production environment');
}

/**
 * @description الإعدادات المشتركة لجميع بيئات التشغيل (DRY)
 */
const baseConfig: Partial<Knex.Config> = {
  client: 'better-sqlite3',
  useNullAsDefault: true,
};

/**
 * @description إعداد Knex لقاعدة البيانات SQLite
 * - development: ملف محلي في data/clinixa.db
 * - test: قاعدة بيانات في الذاكرة (in-memory) للاختبارات
 * - production: المسار يُمرَّر من Electron عبر متغير البيئة SQLITE_DB_PATH
 */
const config: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
    connection: {
      filename: process.env.SQLITE_DB_PATH ?? path.join(__dirname, '../../data/clinixa.db'),
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/sqlite/migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/sqlite/seeds'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  test: {
    ...baseConfig,
    connection: {
      filename: ':memory:',
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/sqlite/migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  production: {
    ...baseConfig,
    connection: {
      filename: process.env.SQLITE_DB_PATH!,
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/sqlite/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/sqlite/seeds'),
    },
  },
};

export default config;
