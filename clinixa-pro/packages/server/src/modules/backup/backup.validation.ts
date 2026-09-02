import { z } from 'zod';

/**
 * @description سكيمة تشغيل عملية نسخ احتياطي جديدة (POST /api/backup/run)
 */
export const runBackupSchema = z.object({
  destination: z.enum(['google_drive', 'local_device', 'usb'], {
    message: 'اختار مكان النسخ الاحتياطي الأول',
  }),
  kind: z.enum(['manual', 'auto']).optional().default('manual'),
});

export type RunBackupInput = z.infer<typeof runBackupSchema>;

/**
 * @description سكيمة تعديل وجهة النسخ الاحتياطي الافتراضية (PUT /api/backup/destination)
 */
export const setDestinationSchema = z.object({
  destination: z.enum(['google_drive', 'local_device', 'usb'], {
    message: 'اختار مكان النسخ الاحتياطي الأول',
  }),
});

export type SetDestinationInput = z.infer<typeof setDestinationSchema>;

/**
 * @description سكيمة استعادة البيانات من نسخة احتياطية (POST /api/backup/restore)
 */
export const restoreBackupSchema = z.object({
  confirmation_text: z.string().min(1, 'كلمة تأكيد الاستعادة مطلوبة'),
  backup_id: z.string().optional(),
});

export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
