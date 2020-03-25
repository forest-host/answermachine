
import Router from 'express';

import responses_route from './responses';
import tiles_route from './tiles';

const router = Router();

router.use('/responses', responses_route);
router.use('/data/tiles', tiles_route);

export default router;
