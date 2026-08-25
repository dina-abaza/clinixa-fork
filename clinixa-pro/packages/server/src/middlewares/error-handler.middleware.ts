import type { Request, Response, NextFunction } from 'express';

/**
 * @description كائن الخطأ المخصص للتطبيق
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly field?: string;

  constructor(code: string, message: string, statusCode = 400, field?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * @description Middleware معالجة الأخطاء المركزية للسيرفر
 * يحول أي خطأ مرفوع إلى الشكل الموحد الموثق في API Contract
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {}),
      },
    });
    return;
  }

  console.error('❌ Unhandled Server Error:', err);

  res.status(500).json({
    ok: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'حدث خطأ غير متوقع في السيرفر',
    },
  });
}
