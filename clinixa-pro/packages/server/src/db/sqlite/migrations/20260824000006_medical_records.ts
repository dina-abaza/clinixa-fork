import type { Knex } from 'knex';

/**
 * @description إنشاء جداول السجل الطبي (Medical Records)
 * 1. medical_alerts: تنبيهات طبية (حساسية، أمراض مزمنة، ملاحظات)
 * 2. medical_history: التاريخ المرضي الجراحي والعائلي
 * 3. diagnoses: التشخيصات الموثقة
 * 4. medications: الأدوية الحالية للمريض
 * 5. prescriptions & prescription_items: الوصفات الطبية وبنودها
 * 6. labs: التحاليل الطبية
 * 7. radiology: الفحوصات والأشعّات
 * 8. documents: الوثائق والمستندات المرفقة
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. التنبيهات الطبية ──────────────────────────────────
  await knex.schema.createTable('medical_alerts', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('type').notNullable();             // allergy | chronic | active_medication | important_note
    table.text('text_ar').notNullable();
    table.text('text_en').nullable();
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 2. التاريخ المرضي ─────────────────────────────────────
  await knex.schema.createTable('medical_history', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('category').notNullable();         // chronic | past | surgery | hospitalization | allergy | family | risk_factor | note
    table.text('text_ar').notNullable();
    table.text('text_en').nullable();
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 3. التشخيصات ──────────────────────────────────────────
  await knex.schema.createTable('diagnoses', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('date').notNullable();
    table.text('text_ar').notNullable();
    table.text('text_en').nullable();
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 4. الأدوية الحالية ────────────────────────────────────
  await knex.schema.createTable('medications', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('name').notNullable();
    table.text('dose').nullable();
    table.text('frequency').nullable();
    table.text('since').nullable();
    table.text('status').notNullable().defaultTo('active'); // active | completed
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 5. الوصفات الطبية (Prescriptions) ──────────────────────
  await knex.schema.createTable('prescriptions', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('date').notNullable();
    table.text('doctor_id').nullable()
      .references('id').inTable('employees').onDelete('SET NULL');
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── 6. بنود الوصفة الطبية (Prescription Items) ────────────
  await knex.schema.createTable('prescription_items', (table) => {
    table.text('id').primary().notNullable();
    table.text('prescription_id').notNullable()
      .references('id').inTable('prescriptions').onDelete('CASCADE');
    table.text('drug').notNullable();
    table.text('dose').nullable();
    table.text('frequency').nullable();
    table.text('duration').nullable();
    table.text('instructions').nullable();
  });

  // ── 7. التحاليل الطبية ────────────────────────────────────
  await knex.schema.createTable('labs', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('name').notNullable();
    table.text('date').notNullable();
    table.text('status').notNullable().defaultTo('pending'); // normal | abnormal | pending
    table.text('doctor_id').nullable()
      .references('id').inTable('employees').onDelete('SET NULL');
    table.integer('has_attachment').notNullable().defaultTo(0);
  });

  // ── 8. الأشعة والفحوصات ──────────────────────────────────
  await knex.schema.createTable('radiology', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('type').notNullable();
    table.text('date').notNullable();
    table.text('report').nullable();
    table.integer('has_attachment').notNullable().defaultTo(0);
  });

  // ── 9. الوثائق والمرفقات ──────────────────────────────────
  await knex.schema.createTable('documents', (table) => {
    table.text('id').primary().notNullable();
    table.text('patient_id').notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.text('file_name').notNullable();
    table.text('type').notNullable();             // pdf | jpg | png
    table.text('date').notNullable();
    table.text('source').nullable();
    table.text('file_ref').notNullable();         // مسار نسبى في مجلد المرفقات
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });
}

/**
 * @description حذف جداول السجل الطبي عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('radiology');
  await knex.schema.dropTableIfExists('labs');
  await knex.schema.dropTableIfExists('prescription_items');
  await knex.schema.dropTableIfExists('prescriptions');
  await knex.schema.dropTableIfExists('medications');
  await knex.schema.dropTableIfExists('diagnoses');
  await knex.schema.dropTableIfExists('medical_history');
  await knex.schema.dropTableIfExists('medical_alerts');
}
