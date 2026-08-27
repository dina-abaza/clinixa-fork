import { Router } from 'express';
import { firstRun } from './setup.controller';

const router = Router();

router.post('/first-run', firstRun);

export default router;