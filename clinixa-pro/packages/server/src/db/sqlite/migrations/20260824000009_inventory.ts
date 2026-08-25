import type { Knex } from 'knex';

/**
 * @description إنشاء جدول الأصناف الطبية في المخزون (inventory_items)
 * يربط بين الأصناف الطبية بالفرع مع إمكانية متابعة الحد الأدنى (min_qty) للتنبيهات
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('inventory_items', (table) => {
    table.text('id').primary().notNullable();
    table.text('branch_id').notNullable()
      .references('id').inTable('branches').onDelete('RESTRICT');
    table.text('name_ar').notNullable();
    table.text('name_en').nullable();
    table.text('type').notNullable();             // supplies | equipment
    table.integer('qty').notNullable().defaultTo(0);
    table.integer('min_qty').nullable();          // NULL للمعدات (لا تظهر في التنبيهات)
    table.text('unit').notNullable();             // box | piece | roll | bag...
    table.integer('is_active').notNullable().defaultTo(1);
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  await knex.schema.table('inventory_items', (table) => {
    table.index(['branch_id'], 'idx_inventory_branch');
  });
}

/**
 * @description حذف جدول المخزون عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_items');
}
