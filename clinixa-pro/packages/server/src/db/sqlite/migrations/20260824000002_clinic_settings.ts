import type { Knex } from 'knex';

/**
 * @description إنشاء جدولَي إعدادات العيادة والأسعار الافتراضية
 * clinic_settings: صف واحد فقط (singleton) — id ثابت = 'singleton'
 * clinic_prices:   أسعار افتراضية لكل نوع رسوم
 */
export async function up(knex: Knex): Promise<void> {
  // ── إعدادات العيادة (صف واحد) ────────────────────────────
  await knex.schema.createTable('clinic_settings', (table) => {
    table.text('id').primary().notNullable().defaultTo('singleton');
    table.text('name_ar').notNullable();
    table.text('specialty').notNullable();           // مفتاح من قائمة SPECIALTIES في @clinixa/shared
    table.text('phone').nullable();
    table.text('address').nullable();
    table.text('license_key').notNullable();
    table.text('security_question').nullable();      // للمالك فقط — لاسترداد كلمة السر
    table.text('security_answer_hash').nullable();
    table.text('sync_mode').notNullable().defaultTo('none'); // none | local_server | external_hosting
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── الأسعار الافتراضية لكل نوع رسوم ──────────────────────
  await knex.schema.createTable('clinic_prices', (table) => {
    table.text('id').primary().notNullable();
    table.text('charge_type').notNullable().unique(); // يطابق ChargeType في @clinixa/shared
    table.decimal('default_amount').notNullable().defaultTo(0);
  });
}

/**
 * @description حذف جدولَي الإعدادات والأسعار عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clinic_prices');
  await knex.schema.dropTableIfExists('clinic_settings');
}
