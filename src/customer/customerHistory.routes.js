'use strict';

import { Router } from 'express';
import { CustomerHistoryController } from './customerHistory.controller.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';

const router = Router();

router.get('/history', validateJWT, CustomerHistoryController.getHistory);

export default router;