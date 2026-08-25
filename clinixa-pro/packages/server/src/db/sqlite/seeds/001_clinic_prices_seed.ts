import type { Knex } from 'knex';
import { CHARGE_TYPES } from '@clinixa/shared';

/**
 * @description البذور الأولى لقاعدة البيانات (Database Seeding)
 * يُدخِل الأسعار الافتراضية الصفرية لكل نوع رسوم (charge_type) في جدول clinic_prices
 */
export async function seed(knex: Knex): Promise<void> {
  // تفادي المسح التام لإبقاء التعديلات، إدخال صريح مع ignore/upsert
  for (const item of CHARGE_TYPES) {
    const existing = await knex('clinic_prices').where({ charge_type: item.key }).first();

    if (!existing) {
      await knex('clinic_prices').insert({
        id: `price_${item.key}`,
        charge_type: item.key,
        default_amount: 0,
      });
    }
  }
}
