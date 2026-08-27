import type { Request, Response, NextFunction } from 'express';
import { firstRunSchema } from './setup.validation';
import { firstRunSetup } from './setup.service';
import { AppError } from '../../middlewares/error-handler.middleware';

export async function firstRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = firstRunSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError('VALIDATION_ERROR', issue.message, 400, issue.path.join('.'));
    }

    const result = await firstRunSetup(parsed.data);
    res.status(201).json({ ok: true, data: result, warning: null });
  } catch (err) {
    next(err);
  }
}