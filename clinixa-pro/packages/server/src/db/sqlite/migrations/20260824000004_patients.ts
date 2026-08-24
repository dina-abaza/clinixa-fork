import type { Knex } from 'knex';

/**
 * @description إنشاء جدول المرضى مع الـ indexes المطلوبة
 * ⭐ القاعدة المعمارية #١: لا يوجد عمود "due" — يُحسَب لحظياً من charges و payments
 * ⭐ phone بدون UNIQUE — تكرار الهاتف مسموح مع إرجاع DUPLICATE_PHONE warning
 * ⭐ name_ar_normalized للبحث السريع بعد توحيد الحروف العربية
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('patients', (table) => {
    table.text('id').primary().notNullable();
    table.text('display_id').notNullable().unique();              // "P-1002" — للعرض فقط
    table.text('name_ar').notNullable();
    table.text('name_ar_normalized').notNullable();               // بعد normalizeArabic() — للبحث
    table.text('name_en').nullable();                             // مشتق من name_ar عبر nameMap.ts
    table.text('phone').notNullable();                            // بدون UNIQUE — تكرار + تحذير
    table.integer('age').notNullable();
    table.text('gender').notNullable();                           // male | female
    table.text('address').nullable();
    table.text('notes').nullable();
    table.text('home_branch_id').nullable()
      .references('id').inTable('branches').onDelete('SET NULL'); // معلومة فقط، مش حاجز وصول
    table.integer('is_active').notNullable().defaultTo(1);       // boolean
    table.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
    table.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
  });

  // ── الـ indexes لأداء البحث ───────────────────────────────
  await knex.schema.raw(
    'CREATE INDEX idx_patients_name_normalized ON patients(name_ar_normalized)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_patients_phone ON patients(phone)'
  );

  // ── تتبع آخر رقم تسلسلي للـ display_id (P-1, P-2, ...) ───
  await knex.schema.createTable('patient_sequences', (table) => {
    table.text('id').primary().notNullable().defaultTo('singleton');
    table.integer('last_seq').notNullable().defaultTo(0);
  });

  // صف واحد ثابت
  await knex('patient_sequences').insert({ id: 'singleton', last_seq: 0 });
}

/**
 * @description حذف جدول المرضى وجدول التسلسل عند التراجع
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_sequences');
  await knex.schema.dropTableIfExists('patients');
}
