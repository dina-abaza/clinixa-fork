import type { Knex } from 'knex';

/**
 * @description إنشاء جدول صف المزامنة (sync_outbox)
 * ⭐ محرك المزامنة يعتمد على النمط Outbox Pattern بـ Pointer فقط دون تكرار البيانات
 * ⭐ القيد الفريد (Unique Index) يُمنع تكرار الصفوف لذات السجل والجدول والفرع
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sync_outbox', (table) => {
    table.text('id').primary().notNullable();
    table.text('table_name').notNullable();       // 'patients', 'attendance', ...
    table.text('record_id').notNullable();
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('status').notNullable().defaultTo('pending'); // pending | syncing | synced | failed
    table.integer('attempts').notNullable().defaultTo(0);
    table.text('last_error').nullable();
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('synced_at').nullable();
    table.unique(['table_name', 'record_id'], 'idx_sync_outbox_table_record');
  });
}

/**
 * @description حذف جدول sync_outbox عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sync_outbox');
}
