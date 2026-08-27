import query from '../../db/sqlite/query';
import { AppError } from '../../middlewares/error-handler.middleware';

/**
 * @description دالة استنتاج الفرع النشط (Branch ID)
 * لو الموظف مالك (branch_id = null)، يتم التوجيه تلقائياً إلى الفرع المضيف (Host Branch)
 * @param {string | null | undefined} branchId - معرّف الفرع إن وجد
 * @returns {Promise<string>} معرّف الفرع الصالح
 * @throws {AppError} 404 NOT_FOUND إذا لم يوجد أي فرع في النظام
 */
export async function resolveBranchId(branchId?: string | null): Promise<string> {
  if (branchId) return branchId;

  const hostBranch = await query('branches')
    .where({ is_host: 1, is_active: 1 })
    .select('id')
    .first();

  if (hostBranch) return hostBranch.id;

  const firstBranch = await query('branches')
    .where({ is_active: 1 })
    .select('id')
    .first();

  if (firstBranch) return firstBranch.id;

  throw new AppError('NOT_FOUND', 'لم يتم العثور على أي فرع نشط في النظام', 404);
}
