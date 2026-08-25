import type { Request, Response, NextFunction } from 'express';
import { normalizeArabicText } from '../shared/utils/arabicNormalize';

/**
 * @description Middleware توحيد النصوص العربية القادمة في body أو query تلقائياً
 */
export function arabicNormalizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    normalizeObject(req.body);
  }
  next();
}

function normalizeObject(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string' && (key.endsWith('_ar') || key === 'name_ar')) {
      obj[`${key}_normalized`] = normalizeArabicText(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      normalizeObject(obj[key]);
    }
  }
}
