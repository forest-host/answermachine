
import Router from 'express';

import responses_route from './responses';

const router = Router();

router.use('/responses', responses_route);

export default router;
