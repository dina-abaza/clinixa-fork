import type { Knex } from 'knex';

/**
 * @description إنشاء جداول المعاملات المالية وإقفال اليوم (Financials)
 * 1. charges: الرسوم والمبالغ المستحقة على المرضى
 * 2. payments: المدفوعات والمستصلحات المالية
 * 3. day_closures: سجلات إقفال اليوم المالي لكل فرع
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. الرسوم (Charges) ───────────────────────────────────
  await knex.schema.createTable('charges', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('type').notNullable();             // consultation | follow_up_visit | procedure | radiology | labs | follow_up | other
    table.decimal('amount').notNullable();
    table.text('date').notNullable();
    table.text('time').notNullable();             // مطلوب دائماً — قرار ٢٢٣
    table.text('attendance_id').nullable()
      .references('id').inTable('attendance').onDelete('SET NULL');
    table.text('created_by').notNullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  await knex.schema.table('charges', (table) => {
    table.index(['patient_id'], 'idx_charges_patient');
  });

  // ── 2. المدفوعات (Payments) ──────────────────────────────
  await knex.schema.createTable('payments', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.decimal('amount').notNullable();
    table.text('method').notNullable();           // cash | card | wallet | bank_transfer
    table.text('date').notNullable();
    table.text('time').notNullable();
    table.text('recorded_by').notNullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.integer('after_day_close').notNullable().defaultTo(0);
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  await knex.schema.table('payments', (table) => {
    table.index(['patient_id'], 'idx_payments_patient');
  });

  // ── 3. إقفال اليوم (Day Closures) ─────────────────────────
  await knex.schema.createTable('day_closures', (table) => {
    table.text('id').primary().notNullable();
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('date').notNullable();             // YYYY-MM-DD
    table.text('closed_by').notNullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.text('closed_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('reopened_by').nullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.text('reopened_at').nullable();
    table.unique(['branch_id', 'date'], 'idx_day_closure_branch_date');
  });
}

/**
 * @description حذف جداول المالية وإقفال اليوم عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('day_closures');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('charges');
}
