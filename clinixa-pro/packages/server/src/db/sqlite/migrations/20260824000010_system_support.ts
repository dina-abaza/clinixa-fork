import type { Knex } from 'knex';

/**
 * @description إنشاء جداول تنبيهات النظام وسجل النسخ الاحتياطي (system_alerts & backup_history)
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. تنبيهات النظام (System Alerts) ─────────────────────
  await knex.schema.createTable('system_alerts', (table) => {
    table.text('id').primary().notNullable();
    table.text('type').notNullable();             // backup_failed | low_stock
    table.text('title').notNullable();
    table.text('detail').nullable();
    table.text('branch_id').nullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.integer('is_read').notNullable().defaultTo(0);
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 2. سجل النسخ الاحتياطي (Backup History) ─────────────────
  await knex.schema.createTable('backup_history', (table) => {
    table.text('id').primary().notNullable();
    table.text('date').notNullable();             // YYYY-MM-DD
    table.text('time').notNullable();             // HH:MM:SS
    table.text('status').notNullable();           // ok | fail
    table.text('fail_reason').nullable();         // token | offline | device
    table.decimal('size_mb').nullable();
    table.text('kind').notNullable();             // auto | manual
    table.text('destination').notNullable();      // local_device | usb | google_drive
  });
}

/**
 * @description حذف جداول التنبيهات وسجل النسخ الاحتياطي عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('backup_history');
  await knex.schema.dropTableIfExists('system_alerts');
}
