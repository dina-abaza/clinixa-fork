import type { Knex } from 'knex';

/**
 * @description إنشاء جدول الفروع (branches)
 * @description أول جدول يُنشَأ — كل الجداول الأخرى تحتوي على FK إليه
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('branches', (table) => {
    table.text('id').primary().notNullable();
    table.text('name_ar').notNullable();
    table.text('address_ar').nullable();
    table.text('phone').notNullable();
    table.text('opens_at').notNullable();           // "09:00"
    table.text('closes_at').notNullable();          // "21:00"
    table.integer('is_host').notNullable().defaultTo(0);      // boolean: 1=true
    table.integer('is_active').notNullable().defaultTo(1);    // boolean: 1=true
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });
}

/**
 * @description حذف جدول الفروع عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('branches');
}
