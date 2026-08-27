import type { Knex } from 'knex';

/**
 * @description إنشاء جدولَي الموظفين وصلاحياتهم
 * employees:            بيانات الموظف والحساب
 * employee_permissions: صلاحيات كل موظف (من الـ 16 صلاحية المعتمدة)
 * ⚠️ الموظفون جدول محلي — لا يُزامَن مع MongoDB Atlas
 */
export async function up(knex: Knex): Promise<void> {
  // ── الموظفون ──────────────────────────────────────────────
  await knex.schema.createTable('employees', (table) => {
    table.text('id').primary().notNullable();
    table.text('name_ar').notNullable();
    table.text('username').notNullable().unique();
    table.text('password_hash').notNullable();
    table.text('role').notNullable();                            // doctor | nurse | secretary
   table.text('branch_id').nullable()
  .references('id').inTable('branches').onDelete('RESTRICT'); // null = المالك (متاح لكل الفروع)
    table.integer('is_owner').notNullable().defaultTo(0);       // boolean — حماية خاصة
    table.integer('is_active').notNullable().defaultTo(1);      // boolean
    table.text('security_question').nullable();                  // للمالك فقط
    table.text('security_answer_hash').nullable();
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── صلاحيات الموظفين ──────────────────────────────────────
  await knex.schema.createTable('employee_permissions', (table) => {
    table.text('id').primary().notNullable();
    table.text('employee_id').notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.text('permission_key').notNullable(); // قيمة من PERMISSIONS في @clinixa/shared
    table.unique(['employee_id', 'permission_key']); // منع تكرار نفس الصلاحية لنفس الموظف
  });
}

/**
 * @description حذف جدولَي الموظفين والصلاحيات عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_permissions');
  await knex.schema.dropTableIfExists('employees');
}
