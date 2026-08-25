import type { Knex } from 'knex';

/**
 * @description توليد معرف المريض التلسكوبي (Display ID) من تسلسل patient_sequences
 * مثال: P-1001, P-1002 ...
 * @param {Knex | Knex.Transaction} db - معاملة أو اتصال قاعدة البيانات
 * @returns {Promise<string>} المعرف الفريد مثل P-1002
 */
export async function generatePatientDisplayId(db: Knex | Knex.Transaction): Promise<string> {
  const row = await db('patient_sequences').first();

  if (!row) {
    const initialVal = 1001;
    await db('patient_sequences').insert({ last_val: initialVal });
    return `P-${initialVal}`;
  }

  const nextVal = row.last_val + 1;
  await db('patient_sequences').where({ id: row.id }).update({ last_val: nextVal });

  return `P-${nextVal}`;
}
