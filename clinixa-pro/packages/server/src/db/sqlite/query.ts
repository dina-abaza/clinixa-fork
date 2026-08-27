/**
 * @fileoverview نسخة Knex query builder فعلية تُستخدم في كل الـ services
 * @description مبنية على نفس إعدادات knexfile.ts (بيئة التشغيل الحالية)
 *              ⚠️ منفصلة عن db/sqlite/client.ts (اتصال better-sqlite3 الخام المُستخدم لضبط الـ PRAGMAs الإضافية)
 */

import knexLib, { type Knex } from 'knex';
import knexConfig from '../../../knexfile';
import { env } from '../../config/env';

const environment = env.NODE_ENV;
const config: Knex.Config = (knexConfig as Record<string, Knex.Config>)[environment];

const query: Knex = knexLib(config);

export default query;