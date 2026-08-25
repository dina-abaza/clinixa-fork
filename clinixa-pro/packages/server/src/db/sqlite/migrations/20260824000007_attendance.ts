import type { Knex } from 'knex';

/**
 * @description إنشاء جدول الحضور (attendance) — Append-Only
 * ⭐ لا يتضمن هذا الجدول أي عملية DELETE في الكود التجاري إطلاقاً
 * ⭐ الفهارس المُنشأة تُساهِم في سرعة عرض القائمة اليومية وتصفية الكشوفات التلقائية
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('date').notNullable();             // YYYY-MM-DD
    table.text('time').notNullable();             // HH:MM:SS
    table.text('status').notNullable().defaultTo('waiting'); // waiting | in_progress | done | noshow | left
    table.text('items').nullable();               // JSON array من فهارس visit_items
    table.text('created_by').notNullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── الفهارس (Indexes) ──────────────────────────────────
  await knex.schema.table('attendance', (table) => {
    table.index(['branch_id', 'date'], 'idx_attendance_branch_date');
    table.index(['status'], 'idx_attendance_status_due');
  });
}

/**
 * @description حذف جدول الحضور عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance');
}
