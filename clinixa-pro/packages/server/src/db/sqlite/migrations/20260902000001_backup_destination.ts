import type { Knex } from 'knex';

/**
 * @description إضافة عمودين داخليين مطلوبين لتفعيل موديول النسخ الاحتياطي فعلياً:
 * clinic_settings.default_backup_destination: الوجهة الافتراضية المحفوظة (`PUT /api/backup/destination`)
 * backup_history.file_path: المسار الفعلي لملف الـ ZIP على القرص — داخلي فقط، لا يُرسَل في استجابة الـ API
 * (بنفس مبدأ Document.file_ref الموجود بالفعل — حقل داخلي غير موثّق في العقد لكنه ضروري للعملية الفعلية)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('clinic_settings', (table) => {
    table.text('default_backup_destination').notNullable().defaultTo('local_device');
  });

  await knex.schema.table('backup_history', (table) => {
    table.text('file_path').nullable();
  });
}

/**
 * @description حذف العمودين المضافين عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('backup_history', (table) => {
    table.dropColumn('file_path');
  });

  await knex.schema.table('clinic_settings', (table) => {
    table.dropColumn('default_backup_destination');
  });
}
