import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error-handler.middleware';
import { runBackupSchema, setDestinationSchema, restoreBackupSchema } from './backup.validation';
import { runBackup, listBackupHistory, setDefaultDestination, restoreBackup } from './backup.service';

/**
 * @description تشغيل عملية نسخ احتياطي جديدة (POST /api/backup/run)
 */
export async function runBackupInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = runBackupSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.') || 'destination');
    }

    const result = await runBackup(parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description استعراض سجل عمليات النسخ الاحتياطي (GET /api/backup/history)
 */
export async function getBackupHistory(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listBackupHistory();
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description تعديل وجهة النسخ الاحتياطي الافتراضية (PUT /api/backup/destination)
 */
export async function updateBackupDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = setDestinationSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.') || 'destination');
    }

    const result = await setDefaultDestination(parsed.data.destination);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}

/**
 * @description استعادة البيانات من نسخة احتياطية (POST /api/backup/restore)
 */
export async function restoreBackupInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = restoreBackupSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.') || 'confirmation_text');
    }

    const result = await restoreBackup(parsed.data);
    res.status(200).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}
