import type { Knex } from 'knex';

/**
 * @description إنشاء جدولَي جهات الاتصال الطارئة ومواعيد المتابعة
 * patient_emergency_contacts: علاقة 1:1 مع المريض
 * patient_follow_ups:         علاقة 1:many — مع رسوم اختيارية على كل موعد
 */
export async function up(knex: Knex): Promise<void> {
  // ── جهة الاتصال الطارئة (1:1 مع المريض) ─────────────────
  await knex.schema.createTable('patient_emergency_contacts', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('name').nullable();
    table.text('relation').nullable();   // father | mother | spouse | sibling | other
    table.text('phone').nullable();
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.unique(['patient_id']); // قيد 1:1
  });

  // ── مواعيد المتابعة (1:many مع المريض) ───────────────────
  await knex.schema.createTable('patient_follow_ups', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('due_date').notNullable();            // YYYY-MM-DD
    table.text('reason').nullable();
    table.decimal('fee').nullable();                  // رسوم الموعد — قرار ١٨٧
    table.text('status').notNullable().defaultTo('scheduled'); // scheduled | completed | cancelled
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });
}

/**
 * @description حذف الجدولَين عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_follow_ups');
  await knex.schema.dropTableIfExists('patient_emergency_contacts');
}
